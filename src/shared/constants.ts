import type { TranslationSettings } from './types'

export const SITES: Record<string, string[]> = {
  twitter:     ['x.com', 'twitter.com'],
  ao3:         ['archiveofourown.org'],
  fanfiction:  ['fanfiction.net'],
  pixiv:       ['pixiv.net'],
}

export const DEFAULT_SETTINGS: TranslationSettings = {
  enabled:     true,
  targetLang:  'ko',
  sourceLangs: ['ja', 'en'],
  siteToggles: {
    twitter:    true,
    ao3:        true,
    fanfiction: true,
    pixiv:      true,
  },
  apiKey: '',
}

// content script 에서 DOM 마킹에 사용
export const TRANSLATION_BOX_CLASS = 'duckjil-translation-box'
export const TRANSLATED_ATTR       = 'data-duckjil-translated'

// DeepL 무료 플랜 엔드포인트
export const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

// content script 배치 번역 설정
export const BATCH_DELAY_MS = 50    // 큐에 쌓인 요소를 모아 보내기까지 대기 시간
export const BATCH_MAX_SIZE = 50    // DeepL 요청 한 번에 담을 수 있는 최대 텍스트 수

// DeepL 무료 플랜 월간 글자 수 한도
export const DEEPL_FREE_MONTHLY_LIMIT = 500_000

// Service Worker 메모리 캐시 최대 항목 수 (장시간 사용 시 메모리 무한 증가 방지)
export const MEM_CACHE_MAX_ENTRIES = 500
