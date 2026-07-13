import type { ApiUsage, TranslationSettings } from './types'
import { DEFAULT_SETTINGS } from './constants'

export async function getSettings(): Promise<TranslationSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      resolve(data.settings ?? DEFAULT_SETTINGS)
    })
  })
}

export async function setSettings(
  partial: Partial<TranslationSettings>
): Promise<void> {
  const current = await getSettings()
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      { settings: { ...current, ...partial } },
      resolve
    )
  })
}

// ── 이번 달 DeepL API 사용량 (글자 수) ─────────────────────────
const USAGE_KEY = 'apiUsage'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function getApiUsage(): Promise<ApiUsage> {
  const month = currentMonth()
  return new Promise((resolve) => {
    chrome.storage.local.get(USAGE_KEY, (data) => {
      const usage: ApiUsage | undefined = data[USAGE_KEY]
      resolve(usage?.month === month ? usage : { month, chars: 0 })
    })
  })
}

export async function addApiUsage(charCount: number): Promise<void> {
  const current = await getApiUsage()
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { [USAGE_KEY]: { month: current.month, chars: current.chars + charCount } },
      resolve
    )
  })
}
