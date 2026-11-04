import { CONFIG, type ArtboardKind } from '../config'
import { defaultProps, getBlock } from '../blocks/registry'
import { clampItem, minArtboardH, placeNear, snap, uid } from '../model/design'
import { reflowDesign } from '../model/reflow'
import type { Design, Item, PropValue } from '../model/types'
import type { Rect } from './snapping'

const minOf = (type: string) => getBlock(type)?.minSize ?? { w: 8, h: 8 }
const fit = (d: Design, it: Item) => clampItem(it, d.artboard.w, d.artboard.h, minOf(it.type))

/** 블록 하나를 더한다. center면 at을 블록 가운데로 본다(클릭 추가), 아니면 왼쪽 위(끌어 놓은 자리). */
export function addBlock(d: Design, type: string, at: { x: number; y: number }, center = false, id: string = uid()): { design: Design; id: string } | null {
  const def = getBlock(type)
  if (!def || d.items.length >= CONFIG.limits.items) return null
  const w = Math.min(def.size.w, d.artboard.w)
  const h = Math.min(def.size.h, d.artboard.h)
  const base = center ? { x: at.x - w / 2, y: at.y - h / 2 } : at
  const p = placeNear(d.items, Math.max(0, base.x), Math.max(0, base.y))
  // 블록 크기와 아트보드 크기가 모두 격자 배수라, 경계에 맞춰 당겨도 격자 위에 남는다.
  const item = fit(d, { id, type, x: p.x, y: p.y, w, h, props: defaultProps(def) })
  return { design: { ...d, items: [...d.items, item] }, id: item.id }
}

export function removeIds(d: Design, ids: string[]): Design {
  return { ...d, items: d.items.filter((i) => !ids.includes(i.id)) }
}

/** 복제(또는 붙여넣기): 원본에서 24px씩 비켜 놓고 맨 위에 올린다. */
export function cloneItems(d: Design, src: Item[], ids: string[] = src.map(() => uid())): { design: Design; ids: string[] } {
  const room = CONFIG.limits.items - d.items.length
  const copies = src.slice(0, Math.max(0, room)).map((it, i) =>
    fit(d, { ...it, id: ids[i], x: it.x + CONFIG.addOffset, y: it.y + CONFIG.addOffset, props: structuredClone(it.props), locked: undefined, hidden: undefined }),
  )
  return { design: { ...d, items: [...d.items, ...copies] }, ids: copies.map((c) => c.id) }
}

export function setRects(d: Design, rects: Record<string, Rect>): Design {
  return { ...d, items: d.items.map((it) => (rects[it.id] && !it.locked ? fit(d, { ...it, ...rects[it.id] }) : it)) }
}

/** 여러 개를 함께 옮길 때는 모두가 아트보드 안에 남는 공통 이동량을 쓴다. 따로 맞추면 사이 간격이 흐트러진다. */
export function nudge(d: Design, ids: string[], dx: number, dy: number): Design {
  const moving = d.items.filter((it) => ids.includes(it.id) && !it.locked)
  for (const it of moving) {
    dx = Math.max(-it.x, Math.min(dx, d.artboard.w - it.w - it.x))
    dy = Math.max(-it.y, Math.min(dy, d.artboard.h - it.h - it.y))
  }
  if (!moving.length || (dx === 0 && dy === 0)) return d
  return { ...d, items: d.items.map((it) => (moving.includes(it) ? { ...it, x: it.x + dx, y: it.y + dy } : it)) }
}

/** 잠긴 블록은 잠금을 푸는 변경이 아니면 위치·크기를 바꾸지 않는다. */
export function patchItem(d: Design, id: string, patch: Partial<Item>): Design {
  return {
    ...d,
    items: d.items.map((it) => {
      if (it.id !== id) return it
      // 잠긴 블록: 잠금을 푸는 패치가 아니면 위치·크기를 건드리지 않고 fit도 하지 않는다(불러온 작은 블록이 커지지 않게).
      const unlocking = 'locked' in patch && !patch.locked
      if (it.locked && !unlocking) {
        const { x: _x, y: _y, w: _w, h: _h, ...rest } = patch
        return { ...it, ...rest }
      }
      return fit(d, { ...it, ...patch })
    }),
  }
}

export function setProp(d: Design, id: string, key: string, v: PropValue): Design {
  return { ...d, items: d.items.map((it) => (it.id === id ? { ...it, props: { ...it.props, [key]: v } } : it)) }
}

export function toFront(d: Design, ids: string[]): Design {
  return { ...d, items: [...d.items.filter((i) => !ids.includes(i.id)), ...d.items.filter((i) => ids.includes(i.id))] }
}
export function toBack(d: Design, ids: string[]): Design {
  return { ...d, items: [...d.items.filter((i) => ids.includes(i.id)), ...d.items.filter((i) => !ids.includes(i.id))] }
}
/** 레이어 패널의 한 칸 위/아래 이동. dir 1 = 앞으로. */
export function shift(d: Design, id: string, dir: 1 | -1): Design {
  const i = d.items.findIndex((x) => x.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= d.items.length) return d
  const items = [...d.items]
  ;[items[i], items[j]] = [items[j], items[i]]
  return { ...d, items }
}

export function setArtboard(d: Design, patch: Partial<{ kind: ArtboardKind; h: number }>): Design {
  let next = d
  if (patch.kind && patch.kind !== d.artboard.kind) {
    // 최대 높이 안에 다시 놓을 수 없으면 바꾸지 않는다(부르는 쪽이 종류가 그대로인지 보고 알린다).
    const r = reflowDesign(d, patch.kind, minOf)
    if (!r) return d
    next = r
  }
  if (patch.h !== undefined) {
    const h = Math.max(minArtboardH(next), Math.min(CONFIG.artboardMaxH, snap(patch.h)))
    next = { ...next, artboard: { ...next.artboard, h } }
  }
  return next
}
