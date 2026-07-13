import { processElement, watchNewNodes } from './base'

// Twitter 트윗 텍스트 셀렉터
const TWEET_SELECTOR = '[data-testid="tweetText"]'

// 이미 렌더링된 트윗 처리
document.querySelectorAll<Element>(TWEET_SELECTOR).forEach(processElement)

// 무한 스크롤로 추가되는 트윗 감지
watchNewNodes(TWEET_SELECTOR, processElement)
