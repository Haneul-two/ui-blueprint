import { CONFIG } from '../config'
import { DEFAULT_THEME } from './design'
import { isFontId } from '../app/fonts'
import type { Design, Item, Props, PropValue } from './types'

export type ValidateResult =
  | { ok: true; design: Design; unknownTypes: string[] }
  | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const HEX = /^#[0-9a-f]{6}$/i

function checkProps(p: unknown): Props | string {
  if (!isObj(p)) return '블록 속성 형식이 잘못되었습니다.'
  const out: Props = {}
  for (const [k, v] of Object.entries(p)) {
    if (k.length > 40) return '속성 이름이 너무 깁니다.'
    let val: PropValue
    if (typeof v === 'string') {
      if (v.length > CONFIG.limits.string) return `글자가 ${CONFIG.limits.string}자를 넘는 속성이 있습니다.`
      val = v
    } else if (typeof v === 'number') {
      if (!Number.isFinite(v)) return '숫자 속성이 잘못되었습니다.'
      val = v
    } else if (typeof v === 'boolean') val = v
    else if (Array.isArray(v)) {
      if (v.length > CONFIG.limits.list) return `목록 항목이 ${CONFIG.limits.list}개를 넘습니다.`
      if (!v.every((s) => typeof s === 'string' && s.length <= CONFIG.limits.string)) return '목록 속성이 잘못되었습니다.'
      val = v as string[]
    } else return '지원하지 않는 속성 값이 있습니다.'
    out[k] = val
  }
  return out
}

/** 밖에서 들어온 설계(JSON 파일·공유 링크)를 검사한다. knownTypes에 없는 블록은 지우지 않고 알려 준다. */
export function validateDesign(input: unknown, knownTypes: Set<string>): ValidateResult {
  if (!isObj(input)) return { ok: false, error: '설계 파일 형식이 아닙니다.' }
  if (input.v !== 1) return { ok: false, error: '이 버전에서 열 수 없는 설계입니다.' }
  const ab = input.artboard
  if (!isObj(ab) || !(typeof ab.kind === 'string' && ab.kind in CONFIG.artboards))
    return { ok: false, error: '아트보드 정보가 잘못되었습니다.' }
  if (!isNum(ab.w, 200, 4000) || !isNum(ab.h, CONFIG.artboardMinH, CONFIG.artboardMaxH))
    return { ok: false, error: '아트보드 크기가 허용 범위를 벗어났습니다.' }
  if (!Array.isArray(input.items)) return { ok: false, error: '블록 목록이 없습니다.' }
  if (input.items.length > CONFIG.limits.items) return { ok: false, error: `블록이 ${CONFIG.limits.items}개를 넘습니다.` }

  const items: Item[] = []
  const unknown = new Set<string>()
  const ids = new Set<string>()
  for (const raw of input.items) {
    if (!isObj(raw)) return { ok: false, error: '블록 형식이 잘못되었습니다.' }
    if (typeof raw.id !== 'string' || raw.id.length > 40 || ids.has(raw.id)) return { ok: false, error: '블록 id가 잘못되었습니다.' }
    if (typeof raw.type !== 'string' || raw.type.length > 40) return { ok: false, error: '블록 종류가 잘못되었습니다.' }
    const { x, y, w, h } = raw
    if (!isNum(x, 0, 4000) || !isNum(y, 0, CONFIG.artboardMaxH) || !isNum(w, 1, 4000) || !isNum(h, 1, CONFIG.artboardMaxH))
      return { ok: false, error: '블록 위치나 크기가 허용 범위를 벗어났습니다.' }
    const props = checkProps(raw.props ?? {})
    if (typeof props === 'string') return { ok: false, error: props }
    ids.add(raw.id)
    if (!knownTypes.has(raw.type)) unknown.add(raw.type)
    items.push({ id: raw.id, type: raw.type, x, y, w, h, props, hidden: raw.hidden === true || undefined, locked: raw.locked === true || undefined })
  }

  const t = isObj(input.theme) ? input.theme : {}
  const theme = {
    mode: t.mode === 'dark' ? 'dark' : 'light',
    accent: typeof t.accent === 'string' && HEX.test(t.accent) ? t.accent : DEFAULT_THEME.accent,
    radius: isNum(t.radius, 0, 32) ? t.radius : DEFAULT_THEME.radius,
    font: isFontId(t.font) ? t.font : 'sans',
    density: t.density === 'compact' || t.density === 'roomy' ? t.density : 'normal',
    canvas: typeof t.canvas === 'string' && HEX.test(t.canvas) ? t.canvas : undefined,
    surface: typeof t.surface === 'string' && HEX.test(t.surface) ? t.surface : undefined,
    pattern: t.pattern === 'dots' || t.pattern === 'grid' || t.pattern === 'glow' ? t.pattern : undefined,
  } as Design['theme']
  // 비어 있는 선택 값은 키째 뺀다(저장 파일을 깔끔하게, 예전 설계와 같은 모양으로).
  for (const k of ['canvas', 'surface', 'pattern'] as const) if (theme[k] === undefined) delete theme[k]

  const name = typeof input.name === 'string' ? input.name.slice(0, CONFIG.limits.name) : '불러온 설계'
  const design: Design = {
    v: 1,
    id: typeof input.id === 'string' && input.id.length <= 40 ? input.id : 'imported',
    name: name || '불러온 설계',
    updatedAt: isNum(input.updatedAt, 0, 1e15) ? input.updatedAt : Date.now(),
    artboard: { kind: ab.kind as Design['artboard']['kind'], w: ab.w, h: ab.h },
    theme,
    items,
  }
  return { ok: true, design, unknownTypes: [...unknown] }
}
