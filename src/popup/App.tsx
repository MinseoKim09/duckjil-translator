import { useEffect, useState } from 'react'
import { getApiUsage, getSettings, setSettings } from '../shared/storage'
import type { ApiUsage, SiteKey, TranslationSettings } from '../shared/types'
import { DEFAULT_SETTINGS, DEEPL_FREE_MONTHLY_LIMIT } from '../shared/constants'
import GlossaryTab from './GlossaryTab'

const SITE_LABELS: Record<SiteKey, string> = {
  twitter:    'Twitter / X',
  ao3:        'AO3',
  fanfiction: 'Fanfiction.net',
  pixiv:      'Pixiv',
}

type Tab = 'settings' | 'glossary'

export default function App() {
  const [tab, setTab]         = useState<Tab>('settings')
  const [settings, setLocal] = useState<TranslationSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved]    = useState(false)
  const [usage, setUsage]    = useState<ApiUsage>({ month: '', chars: 0 })

  useEffect(() => {
    getSettings().then(setLocal)
    getApiUsage().then(setUsage)
  }, [])

  async function updateSettings(partial: Partial<TranslationSettings>) {
    const next = { ...settings, ...partial }
    setLocal(next)
    await setSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  async function toggleSite(site: SiteKey) {
    await updateSettings({
      siteToggles: { ...settings.siteToggles, [site]: !settings.siteToggles[site] },
    })
  }

  return (
    <div className="w-72 p-4 font-sans text-gray-800">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-sm">덕질 번역기</span>
        {saved && <span className="text-xs text-blue-500">저장됨</span>}
      </div>

      {/* 탭 */}
      <div className="flex mb-4 border-b border-gray-200">
        <button
          onClick={() => setTab('settings')}
          className={`flex-1 text-xs pb-2 ${
            tab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500 font-medium' : 'text-gray-400'
          }`}
        >
          설정
        </button>
        <button
          onClick={() => setTab('glossary')}
          className={`flex-1 text-xs pb-2 ${
            tab === 'glossary' ? 'text-blue-500 border-b-2 border-blue-500 font-medium' : 'text-gray-400'
          }`}
        >
          용어집
        </button>
      </div>

      {tab === 'settings' && (
        <>
          {/* DeepL API 키 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">DeepL API 키</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="DeepL-Auth-Key를 입력하세요"
              className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              <a
                href="https://www.deepl.com/pro-api"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline"
              >
                무료 키 발급
              </a>
              {' '}(월 50만 글자 무료)
            </p>
          </div>

          {/* 이번 달 API 사용량 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">이번 달 사용량</span>
              <span className="text-xs text-gray-500">
                {usage.chars.toLocaleString()} / {DEEPL_FREE_MONTHLY_LIMIT.toLocaleString()}자
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${Math.min(100, (usage.chars / DEEPL_FREE_MONTHLY_LIMIT) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* 사이트별 토글 */}
          <div>
            <p className="text-xs text-gray-500 mb-2">사이트별 번역</p>
            <div className="space-y-2">
              {(Object.keys(SITE_LABELS) as SiteKey[]).map((site) => (
                <div key={site} className="flex items-center justify-between">
                  <span className="text-sm">{SITE_LABELS[site]}</span>
                  <button
                    onClick={() => toggleSite(site)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${
                      settings.siteToggles[site] ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                        settings.siteToggles[site] ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'glossary' && <GlossaryTab />}
    </div>
  )
}
