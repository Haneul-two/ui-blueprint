import { describe, expect, it } from 'vitest'
import { CONFIG } from '../src/config'
import { KNOWN_TYPES } from '../src/blocks/registry'
import { historyReducer, initHistory } from '../src/model/history'
import { minArtboardH, newDesign } from '../src/model/design'
import { validateDesign } from '../src/model/validate'
import * as ops from '../src/editor/ops'
import { resizeRect, snapMove } from '../src/editor/snapping'
import { buildAiSpec } from '../src/io/aiSpec'
import { allBlocksFixture, dashboardPreset, FIXTURES } from '../src/presets'
import { getBlock } from '../src/blocks/registry'

const g = CONFIG.grid

describe('실행 취소 기록', () => {
  it('commit → undo → redo', () => {
    const a = newDesign()
    let h = initHistory(a)
    const b = { ...a, name: 'b' }
    h = historyReducer(h, { type: 'commit', next: b })
    expect(h.present.name).toBe('b')
    h = historyReducer(h, { type: 'undo' })
    expect(h.present.name).toBe(a.name)
    h = historyReducer(h, { type: 'redo' })
    expect(h.present.name).toBe('b')
  })

  it('같은 key가 propCommitMs 안에 이어지면 한 단계로 합친다', () => {
    let h = initHistory(newDesign())
    h = historyReducer(h, { type: 'apply', fn: (d) => ({ ...d, name: '1' }), key: 'theme', now: 1000 })
    h = historyReducer(h, { type: 'apply', fn: (d) => ({ ...d, name: '2' }), key: 'theme', now: 1100 })
    expect(h.past.length).toBe(1)
    h = historyReducer(h, { type: 'apply', fn: (d) => ({ ...d, name: '3' }), key: 'theme', now: 1100 + CONFIG.propCommitMs + 1 })
    expect(h.past.length).toBe(2)
    h = historyReducer(h, { type: 'undo' })
    expect(h.present.name).toBe('2')
  })

  it(`기록은 ${CONFIG.historyLimit}단계까지만 남는다`, () => {
    let h = initHistory(newDesign())
    for (let i = 0; i < CONFIG.historyLimit + 20; i++) h = historyReducer(h, { type: 'commit', next: { ...h.present, name: String(i) } })
    expect(h.past.length).toBe(CONFIG.historyLimit)
  })
})

describe('검사기', () => {
  const ok = () => JSON.parse(JSON.stringify(dashboardPreset()))
  it('정상 설계는 통과한다', () => {
    const r = validateDesign(ok(), KNOWN_TYPES)
    expect(r.ok).toBe(true)
  })
  it('형식 오류', () => expect(validateDesign('문자열', KNOWN_TYPES).ok).toBe(false))
  it('버전 불일치', () => expect(validateDesign({ ...ok(), v: 2 }, KNOWN_TYPES).ok).toBe(false))
  it('숫자 범위', () => {
    const d = ok()
    d.items[0].x = -5
    expect(validateDesign(d, KNOWN_TYPES).ok).toBe(false)
  })
  it('문자열 길이', () => {
    const d = ok()
    d.items[0].props.title = 'a'.repeat(CONFIG.limits.string + 1)
    expect(validateDesign(d, KNOWN_TYPES).ok).toBe(false)
  })
  it('블록 수', () => {
    const d = ok()
    d.items = Array.from({ length: CONFIG.limits.items + 1 }, (_, i) => ({ ...d.items[0], id: `x${i}` }))
    expect(validateDesign(d, KNOWN_TYPES).ok).toBe(false)
  })
  it('모르는 블록은 지우지 않고 알려 준다', () => {
    const d = ok()
    d.items[0].type = 'future-block'
    const r = validateDesign(d, KNOWN_TYPES)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.unknownTypes).toEqual(['future-block'])
      expect(r.design.items.length).toBe(d.items.length)
    }
  })
})

describe('편집 동작', () => {
  it('끌어 놓은 블록은 격자 위, 아트보드 안에 생긴다', () => {
    const d = newDesign()
    const r = ops.addBlock(d, 'kpi', { x: 1437, y: 13 })!
    const it0 = r.design.items[0]
    expect(it0.x % g).toBe(0)
    expect(it0.y % g).toBe(0)
    expect(it0.x + it0.w).toBeLessThanOrEqual(d.artboard.w)
  })
  it('같은 자리에 또 추가하면 비켜 놓는다', () => {
    let d = newDesign()
    d = ops.addBlock(d, 'button', { x: 100, y: 100 })!.design
    d = ops.addBlock(d, 'button', { x: 100, y: 100 })!.design
    expect(d.items[1].x).toBe(d.items[0].x + CONFIG.addOffset)
  })
  it('아트보드를 폰으로 바꾸면 넘치는 블록을 새 폭 안으로 들인다', () => {
    const d = ops.setArtboard(dashboardPreset(), { kind: 'phone' })
    expect(d.artboard.w).toBe(CONFIG.artboards.phone.w)
    for (const it of d.items) expect(it.x + it.w).toBeLessThanOrEqual(d.artboard.w)
  })
  it('아트보드 높이는 가장 아래 블록보다 작게 줄지 않는다', () => {
    const d = ops.setArtboard(dashboardPreset(), { h: 300 })
    expect(d.artboard.h).toBe(minArtboardH(d))
  })
  it('잠근 블록은 화살표로 움직이지 않는다', () => {
    let d = dashboardPreset()
    d = ops.patchItem(d, d.items[3].id, { locked: true })
    const moved = ops.nudge(d, [d.items[3].id], 8, 0)
    expect(moved.items[3].x).toBe(d.items[3].x)
  })
  it('복제는 24px 비켜 맨 위에 놓는다', () => {
    const d = dashboardPreset()
    const r = ops.cloneItems(d, [d.items[3]], ['copy1'])
    const c = r.design.items[r.design.items.length - 1]
    expect(c.id).toBe('copy1')
    expect(c.x).toBe(d.items[3].x + CONFIG.addOffset)
  })
})

