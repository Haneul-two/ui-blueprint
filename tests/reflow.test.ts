import { describe, expect, it } from 'vitest'
import { CONFIG, type ArtboardKind } from '../src/config'
import { getBlock, KNOWN_TYPES } from '../src/blocks/registry'
import { validateDesign } from '../src/model/validate'
import * as ops from '../src/editor/ops'
import { FIXTURES } from '../src/presets'
import type { Design } from '../src/model/types'

const KINDS = Object.keys(CONFIG.artboards) as ArtboardKind[]
const g = CONFIG.grid

function overlaps(d: Design) {
  const bad: string[] = []
  for (let i = 0; i < d.items.length; i++)
    for (let j = i + 1; j < d.items.length; j++) {
      const a = d.items[i]
      const b = d.items[j]
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(`${a.type}×${b.type}`)
    }
  return bad
}

function sound(d: Design, label: string) {
  expect(validateDesign(d, KNOWN_TYPES).ok, label).toBe(true)
  expect(overlaps(d), label).toEqual([])
  for (const it of d.items) {
    const min = getBlock(it.type)!.minSize
    expect(it.x >= 0 && it.y >= 0 && it.x + it.w <= d.artboard.w && it.y + it.h <= d.artboard.h, `${label} ${it.type} 아트보드 안`).toBe(true)
    expect(it.w >= min.w && it.h >= min.h, `${label} ${it.type} 최소 크기`).toBe(true)
    // 오른쪽 끝에 닿은 가득 찬 블록은 폭이 아트보드 폭(390 등)이라 격자 예외
    const ws = it.x + it.w === d.artboard.w ? [] : [it.w]
    expect([it.x, it.y, ...ws, it.h].every((n) => n % g === 0), `${label} ${it.type} 격자`).toBe(true)
  }
}

describe('아트보드 종류를 바꾸면 블록을 다시 배치한다', () => {
  for (const name of ['dashboard', 'landing', 'app'])
    for (const kind of KINDS)
      it(`${name} → ${kind}: 겹침 없음, 아트보드 안, 최소 크기·격자 지킴`, () => {
        const d = ops.setArtboard(FIXTURES[name](), { kind })
        expect(d.artboard.w).toBe(CONFIG.artboards[kind].w)
        sound(d, `${name}→${kind}`)
      })

  it('세 종류를 돌아 다시 와도 겹치지 않는다', () => {
    let d = FIXTURES.dashboard()
    for (const k of ['phone', 'tablet', 'desktop', 'phone', 'desktop'] as ArtboardKind[]) {
      d = ops.setArtboard(d, { kind: k })
      sound(d, k)
    }
  })

  it('가득 찬 블록(내비게이션·히어로·푸터)은 새 폭을 가득 채운다', () => {
    const d = ops.setArtboard(FIXTURES.landing(), { kind: 'phone' })
    for (const t of ['navbar', 'hero', 'footer']) {
      const it = d.items.find((i) => i.type === t)!
      expect([it.x, it.w], t).toEqual([0, CONFIG.artboards.phone.w])
    }
  })

  it('휴대폰 → 데스크톱: 블록이 넓은 화면에 맞게 커진다', () => {
    const src = FIXTURES.app()
    const d = ops.setArtboard(src, { kind: 'desktop' })
    const title = d.items.find((i) => i.type === 'section-title')!
    expect(title.w).toBeGreaterThan(CONFIG.artboards.desktop.w / 2)
    // KPI 두 개는 여전히 한 줄에 나란히 있다
    const kpis = d.items.filter((i) => i.type === 'kpi')
    expect(kpis[0].y).toBe(kpis[1].y)
    expect(kpis[1].x).toBeGreaterThan(kpis[0].x)
  })

  it('데스크톱 → 휴대폰: 위에서 아래로 읽는 순서를 지킨다', () => {
    const src = FIXTURES.landing()
    const d = ops.setArtboard(src, { kind: 'phone' })
    const order = (x: Design) => [...x.items].sort((a, b) => a.y - b.y || a.x - b.x).map((i) => i.id)
    const before = order(src)
    const after = order(d)
    // 원래 같은 줄(같은 y)이던 블록끼리만 순서가 섞일 수 있다
    const rowOf = new Map(src.items.map((i) => [i.id, i.y]))
    const rows = (ids: string[]) => ids.map((id) => rowOf.get(id))
    expect(rows(after)).toEqual(rows(before))
  })

  it('데스크톱 → 태블릿: 사이드바는 옆에 남고, 넘치는 KPI 4개는 2+2로 고르게 나뉜다', () => {
    const d = ops.setArtboard(FIXTURES.dashboard(), { kind: 'tablet' })
    const side = d.items.find((i) => i.type === 'sidebar')!
    expect([side.x, side.y, side.h]).toEqual([0, 0, d.artboard.h])
    const kpis = d.items.filter((i) => i.type === 'kpi')
    const rows = new Map<number, number>()
    for (const k of kpis) rows.set(k.y, (rows.get(k.y) ?? 0) + 1)
    expect([...rows.values()]).toEqual([2, 2])
    for (const k of kpis) expect(k.x).toBeGreaterThan(side.x + side.w)
  })

  it('휴대폰으로 바꿔도 가득 찬 히어로의 높이는 그대로다', () => {
    const src = FIXTURES.landing()
    const d = ops.setArtboard(src, { kind: 'phone' })
    const h = (x: Design) => x.items.find((i) => i.type === 'hero')!.h
    expect(h(d)).toBe(h(src))
  })

  it('실행 취소 한 번이면 원래 배치로 돌아간다', async () => {
    const { historyReducer, initHistory } = await import('../src/model/history')
    const src = FIXTURES.dashboard()
    let h = initHistory(src)
    h = historyReducer(h, { type: 'apply', fn: (d) => ops.setArtboard(d, { kind: 'phone' }) })
    h = historyReducer(h, { type: 'undo' })
    expect(h.present).toEqual(src)
  })
})

