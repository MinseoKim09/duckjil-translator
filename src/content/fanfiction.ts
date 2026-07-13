import { processElement, observeVisible, watchNewNodes } from './base'

// Fanfiction.net 본문 영역 셀렉터
// #storytext 가 본문 컨테이너
const PARAGRAPH_SELECTOR = '#storytext p'

function init() {
  const paragraphs = document.querySelectorAll<Element>(PARAGRAPH_SELECTOR)

  observeVisible(paragraphs, processElement)
  watchNewNodes(PARAGRAPH_SELECTOR, processElement)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
