import { CONFIG } from '../config'
import { snap } from '../model/design'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Guide {
  axis: 'x' | 'y' // x: 세로선(x 위치), y: 가로선(y 위치)
  at: number
}

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
export type { Handle }

/** 움직이는 사각형의 가장자리·가운데가 다른 블록이나 아트보드의 선에 가까우면 붙인다.
 *  붙인 결과 위치(base + d)가 격자 위에 있는 후보만 쓴다. 그래야 놓은 좌표가 늘 8의 배수다. */
function bestOffset(edges: number[], targets: number[], limit: number, base: number): { d: number; at: number } | null {
  let best: { d: number; at: number } | null = null
  for (const e of edges)
    for (const t of targets) {
      const d = t - e
      if (Math.round(base + d) % CONFIG.grid !== 0) continue
      if (Math.abs(d) <= limit && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t }
    }
  return best
}

export function targetsOf(others: Rect[], art: { w: number; h: number }) {
  const xs = [0, art.w / 2, art.w]
  const ys = [0, art.h / 2, art.h]
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w)
    ys.push(o.y, o.y + o.h / 2, o.y + o.h)
  }
  return { xs, ys }
}

/** 이동: 격자에 맞춘 뒤, 안내선이 가까우면 안내선을 우선한다. limit은 아트보드 좌표 기준 거리. */
export function snapMove(r: Rect, others: Rect[], art: { w: number; h: number }, limit: number, guides: boolean): { rect: Rect; guides: Guide[] } {
  let x = snap(r.x)
  let y = snap(r.y)
  const found: Guide[] = []
  if (guides) {
    const t = targetsOf(others, art)
    const gx = bestOffset([r.x, r.x + r.w / 2, r.x + r.w], t.xs, limit, r.x)
    const gy = bestOffset([r.y, r.y + r.h / 2, r.y + r.h], t.ys, limit, r.y)
    if (gx) {
      x = Math.round(r.x + gx.d)
      found.push({ axis: 'x', at: gx.at })
    }
    if (gy) {
      y = Math.round(r.y + gy.d)
      found.push({ axis: 'y', at: gy.at })
    }
  }
  x = Math.max(0, Math.min(x, art.w - r.w))
  y = Math.max(0, Math.min(y, art.h - r.h))
  return { rect: { ...r, x, y }, guides: found }
}

/** 크기 조절: 잡은 손잡이 쪽 가장자리만 움직이고 격자·최소 크기·아트보드 경계를 지킨다. */
export function resizeRect(start: Rect, handle: Handle, dx: number, dy: number, min: { w: number; h: number }, art: { w: number; h: number }): Rect {
  let { x, y, w, h } = start
  const right = start.x + start.w
  const bottom = start.y + start.h
  if (handle.includes('e')) w = snap(Math.min(right + dx, art.w)) - x
  if (handle.includes('s')) h = snap(Math.min(bottom + dy, art.h)) - y
  if (handle.includes('w')) {
    x = snap(Math.max(0, Math.min(start.x + dx, right - min.w)))
    w = right - x
  }
  if (handle.includes('n')) {
    y = snap(Math.max(0, Math.min(start.y + dy, bottom - min.h)))
    h = bottom - y
  }
  w = Math.max(min.w, w)
  h = Math.max(min.h, h)
  // 최소 크기 때문에 아트보드를 넘으면 위치를 당긴다.
  x = Math.max(0, Math.min(x, art.w - w))
  y = Math.max(0, Math.min(y, art.h - h))
  return { x, y, w: Math.min(w, art.w), h: Math.min(h, art.h) }
}

export const snapLimit = (zoom: number) => CONFIG.snapDistance / zoom