// 교차 리뷰(Codex)에서 나온 경우들
const mk = (items: [string, number, number, number, number][], h = 1024): Design => ({
  v: 1,
  id: 'r',
  name: 'r',
  updatedAt: 0,
  artboard: { kind: 'desktop', w: 1440, h },
  theme: FIXTURES.dashboard().theme,
  items: items.map(([type, x, y, w, hh], i) => ({ id: `i${i}`, type, x, y, w, h: hh, props: {} })),
})

describe('다시 배치: 까다로운 입력', () => {
  it('휴대폰↔데스크톱을 8번 오가도 높이가 쌓이지 않고 계속 올바르다', () => {
    let d = FIXTURES.dashboard()
    const hs: number[] = []
    for (let i = 0; i < 8; i++) {
      d = ops.setArtboard(d, { kind: 'phone' })
      sound(d, `왕복 ${i} 휴대폰`)
      d = ops.setArtboard(d, { kind: 'desktop' })
      sound(d, `왕복 ${i} 데스크톱`)
      hs.push(d.artboard.h)
    }
    expect(Math.max(...hs)).toBe(Math.min(...hs.slice(1)))
  })

  it('최대 높이 안에 다 놓을 수 없으면 바꾸지 않는다', () => {
    const items = Array.from({ length: 20 }, (_, i) => ['hero', (i % 2) * 720, Math.floor(i / 2) * 400, 704, 400] as [string, number, number, number, number])
    const d = mk(items, 4000)
    expect(ops.setArtboard(d, { kind: 'phone' })).toBe(d)
  })

  it('같은 쪽 옆 막대 두 개는 나란히 붙고 겹치지 않는다', () => {
    const d = ops.setArtboard(mk([['sidebar', 0, 0, 160, 1024], ['sidebar', 176, 0, 160, 1024], ['kpi', 400, 32, 264, 136]]), { kind: 'tablet' })
    sound(d, '막대 둘')
  })

  it('원래 겹쳐 있던 가득 찬 블록은 따로 줄을 나눈다', () => {
    const d = ops.setArtboard(mk([['hero', 0, 0, 1440, 400], ['navbar', 0, 0, 1440, 64]]), { kind: 'tablet' })
    sound(d, '가득 찬 겹침')
  })

  it('막대를 빼면 본문이 최소 폭보다 좁아질 때는 옆 막대로 두지 않는다', () => {
    const d = ops.setArtboard(mk([['hero', 0, 0, 320, 1024], ['hero', 1120, 0, 320, 1024], ['table', 352, 32, 736, 320]]), { kind: 'tablet' })
    sound(d, '좁은 본문')
  })

  it('오른쪽 끝 옆 막대도 x가 격자 위에 있다', () => {
    const d = ops.setArtboard(mk([['sidebar', 1200, 0, 240, 1024], ['kpi', 32, 32, 264, 136]]), { kind: 'tablet' })
    sound(d, '오른쪽 막대')
  })
})

describe('다시 배치: 교차 리뷰 2차', () => {
  it('세 종류를 15번 돌아도 높이가 쌓이지 않는다(데스크톱→태블릿→휴대폰)', () => {
    for (const name of ['app', 'dashboard', 'landing']) {
      let d = FIXTURES[name]()
      const hs: number[] = []
      for (let i = 0; i < 15; i++)
        for (const k of ['desktop', 'tablet', 'phone'] as ArtboardKind[]) {
          const next = ops.setArtboard(d, { kind: k })
          expect(next.artboard.kind, `${name} ${i} ${k}`).toBe(k)
          d = next
          sound(d, `${name} ${i} ${k}`)
          if (k === 'phone') hs.push(d.artboard.h)
        }
      expect(Math.max(...hs) - Math.min(...hs.slice(1)), name).toBeLessThanOrEqual(64)
    }
  })

  it('옆 막대 아래 있던 가득 찬 푸터는 막대와 겹치지 않는다', () => {
    const d: Design = {
      ...mk([]),
      artboard: { kind: 'tablet', w: 834, h: 1184 },
      items: [
        { id: 'a', type: 'sidebar', x: 0, y: 64, w: 160, h: 960, props: {} },
        { id: 'b', type: 'table', x: 200, y: 64, w: 608, h: 960, props: {} },
        { id: 'c', type: 'navbar', x: 0, y: 0, w: 834, h: 64, props: {} },
        { id: 'e', type: 'footer', x: 0, y: 1024, w: 834, h: 160, props: {} },
      ],
    }
    sound(ops.setArtboard(d, { kind: 'desktop' }), '막대 아래 푸터')
  })
})
