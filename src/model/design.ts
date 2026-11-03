import { CONFIG, type ArtboardKind } from '../config'
import type { Design, Item, ThemeTokens } from './types'

export const DEFAULT_THEME: ThemeTokens = {
  mode: 'light',
  accent: '#1f4fd1',
  radius: 10,
  font: 'sans',
  density: 'normal',
}

export function uid(prefix = 'b'): string {
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36).slice(-4)}${rnd}`
}

export const snap = (n: number, g: number = CONFIG.grid) => Math.round(n / g) * g

export function newDesign(name = '새 설계', kind: ArtboardKind = 'desktop'): Design {
  const a = CONFIG.artboards[kind]
  return {
    v: 1,
    id: uid('d'),
    name,
    updatedAt: Date.now(),
    artboard: { kind, w: a.w, h: a.h },
    theme: { ...DEFAULT_THEME },
    items: [],
  }
}

/** 블록이 아트보드 안에 있고 최소 크기 이상이 되게 맞춘다. */
export function clampItem(it: Item, artW: number, artH: number, min: { w: number; h: number }): Item {
  const w = Math.max(min.w, Math.min(it.w, artW))
  const h = Math.max(min.h, Math.min(it.h, artH))
  const x = Math.max(0, Math.min(it.x, artW - w))
  const y = Math.max(0, Math.min(it.y, artH - h))
  return { ...it, x, y, w, h }
}

/** 아트보드 높이를 줄일 수 있는 최소값: 가장 아래 블록의 끝. */
export function minArtboardH(d: Design): number {
  return d.items.reduce<number>((m, it) => Math.max(m, it.y + it.h), CONFIG.artboardMinH)
}

/** 아트보드 폭이 바뀌면 블록을 새 폭 안으로 들인다. */
export function fitItemsToWidth(items: Item[], w: number): Item[] {
  return items.map((it) => {
    const nw = Math.min(it.w, w)
    const nx = Math.max(0, Math.min(it.x, w - nw))
    return nw === it.w && nx === it.x ? it : { ...it, w: nw, x: nx }
  })
}

/** 클릭 추가 위치: 기준점에 놓되, 같은 좌표에 블록이 있으면 비켜 놓는다. */
export function placeNear(items: Item[], x: number, y: number): { x: number; y: number } {
  let px = snap(x)
  let py = snap(y)
  for (let i = 0; i < 50 && items.some((it) => it.x === px && it.y === py); i++) {
    px += CONFIG.addOffset
    py += CONFIG.addOffset
  }
  return { x: px, y: py }
}

/** 위→아래, 왼→오 순서(AI 사양서·레이어 읽기 순서). */
export function readingOrder(items: Item[]): Item[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x)
}
