import { BATCH_DELAY_MS, BATCH_MAX_SIZE, TRANSLATED_ATTR, TRANSLATION_BOX_CLASS } from '../shared/constants'
import type { BatchTranslationRequest, BatchTranslationResponse, FeedbackValue, TranslationResponse } from '../shared/types'

// ── Service Worker 에 배치 번역 요청 ───────────────────────────
function requestBatchTranslation(texts: string[]): Promise<TranslationResponse[]> {
  return new Promise((resolve) => {
    const payload: BatchTranslationRequest = { texts, targetLang: 'ko' }
    chrome.runtime.sendMessage({ type: 'TRANSLATE_BATCH', payload }, (res: BatchTranslationResponse | undefined) => {
      resolve(res?.translations ?? texts.map(() => ({ translatedText: '', error: 'no response' })))
    })
  })
}

// ── Service Worker 에 번역 피드백 전달 ─────────────────────────
function sendFeedback(text: string, feedback: FeedbackValue) {
  chrome.runtime.sendMessage({ type: 'FEEDBACK', payload: { text, feedback } })
}

// ── 번역 박스 삽입 (로딩 스켈레톤 상태로 먼저 표시) ────────────
export function injectBox(anchor: Element): HTMLDivElement {
  const box = document.createElement('div')
  box.className = TRANSLATION_BOX_CLASS

  const label = document.createElement('div')
  label.className = `${TRANSLATION_BOX_CLASS}__label`
  label.textContent = '덕질 번역기'

  const body = document.createElement('div')
  body.className = `${TRANSLATION_BOX_CLASS}__body`
  body.append(...[1, 2].map(() => {
    const line = document.createElement('span')
    line.className = `${TRANSLATION_BOX_CLASS}__skeleton-line`
    return line
  }))

  box.append(label, body)
  anchor.insertAdjacentElement('afterend', box)
  return box
}

// ── 번역 결과로 박스 채우기 (스켈레톤 → 실제 텍스트 + 피드백 버튼) ──
export function fillBox(box: HTMLDivElement, translatedText: string) {
  const body = box.querySelector<HTMLElement>(`.${TRANSLATION_BOX_CLASS}__body`)
  if (body) body.textContent = translatedText

  const feedbackRow = document.createElement('div')
  feedbackRow.className = `${TRANSLATION_BOX_CLASS}__feedback`

  const goodBtn = document.createElement('button')
  goodBtn.className = `${TRANSLATION_BOX_CLASS}__feedback-btn`
  goodBtn.textContent = '👍 좋음'
  goodBtn.addEventListener('click', () => sendFeedback(translatedText, 'good'))

  const badBtn = document.createElement('button')
  badBtn.className = `${TRANSLATION_BOX_CLASS}__feedback-btn`
  badBtn.textContent = '👎 나쁨'
  badBtn.addEventListener('click', () => sendFeedback(translatedText, 'bad'))

  feedbackRow.append(goodBtn, badBtn)
  box.append(feedbackRow)
}

// ── 번역 실패/불필요(이미 한국어) 시 박스 제거 ─────────────────
export function removeBox(box: HTMLDivElement) {
  box.remove()
}

// ── 배치 큐: 화면에 보인 요소들을 모아 한 번에 번역 요청 ───────
interface QueueItem {
  el: Element
  text: string
  box: HTMLDivElement
}

const queue: QueueItem[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flushQueue, BATCH_DELAY_MS)
}

async function flushQueue() {
  flushTimer = null
  const batch = queue.splice(0, BATCH_MAX_SIZE)
  if (batch.length === 0) return
  if (queue.length > 0) scheduleFlush()   // 큐에 더 남아있으면 다음 배치 예약

  const results = await requestBatchTranslation(batch.map((item) => item.text))

  batch.forEach((item, i) => {
    const result = results[i]

    if (!result?.translatedText || result.error) {
      item.el.removeAttribute(TRANSLATED_ATTR)
      removeBox(item.box)
      return
    }

    // 원문이 이미 한국어면 번역 박스를 띄우지 않음
    if (result.detectedLang?.toUpperCase() === 'KO') {
      item.el.setAttribute(TRANSLATED_ATTR, 'skipped-ko')
      removeBox(item.box)
      return
    }

    item.el.setAttribute(TRANSLATED_ATTR, 'done')
    fillBox(item.box, result.translatedText)
  })
}

// ── 이미 한국어인 텍스트인지 간단히 판별 (API 호출 없이) ───────
const HANGUL_RE = /[가-힣]/g

function isMostlyKorean(text: string): boolean {
  const hangulCount = text.match(HANGUL_RE)?.length ?? 0
  return hangulCount / text.length > 0.3
}

// ── 단일 요소 처리 ─────────────────────────────────────────────
export function processElement(el: Element) {
  if (el.getAttribute(TRANSLATED_ATTR)) return
  const text = el.textContent?.trim() ?? ''
  if (text.length < 10) return                    // 너무 짧은 텍스트 무시

  // 이미 한국어 위주 텍스트면 번역 요청/스켈레톤 삽입 없이 건너뜀
  if (isMostlyKorean(text)) {
    el.setAttribute(TRANSLATED_ATTR, 'skipped-ko')
    return
  }

  el.setAttribute(TRANSLATED_ATTR, 'pending')
  const box = injectBox(el)
  queue.push({ el, text, box })
  scheduleFlush()
}

// ── IntersectionObserver: 화면에 보이는 요소만 번역 ───────────
// 스크롤 속도에 따라 rootMargin 을 동적으로 조정한다.
// 빠르게 스크롤할수록 더 먼 요소까지 미리 번역을 시작해 끊김을 줄이고,
// 느리거나 정지 상태면 margin 을 줄여 불필요한 번역 요청을 아낀다.
export function observeVisible(
  elements: NodeListOf<Element> | Element[],
  onVisible: (el: Element) => void
) {
  const remaining = new Set<Element>(elements)

  let rootMargin = '200px'
  let io = createObserver(rootMargin)

  function createObserver(margin: string): IntersectionObserver {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target)
            remaining.delete(entry.target)
            onVisible(entry.target)
          }
        })
      },
      { rootMargin: margin }
    )
    remaining.forEach((el) => observer.observe(el))
    return observer
  }

  function marginForSpeed(pxPerMs: number): string {
    if (pxPerMs > 2)   return '600px'  // 빠른 스크롤: 미리 넉넉히 번역
    if (pxPerMs > 0.5) return '350px'
    return '150px'                     // 느린 스크롤/정지: 최소한만 번역
  }

  let lastY = window.scrollY
  let lastT = performance.now()

  function onScroll() {
    const now = performance.now()
    const dt  = now - lastT
    if (dt < 100) return   // 표본 간격 확보

    const y     = window.scrollY
    const speed = Math.abs(y - lastY) / dt
    lastY = y
    lastT = now

    const nextMargin = marginForSpeed(speed)
    if (nextMargin === rootMargin || remaining.size === 0) return

    rootMargin = nextMargin
    io.disconnect()
    io = createObserver(rootMargin)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
}

// ── MutationObserver: 동적으로 추가되는 요소 감지 ─────────────
export function watchNewNodes(
  selector: string,
  onFound: (el: Element) => void
) {
  const mo = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as Element
        el.querySelectorAll<Element>(selector).forEach(onFound)
        if (el.matches(selector)) onFound(el)
      }
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })
}
