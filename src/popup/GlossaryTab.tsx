import { useEffect, useState } from 'react'
import { addTerm, deleteTerm, getTermsByWork } from '../shared/glossary'
import type { Term } from '../shared/glossary'

export default function GlossaryTab() {
  const [work, setWork]     = useState('')
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [terms, setTerms]   = useState<Term[]>([])

  useEffect(() => {
    if (!work.trim()) {
      setTerms([])
      return
    }
    getTermsByWork(work.trim()).then(setTerms)
  }, [work])

  async function refresh() {
    if (!work.trim()) return
    setTerms(await getTermsByWork(work.trim()))
  }

  async function handleAdd() {
    if (!work.trim() || !source.trim() || !target.trim()) return
    await addTerm({ work: work.trim(), source: source.trim(), target: target.trim() })
    setSource('')
    setTarget('')
    await refresh()
  }

  async function handleDelete(id?: number) {
    if (id === undefined) return
    await deleteTerm(id)
    await refresh()
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">작품명</label>
        <input
          type="text"
          value={work}
          onChange={(e) => setWork(e.target.value)}
          placeholder="예: 귀멸의칼날"
          className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">원문</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="炭治郎"
            className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">번역어</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="탄지로"
            className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={!work.trim() || !source.trim() || !target.trim()}
        className="w-full mb-4 text-xs bg-blue-500 disabled:bg-gray-300 text-white rounded-md py-1.5"
      >
        용어 추가
      </button>

      <div>
        <p className="text-xs text-gray-500 mb-2">
          {work.trim() ? `'${work.trim()}' 용어 목록` : '작품명을 입력하세요'}
        </p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {terms.map((term) => (
            <div key={term.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-md px-2 py-1">
              <span className="truncate">
                {term.source} → {term.target}
              </span>
              <button
                onClick={() => handleDelete(term.id)}
                className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
          {work.trim() && terms.length === 0 && (
            <p className="text-xs text-gray-400">등록된 용어가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  )
}
