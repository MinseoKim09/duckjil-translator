import { addApiUsage, getSettings } from '../shared/storage'
import { applyGlossary, getAllTerms, getTermsByWork } from '../shared/glossary'
import { DEEPL_API_URL, MEM_CACHE_MAX_ENTRIES } from '../shared/constants'
import type {
  BatchTranslationRequest,
  BatchTranslationResponse,
  FeedbackPayload,
  Message,
  TranslationResponse,
} from '../shared/types'

// ── 1차 캐시: 메모리 (빠름, SW 종료 시 초기화) ───────────────
const memCache = new Map<string, string>()

// ── 2차 캐시: chrome.storage.session (SW 재시작 후에도 유지) ──
async function getCached(key: string): Promise<string | null> {
  if (memCache.has(key)) return memCache.get(key)!
  const data = await chrome.storage.session.get(key)
  return data[key] ?? null
}

async function setCached(key: string, value: string): Promise<void> {
  memCache.set(key, value)
  if (memCache.size > MEM_CACHE_MAX_ENTRIES) {
    const oldestKey = memCache.keys().next().value
    if (oldestKey !== undefined) memCache.delete(oldestKey)
  }
  await chrome.storage.session.set({ [key]: value })
}

// ── DeepL 호출 (여러 텍스트를 한 번에 처리) ───────────────────
async function callDeepL(
  texts: string[],
  apiKey: string
): Promise<{ text: string; detected_source_language: string }[] | { error: string }> {
  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts, target_lang: 'KO' }),
  })

  if (!response.ok) {
    return { error: `DeepL API 오류: ${response.status}` }
  }

  const data = await response.json()
  return data.translations
}

// ── 배치 번역: 캐시 확인 → 동일 텍스트 중복 제거 → 용어집 마스킹 → DeepL 일괄 요청 → 복원 ──
async function translateBatch(req: BatchTranslationRequest): Promise<BatchTranslationResponse> {
  const results: TranslationResponse[] = new Array(req.texts.length)
  const terms = req.work ? await getTermsByWork(req.work) : await getAllTerms()

  // 캐시 조회를 병렬로 수행
  const cacheKeys    = req.texts.map((text) => `auto__${text}`)
  const cachedValues = await Promise.all(cacheKeys.map(getCached))

  // 캐시에 없는 텍스트를 원문 기준으로 묶어 동일 텍스트가 여러 번 등장해도
  // DeepL에는 한 번만 요청한다 (재게시/반복 문단 등에서 문자 사용량 절약)
  interface Group {
    indices: number[]
    masked: string
    restore: (translated: string) => string
  }
  const groups = new Map<string, Group>()

  for (let i = 0; i < req.texts.length; i++) {
    const cached = cachedValues[i]
    if (cached) {
      results[i] = { translatedText: cached }
      continue
    }

    const text = req.texts[i]
    let group = groups.get(text)
    if (!group) {
      const { masked, restore } = applyGlossary(text, terms)
      group = { indices: [], masked, restore }
      groups.set(text, group)
    }
    group.indices.push(i)
  }

  if (groups.size === 0) return { translations: results }

  const settings = await getSettings()
  if (!settings.apiKey) {
    groups.forEach((group) => {
      group.indices.forEach((index) => {
        results[index] = { translatedText: '', error: 'API 키 없음. 팝업에서 DeepL API 키를 입력해주세요.' }
      })
    })
    return { translations: results }
  }

  const entries    = Array.from(groups.entries())
  const translated = await callDeepL(entries.map(([, group]) => group.masked), settings.apiKey)

  if ('error' in translated) {
    entries.forEach(([, group]) => {
      group.indices.forEach((index) => {
        results[index] = { translatedText: '', error: translated.error }
      })
    })
    return { translations: results }
  }

  let usedChars = 0
  const cacheWrites: Promise<void>[] = []

  for (let i = 0; i < entries.length; i++) {
    const [text, group]  = entries[i]
    const translatedText = group.restore(translated[i].text)
    const detectedLang    = translated[i].detected_source_language

    cacheWrites.push(setCached(`auto__${text}`, translatedText))
    usedChars += group.masked.length
    group.indices.forEach((index) => {
      results[index] = { translatedText, detectedLang }
    })
  }

  await Promise.all(cacheWrites)
  await addApiUsage(usedChars)

  return { translations: results }
}

// ── 번역 피드백 저장 (chrome.storage.local) ──────────────────
const FEEDBACK_KEY = 'feedback'

async function saveFeedback(entry: FeedbackPayload): Promise<void> {
  const data = await chrome.storage.local.get(FEEDBACK_KEY)
  const list: FeedbackPayload[] = data[FEEDBACK_KEY] ?? []
  list.push(entry)
  await chrome.storage.local.set({ [FEEDBACK_KEY]: list })
}

// ── 메시지 핸들러 ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'TRANSLATE_BATCH') {
      translateBatch(message.payload as BatchTranslationRequest)
        .then(sendResponse)
        .catch((err: Error) => sendResponse({
          translations: (message.payload as BatchTranslationRequest).texts.map(() => ({
            translatedText: '', error: err.message,
          })),
        }))
      return true  // 비동기 응답을 위해 반드시 true 반환
    }

    if (message.type === 'FEEDBACK') {
      saveFeedback(message.payload as FeedbackPayload)
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }))
      return true
    }
  }
)
