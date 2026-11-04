import { CONFIG, type ArtboardKind } from '../config'
import { snap } from './design'
import type { Design, Item } from './types'

type Min = (type: string) => { w: number; h: number }
type Box = { x: number; y: number; w: number; h: number }

const G = CONFIG.grid
const floorG = (n: number) => Math.floor(n / G) * G
const hit = (a: Box, b: Box, g: number) => a.x < b.x + b.w + g && b.x < a.x + a.w + g && a.y < b.y + b.h + g && b.y < a.y + a.h + g
/**
 * 폭이 줄면 글이 줄바꿈되니 높이를 늘리고, 늘면 줄인다.
 * 높이 비율을 '이번 폭'이 아니라 블록 기준 폭에 대한 절대 폭으로만 정한다(f). 그래야 어떤 순서로 종류를 오가도
 * 같은 폭으로 돌아오면 같은 높이가 되어 높이가 쌓이지 않는다. 한쪽으로 최대 1.6배.
 */
const f = (w: number, ref: number) => Math.sqrt(Math.min(2.56, Math.max(1 / 2.56, ref / w)))
const grow = (h: number, from: number, to: number, ref: number) => snap((h * f(to, ref)) / f(from, ref))
/** 원본에서 겹치지 않던 두 블록이 새 배치에서 겹치는가 */
function newOverlap(d: Design, placed: Map<string, Box>): boolean {
  const its = d.items
  for (let i = 0; i < its.length; i++)
    for (let j = i + 1; j < its.length; j++) {
      const a = placed.get(its[i].id)!
      const b = placed.get(its[j].id)!
      if (hit(a, b, 0) && !hit(its[i], its[j], 0)) return true
    }
  return false
}
const full = (d: Design, it: Item) => it.x <= 0 && it.x + it.w >= d.artboard.w
/** 세로로 긴 옆 막대(사이드바 등) */
const rail = (d: Design, it: Item) => it.h >= d.artboard.h * 0.5 && it.w <= d.artboard.w * 0.25

/**
 * 아트보드 종류를 바꿀 때 블록을 새 폭에 맞춰 다시 놓는다. 서로 겹치지 않고, 위에서 아래로 읽는 순서를 지킨다.
 * - 가득 찬 블록(내비게이션·히어로·푸터 등)은 새 폭을 가득 채운다.
 * - 좁은 화면(휴대폰): 꽉 찬 폭 또는 반 폭으로 위에서부터 쌓는다. 옆 막대는 맨 위 띠가 된다.
 * - 넓은 화면(태블릿·데스크톱): 같은 줄에 있던 블록은 같은 줄에 비율대로 놓고, 안 들어가면 여러 줄로 나눠 폭을 채운다.
 */
export function reflowDesign(d: Design, kind: ArtboardKind, minOf: Min): Design | null {
  const to: number = CONFIG.artboards[kind].w
  const railIds = new Set<string>()
  let placed = to < CONFIG.reflow.narrowBelow ? stack(d, kind, minOf) : rows(d, kind, minOf, railIds)
  // 안전망: 줄 배치가 원본에 없던 겹침을 만들면 위에서부터 쌓는 배치로 바꾼다(쌓기는 겹치지 않게 밀어낸다).
  if (newOverlap(d, placed)) {
    railIds.clear()
    placed = stack(d, kind, minOf)
  }
  const bottom = [...placed.values()].reduce((m, q) => Math.max(m, q.y + q.h), 0)
  const oldBottom = d.items.reduce((m, it) => Math.max(m, it.y + it.h), 0)
  const margin = Math.max(0, d.artboard.h - oldBottom)
  // 최대 높이 안에 다 놓을 수 없으면(블록 수십 개) 바꾸지 않는다. 억지로 당기면 겹친다.
  if (bottom > CONFIG.artboardMaxH) return null
  const h = Math.min(CONFIG.artboardMaxH, Math.max(CONFIG.artboards[kind].h, snap(bottom + margin)))
  const items = d.items.map((it) => {
    const n = { ...it, ...placed.get(it.id)! }
    // 원래 위에서 아래까지 닿던 옆 막대는 넓은 화면에서 새 높이 끝까지 닿게 한다.
    if (railIds.has(it.id) && it.y <= 0 && it.y + it.h >= d.artboard.h) n.h = h - n.y
    return n
  })
  return { ...d, artboard: { kind, w: to, h }, items }
}

