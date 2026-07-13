export type Language = 'ja' | 'en' | 'zh'
export type TargetLanguage = 'ko'
export type SiteKey = 'twitter' | 'ao3' | 'fanfiction' | 'pixiv'

export interface TranslationSettings {
  enabled: boolean
  targetLang: TargetLanguage
  sourceLangs: Language[]
  siteToggles: Record<SiteKey, boolean>
  apiKey: string
}

export interface TranslationResponse {
  translatedText: string
  detectedLang?: string
  error?: string
}

export interface BatchTranslationRequest {
  texts: string[]
  targetLang: TargetLanguage
  work?: string   // 지정 시 해당 작품의 용어집만 적용, 미지정 시 전체 용어집 적용
}

export interface BatchTranslationResponse {
  translations: TranslationResponse[]
}

export interface ApiUsage {
  month: string   // 'YYYY-MM'
  chars: number
}

export type MessageType = 'TRANSLATE_BATCH' | 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'FEEDBACK'

export interface Message {
  type: MessageType
  payload?: unknown
}

export type FeedbackValue = 'good' | 'bad'

export interface FeedbackPayload {
  text: string
  feedback: FeedbackValue
}
