import { describe, expect, it } from 'vitest'
import { KNOWN_TYPES } from '../src/blocks/registry'
import { validateDesign } from '../src/model/validate'
import { themeVars } from '../src/app/Artboard'
import { FONTS, fontOf, isFontId } from '../src/app/fonts'
import { buildAiSpec } from '../src/io/aiSpec'
import { contrast } from '../src/editor/ThemePanel'
import { FIXTURES } from '../src/presets'

const withTheme = (theme: Record<string, unknown>) => ({ ...FIXTURES.dashboard(), theme: { ...FIXTURES.dashboard().theme, ...theme } })
const check = (theme: Record<string, unknown>) => {
  const r = validateDesign(withTheme(theme), KNOWN_TYPES)
  if (!r.ok) throw new Error(r.error)
  return r.design.theme
}

describe('테마: 글꼴', () => {
  it('글꼴 12종, id가 겹치지 않고 모두 이름·글꼴 이름이 있다', () => {
    expect(FONTS.length).toBe(12)
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length)
    for (const f of FONTS) expect(f.label && f.face && f.family.includes(',')).toBeTruthy()
  })
  it('예전 설계의 글꼴 값(sans·serif·mono)은 그대로 읽힌다', () => {
    for (const id of ['sans', 'serif', 'mono']) expect(check({ font: id }).font).toBe(id)
  })
  it('모르는 글꼴은 기본(sans)으로', () => {
    expect(check({ font: 'comic' }).font).toBe('sans')
    expect(check({ font: '__proto__' }).font).toBe('sans')
    expect(isFontId('toString')).toBe(false)
    expect(fontOf('없음').id).toBe('sans')
  })
  it('고른 글꼴이 아트보드 CSS 변수에 들어간다', () => {
    expect(themeVars({ ...FIXTURES.dashboard().theme, font: 'jua' })['--ss-font']).toContain('Jua')
  })
})

describe('테마: 바탕', () => {
  it('바탕색·면 색·무늬를 읽고, 잘못된 값은 버린다', () => {
    const t = check({ canvas: '#eef4ff', surface: '#ffffff', pattern: 'dots' })
    expect([t.canvas, t.surface, t.pattern]).toEqual(['#eef4ff', '#ffffff', 'dots'])
    const bad = check({ canvas: 'red; background:url(x)', surface: '#12', pattern: 'stripes' })
    expect('canvas' in bad || 'surface' in bad || 'pattern' in bad).toBe(false)
  })
  it('없으면 키 자체가 없다(예전 설계와 같은 모양)', () => {
    const t = check({})
    expect(Object.keys(t).sort()).toEqual(['accent', 'density', 'font', 'mode', 'radius'])
  })
  it('바탕색·면 색은 CSS 변수로, 없으면 넣지 않는다', () => {
    const base = FIXTURES.dashboard().theme
    expect(themeVars({ ...base, canvas: '#000000', surface: '#111111' })).toMatchObject({ '--ss-canvas': '#000000', '--ss-surface': '#111111' })
    expect('--ss-canvas' in themeVars(base)).toBe(false)
  })
  it('AI 사양서에 글꼴 이름과 배경이 적힌다', () => {
    const spec = buildAiSpec({ ...FIXTURES.dashboard(), theme: { ...FIXTURES.dashboard().theme, font: 'gowun-batang', canvas: '#f4f1ea', pattern: 'grid' } })
    expect(spec).toContain('고운바탕')
    expect(spec).toContain('바탕색 #f4f1ea')
    expect(spec).toContain('무늬 격자')
  })
  it('대비 계산: 흰 바탕과 검정은 21:1', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })
})
