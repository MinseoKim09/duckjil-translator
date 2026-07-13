import { processElement, observeVisible, watchNewNodes } from './base'

// AO3 챕터 본문 문단 셀렉터
// .userstuff 가 챕터 본문 영역, p 가 각 문단
const PARAGRAPH_SELECTOR = '.userstuff p'

function init() {
  const paragraphs = document.querySelectorAll<Element>(PARAGRAPH_SELECTOR)

  // 화면에 보이는 문단부터 번역 (긴 팬픽 성능 최적화)
  observeVisible(paragraphs, processElement)

  // 다음 챕터 로드 등 동적 콘텐츠 감지
  watchNewNodes(PARAGRAPH_SELECTOR, processElement)
}

// DOM 준비 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
