import { processElement, observeVisible, watchNewNodes } from './base'

// Pixiv 소설 본문 문단 셀렉터
const PARAGRAPH_SELECTOR = '.novel_text p, [class*="sc-"] p'

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