describe('스냅', () => {
  const art = { w: 1440, h: 1024 }
  it('이동 결과는 늘 격자 배수', () => {
    for (let i = 0; i < 200; i++) {
      const r = { x: Math.random() * 1000, y: Math.random() * 800, w: 264, h: 136 }
      const others = [{ x: 272, y: 144, w: 264, h: 136 }, { x: 600, y: 300, w: 400, h: 200 }]
      const s = snapMove(r, others, art, 6, true).rect
      expect(s.x % g).toBe(0)
      expect(s.y % g).toBe(0)
    }
  })
  it('가장자리가 가까우면 안내선에 붙는다', () => {
    const s = snapMove({ x: 275, y: 400, w: 120, h: 80 }, [{ x: 272, y: 144, w: 264, h: 136 }], art, 6, true)
    expect(s.rect.x).toBe(272)
    expect(s.guides.some((g) => g.axis === 'x' && g.at === 272)).toBe(true)
  })
  it('크기 조절은 최소 크기와 아트보드를 지킨다', () => {
    const min = getBlock('kpi')!.minSize
    const r = resizeRect({ x: 100, y: 100, w: 264, h: 136 }, 'se', -500, -500, min, art)
    expect(r.w).toBe(min.w)
    expect(r.h).toBe(min.h)
    const big = resizeRect({ x: 1200, y: 100, w: 200, h: 136 }, 'e', 900, 0, min, art)
    expect(big.x + big.w).toBeLessThanOrEqual(art.w)
    expect(big.w % g).toBe(0)
    const nw = resizeRect({ x: 104, y: 104, w: 264, h: 136 }, 'nw', -13, -13, min, art)
    expect(nw.x % g).toBe(0)
    expect(nw.x + nw.w).toBe(104 + 264)
  })
})

describe('프리셋·AI 사양서', () => {
  it('모든 고정 설계가 검사기를 통과하고 JSON 왕복이 같다', () => {
    for (const [name, make] of Object.entries(FIXTURES)) {
      const d = make()
      const r = validateDesign(JSON.parse(JSON.stringify(d)), KNOWN_TYPES)
      expect(r.ok, name).toBe(true)
      if (r.ok) expect(r.design).toEqual(d)
      for (const it of d.items) {
        expect(it.x + it.w, `${name} ${it.type}`).toBeLessThanOrEqual(d.artboard.w)
        expect(it.y + it.h, `${name} ${it.type}`).toBeLessThanOrEqual(d.artboard.h)
      }
    }
  })
  it('전체 블록 설계에 모든 블록이 들어 있다', () => {
    expect(new Set(allBlocksFixture().items.map((i) => i.type)).size).toBe(KNOWN_TYPES.size)
  })
  it('AI 사양서에 모든 블록 이름과 지시 문단이 들어간다', () => {
    const d = dashboardPreset()
    const md = buildAiSpec(d)
    for (const it of d.items) expect(md).toContain(getBlock(it.type)!.name)
    expect(md).toContain('## 만들어 주세요')
    expect(md).toContain('반응형')
  })
})

describe('교차 리뷰 지적 회귀', () => {
  it('밖에서 온 숫자 속성은 정의 범위로 줄인다(스켈레톤 rows 1억 → 8)', async () => {
    const { sanitizeProps } = await import('../src/blocks/registry')
    const def = getBlock('skeleton')!
    expect(sanitizeProps(def, { rows: 100_000_000 }).rows).toBe(8)
    expect(sanitizeProps(def, { rows: 'x' as unknown as number }).rows).toBe(def.defaults.rows)
    expect(sanitizeProps(getBlock('button')!, { variant: 'evil' }).variant).toBe('primary')
  })
  it('잠긴 블록은 속성 패널 값으로도 움직이지 않고, 잠금 해제는 된다', () => {
    let d = dashboardPreset()
    const id = d.items[3].id
    d = ops.patchItem(d, id, { locked: true })
    const moved = ops.patchItem(d, id, { x: 0, w: 400 })
    expect(moved.items[3].x).toBe(d.items[3].x)
    expect(moved.items[3].w).toBe(d.items[3].w)
    expect(ops.patchItem(d, id, { locked: undefined }).items[3].locked).toBeUndefined()
  })
  it('여러 개를 화살표로 옮길 때 간격을 유지한다', () => {
    let d = newDesign()
    d = { ...d, items: [{ id: 'a', type: 'button', x: 0, y: 0, w: 160, h: 48, props: {} }, { id: 'b', type: 'button', x: 80, y: 80, w: 160, h: 48, props: {} }] }
    const n = ops.nudge(d, ['a', 'b'], -8, 0)
    expect(n.items.map((i) => i.x)).toEqual([0, 80])
  })
})

describe('교차 리뷰 2차 회귀', () => {
  it('잠긴 블록은 locked:true와 함께 온 위치 변경도 무시하고, 다른 변경으로 크기가 바뀌지 않는다', () => {
    let d = dashboardPreset()
    const id = d.items[3].id
    d = { ...d, items: d.items.map((it) => (it.id === id ? { ...it, w: 40, h: 40, locked: true } : it)) }
    const a = ops.patchItem(d, id, { locked: true, x: 0 })
    expect(a.items[3].x).toBe(d.items[3].x)
    const b = ops.patchItem(d, id, { hidden: true })
    expect([b.items[3].w, b.items[3].h]).toEqual([40, 40])
  })
})
