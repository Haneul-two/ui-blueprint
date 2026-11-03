import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'edit'; id: string; fixture?: string }
  | { name: 'view'; data: string }
  | { name: 'blocks'; theme?: string }

/** 해시 라우팅: 정적 호스팅에서 새로고침해도 깨지지 않는다. */
export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '')
  const [path, query = ''] = h.split('?')
  const q = new URLSearchParams(query)
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'edit' && parts[1]) {
    // 깨진 퍼센트 인코딩(%E0 등)은 decodeURIComponent가 던진다. 화면 전체가 멈추지 않게 목록으로 보낸다.
    let id: string
    try {
      id = decodeURIComponent(parts[1])
    } catch {
      return { name: 'home' }
    }
    return { name: 'edit', id, fixture: q.get('fixture') ?? undefined }
  }
  if (parts[0] === 'view') return { name: 'view', data: q.get('d') ?? '' }
  if (parts[0] === 'blocks') return { name: 'blocks', theme: q.get('theme') ?? undefined }
  return { name: 'home' }
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setR(parseHash(location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const go = (hash: string) => {
  location.hash = hash
}
