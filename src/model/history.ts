import { CONFIG } from '../config'
import type { Design } from './types'

export interface History {
  present: Design
  past: Design[]
  future: Design[]
  /** 같은 key로 연달아 들어온 변경(슬라이더 끌기 등)은 한 단계로 합친다. */
  lastKey?: string
  lastAt?: number
}

export type HistoryAction =
  | { type: 'commit'; next: Design; key?: string; now?: number }
  | { type: 'apply'; fn: (d: Design) => Design; key?: string; now?: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; design: Design }

export function initHistory(design: Design): History {
  return { present: design, past: [], future: [] }
}

export function historyReducer(h: History, a: HistoryAction): History {
  if (a.type === 'apply') return historyReducer(h, { type: 'commit', next: a.fn(h.present), key: a.key, now: a.now })
  switch (a.type) {
    case 'commit': {
      if (a.next === h.present) return h
      const now = a.now ?? Date.now()
      const present = { ...a.next, updatedAt: now }
      if (a.key && a.key === h.lastKey && h.lastAt !== undefined && now - h.lastAt < CONFIG.propCommitMs)
        return { present, past: h.past, future: [], lastKey: a.key, lastAt: now }
      const past = [...h.past, h.present]
      if (past.length > CONFIG.historyLimit) past.shift()
      return { present, past, future: [], lastKey: a.key, lastAt: now }
    }
    case 'undo': {
      if (!h.past.length) return h
      const prev = h.past[h.past.length - 1]
      return { present: prev, past: h.past.slice(0, -1), future: [h.present, ...h.future] }
    }
    case 'redo': {
      if (!h.future.length) return h
      const [next, ...rest] = h.future
      return { present: next, past: [...h.past, h.present], future: rest }
    }
    case 'load':
      return initHistory(a.design)
  }
}
