import type { Design } from './types'

// 설계마다 키를 나눠 저장한다. 다른 탭이 고친 다른 설계를 덮어쓰지 않기 위해서다.
const INDEX = 'ub:index'
const KEY = (id: string) => `ub:design:${id}`

export interface IndexEntry {
  id: string
  name: string
  updatedAt: number
  kind: Design['artboard']['kind']
  count: number
}

function readIndex(): IndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as IndexEntry[]).filter((e) => e && typeof e.id === 'string') : []
  } catch {
    return []
  }
}

export function listDesigns(): IndexEntry[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadDesignRaw(id: string): unknown {
  try {
    const raw = localStorage.getItem(KEY(id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 저장에 성공하면 true. 실패(용량·사생활 모드)면 false. */
export function saveDesign(d: Design): boolean {
  try {
    localStorage.setItem(KEY(d.id), JSON.stringify(d))
    // 쓰기 직전에 목록을 다시 읽어 이 설계 항목만 바꾼다(다른 탭이 더한 항목 보존).
    const idx = readIndex().filter((e) => e.id !== d.id)
    idx.push({ id: d.id, name: d.name, updatedAt: d.updatedAt, kind: d.artboard.kind, count: d.items.length })
    localStorage.setItem(INDEX, JSON.stringify(idx))
    return true
  } catch {
    return false
  }
}

export function deleteDesign(id: string): void {
  try {
    localStorage.removeItem(KEY(id))
    localStorage.setItem(INDEX, JSON.stringify(readIndex().filter((e) => e.id !== id)))
  } catch {
    /* 지우기 실패는 목록에 그대로 남는 것으로 드러난다 */
  }
}

export const designKey = KEY