/** 좁은 화면: 반 폭(두 개씩) 또는 꽉 찬 폭으로 위에서부터 빈틈없이 쌓는다. */
function stack(d: Design, kind: ArtboardKind, minOf: Min): Map<string, Box> {
  const from = d.artboard.w
  const to: number = CONFIG.artboards[kind].w
  const { gap } = CONFIG.reflow
  const p: number = CONFIG.reflow.pad[kind]
  // 휴대폰 폭(390)은 격자 배수가 아니라 본문 폭을 격자에 맞춰 내린다.
  const content = floorG(to - p * 2)
  const half = floorG((content - gap) / 2)
  const out = new Map<string, Box>()
  const placed: Box[] = []
  let lastY = 0
  for (const it of [...d.items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const min = minOf(it.type)
    const isFull = full(d, it)
    const isRail = !isFull && rail(d, it)
    let w = content
    let x = p
    if (isFull) {
      w = to
      x = 0
    } else if (!isRail && it.w / from < 0.15 && Math.max(min.w, snap(it.w * (to / from))) <= half && min.w <= half) w = half
    const h = Math.max(min.h, snap(isRail ? Math.min(it.h, 360) : isFull ? it.h : grow(it.h, it.w, w, min.w)))
    let y = lastY
    for (let guard = 0; guard < 1000; guard++) {
      const hits = placed.filter((q) => hit({ x, y, w, h }, q, gap))
      if (!hits.length) break
      const right = Math.max(...hits.map((q) => q.x + q.w)) + gap
      if (!isFull && right > x && right + w <= to - p) x = right
      else {
        y = snap(Math.min(...hits.map((q) => q.y + q.h)) + gap)
        x = isFull ? 0 : p
      }
    }
    lastY = y
    const box = { x, y, w, h }
    placed.push(box)
    out.set(it.id, box)
  }
  return out
}

/** 넓은 화면: 옆 막대는 옆에 두고, 나머지는 원래 줄(띠) 단위로 새 폭에 맞춘다. */
function rows(d: Design, kind: ArtboardKind, minOf: Min, railIds: Set<string>): Map<string, Box> {
  const from = d.artboard.w
  const to: number = CONFIG.artboards[kind].w
  const s = to / from
  const { gap } = CONFIG.reflow
  const p: number = CONFIG.reflow.pad[kind]
  const out = new Map<string, Box>()
  const minW = (it: Item) => minOf(it.type).w
  const minH = (it: Item) => minOf(it.type).h

  // 옆 막대: 원래 쪽 가장자리부터 차례로 붙이고, 본문 영역을 그만큼 좁힌다.
  let L = p
  let R = floorG(to - p)
  const rails = d.items.filter((i) => !full(d, i) && rail(d, i))
  const leftRails = rails.filter((it) => it.x + it.w / 2 < from / 2).sort((a, b) => a.x - b.x)
  const rightRails = rails.filter((it) => !leftRails.includes(it)).sort((a, b) => b.x + b.w - (a.x + a.w))
  let lEdge = -1
  for (const it of leftRails) {
    const w = Math.max(minW(it), snap(it.w * s))
    const x = lEdge < 0 ? (it.x <= 0 ? 0 : p) : lEdge + gap
    out.set(it.id, { x, y: snap(it.y), w, h: it.h })
    lEdge = x + w
    L = x + w + p
  }
  let rEdge = -1
  for (const it of rightRails) {
    let w = Math.max(minW(it), snap(it.w * s))
    let x: number
    if (rEdge < 0 && it.x + it.w >= from) {
      // 오른쪽 끝에 붙는 막대: x를 격자에 맞추고 남은 길이를 폭으로 쓴다(태블릿 834처럼 폭이 격자 배수가 아닐 때).
      x = floorG(to - w)
      w = to - x
    } else x = floorG((rEdge < 0 ? to - p : rEdge - gap) - w)
    out.set(it.id, { x, y: snap(it.y), w, h: it.h })
    rEdge = x
    R = floorG(x - p)
  }
  // 막대를 빼고 남은 본문이 어떤 블록의 최소 폭보다 좁으면 옆 막대로 두지 않고 줄 배치에 넣는다.
  const others = d.items.filter((it) => !out.has(it.id) && !full(d, it))
  if (rails.length && (R - L < G || others.some((it) => minW(it) > R - L))) {
    out.clear()
    L = p
    R = floorG(to - p)
  }
  for (const id of out.keys()) railIds.add(id)
  const railSrc = d.items.filter((it) => out.has(it.id))

  // 원래 본문이 차지하던 가로 범위 → 새 본문 영역 [L, R]
  const rest = d.items.filter((it) => !out.has(it.id))
  const body = rest.filter((it) => !full(d, it))
  const srcL = body.length ? Math.min(...body.map((i) => i.x)) : 0
  const srcR = body.length ? Math.max(...body.map((i) => i.x + i.w)) : from
  const k = (R - L) / Math.max(1, srcR - srcL)

  // 세로로 겹치는 블록끼리 한 띠로 묶는다.
  const bands: Item[][] = []
  let bandBottom = -Infinity
  for (const it of [...rest].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (bands.length && it.y < bandBottom) {
      bands[bands.length - 1].push(it)
      bandBottom = Math.max(bandBottom, it.y + it.h)
    } else {
      bands.push([it])
      bandBottom = it.y + it.h
    }
  }

  let y = 0
  let prevSrcBottom = 0
  bands.forEach((band, bi) => {
    const top = Math.min(...band.map((i) => i.y))
    // 띠 사이 원래 간격을 지킨다(첫 띠는 원래 위 여백).
    y = snap(y + (bi === 0 ? top : Math.max(gap, top - prevSrcBottom)))
    // 가득 찬 블록은 옆 막대 칸까지 덮으니, 원래 그 위에서 끝난 옆 막대보다 아래로 둔다(원래 간격 유지).
    if (band.some((it) => full(d, it)))
      for (const r of railSrc) if (r.y + r.h <= top) y = Math.max(y, snap(out.get(r.id)!.y + r.h + (top - (r.y + r.h))))
    prevSrcBottom = Math.max(...band.map((i) => i.y + i.h))
    const sorted = [...band].sort((a, b) => a.x - b.x)
    const boxes = new Map<string, Box>()

    // ① 원래 비율 자리에 놓아 본다.
    let cursor = -Infinity
    let fits = true
    for (const it of sorted) {
      let x = 0
      let w = to
      if (!full(d, it)) {
        w = Math.min(R - L, Math.max(minW(it), snap(it.w * k)))
        x = Math.max(snap(L + (it.x - srcL) * k), cursor === -Infinity ? L : cursor + gap)
        if (x + w > R) fits = false
      }
      cursor = x + w
      boxes.set(it.id, { x, y: y + snap(it.y - top), w, h: Math.max(minH(it), snap(full(d, it) ? it.h : grow(it.h, it.w, w, minW(it)))) })
    }
    // 원래 겹쳐 있던 블록(가득 찬 블록끼리 등)이 그대로 겹치면 ②로 줄을 나눈다.
    const bs = [...boxes.values()]
    if (bs.some((a, i) => bs.some((b, j) => j > i && hit(a, b, 0)))) fits = false

    // ② 안 들어가면 여러 줄로 나누고, 줄마다 본문 폭을 원래 폭 비율대로 나눠 채운다.
    if (!fits) {
      boxes.clear()
      const A = R - L
      const need = (it: Item) => Math.min(A, Math.max(minW(it), snap(it.w * s)))
      const lines: Item[][] = []
      let used = Infinity
      for (const it of sorted) {
        // 가득 찬 블록은 언제나 한 줄을 혼자 쓴다.
        if (full(d, it) || lines.at(-1)?.some((x) => full(d, x)) || used + gap + need(it) > A) {
          lines.push([it])
          used = need(it)
        } else {
          lines[lines.length - 1].push(it)
          used += gap + need(it)
        }
      }
      // 줄 수는 그대로 두고 줄마다 개수를 고르게(4개 → 3+1 대신 2+2). 안 들어가면 앞에서 채운 대로 둔다.
      const per = Math.ceil(sorted.length / lines.length)
      const even = Array.from({ length: lines.length }, (_, i) => sorted.slice(i * per, (i + 1) * per)).filter((l) => l.length)
      if (!sorted.some((it) => full(d, it)) && even.length === lines.length && even.every((l) => l.reduce((a, it) => a + need(it), 0) + gap * (l.length - 1) <= A)) lines.splice(0, lines.length, ...even)
      let ly = y
      for (const line of lines) {
        const free = Math.max(0, A - gap * (line.length - 1) - line.reduce((a, it) => a + need(it), 0))
        const total = line.reduce((a, it) => a + it.w, 0)
        let x = L
        let lineBottom = ly
        line.forEach((it, i) => {
          if (full(d, it)) {
            boxes.set(it.id, { x: 0, y: ly, w: to, h: it.h })
            lineBottom = Math.max(lineBottom, ly + it.h)
            return
          }
          const w = i === line.length - 1 ? R - x : need(it) + floorG((free * it.w) / total)
          const h = Math.max(minH(it), snap(grow(it.h, it.w, w, minW(it))))
          boxes.set(it.id, { x, y: ly, w, h })
          x += w + gap
          lineBottom = Math.max(lineBottom, ly + h)
        })
        ly = lineBottom + gap
      }
    }

    for (const [id, b] of boxes) out.set(id, b)
    y = Math.max(...[...boxes.values()].map((b) => b.y + b.h))
  })
  return out
}
