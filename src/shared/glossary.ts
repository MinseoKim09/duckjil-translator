// 작품별 고유명사를 IndexedDB 에 저장하고 번역 전 치환하는 용어집

const DB_NAME    = 'duckjil-glossary'
const DB_VERSION = 1
const STORE_NAME = 'terms'

export interface Term {
  id?: number
  work: string    // 작품명 (예: '귀멸의칼날')
  source: string  // 원문 (예: '炭治郎')
  target: string  // 번역어 (예: '탄지로')
}

// ── DB 초기화 (연결을 재사용해 매 호출마다 여는 오버헤드를 피함) ──
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db    = req.result
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id', autoIncrement: true,
      })
      store.createIndex('by_work',   'work',   { unique: false })
      store.createIndex('by_source', 'source', { unique: false })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => {
      dbPromise = null   // 다음 호출에서 재시도할 수 있도록 초기화
      reject(req.error)
    }
  })

  return dbPromise
}

// ── 용어 추가 ──────────────────────────────────────────────────
export async function addTerm(term: Term): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).add(term)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

// ── 작품별 용어 전체 조회 ──────────────────────────────────────
export async function getTermsByWork(work: string): Promise<Term[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const index = tx.objectStore(STORE_NAME).index('by_work')
    const req   = index.getAll(work)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── 전체 용어 조회 (작품 미지정 시 사용) ────────────────────────
export async function getAllTerms(): Promise<Term[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── 용어 삭제 ──────────────────────────────────────────────────
export async function deleteTerm(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

// ── 번역 전 텍스트에 용어 치환 적용 ───────────────────────────
// 예) '炭治郎' → '__TERM_0__' 로 마스킹 후 번역, 번역 후 복원
export function applyGlossary(text: string, terms: Term[]): {
  masked: string
  restore: (translated: string) => string
} {
  const markers: string[] = []

  let masked = text
  terms.forEach((term, i) => {
    const marker = `__TERM_${i}__`
    markers.push(marker)
    masked = masked.replaceAll(term.source, marker)
  })

  function restore(translated: string): string {
    let result = translated
    terms.forEach((term, i) => {
      result = result.replaceAll(markers[i], term.target)
    })
    return result
  }

  return { masked, restore }
}
