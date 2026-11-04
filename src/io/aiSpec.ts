import { getBlock } from '../blocks/registry'
import { readingOrder } from '../model/design'
import type { Design, PropValue } from '../model/types'
import { CONFIG } from '../config'
import { fontOf } from '../app/fonts'

const PATTERN_LABEL = { none: '없음', dots: '점', grid: '격자', glow: '강조색 은은한 빛' }
const DENSITY_LABEL = { compact: '촘촘하게', normal: '보통', roomy: '여유 있게' }

function fmt(v: PropValue): string {
  if (Array.isArray(v)) return v.length ? v.map((x) => `\n    - ${x}`).join('') : '(없음)'
  if (typeof v === 'boolean') return v ? '예' : '아니오'
  return String(v).replace(/\n/g, ' / ')
}

/** AI에게 이 화면을 만들어 달라고 넘길 Markdown 사양서. */
export function buildAiSpec(d: Design): string {
  const t = d.theme
  const out: string[] = []
  out.push(`# ${d.name}`, '')
  out.push('## 화면', '')
  out.push(`- 아트보드: ${CONFIG.artboards[d.artboard.kind].label} ${d.artboard.w}×${d.artboard.h}px`)
  const f = fontOf(t.font)
  out.push(`- 테마: ${t.mode === 'dark' ? '어두운' : '밝은'} 화면, 강조색 ${t.accent}, 모서리 ${t.radius}px, 글꼴 ${f.label}(${f.group}, CSS: ${f.face}), 간격 ${DENSITY_LABEL[t.density]}`)
  if (t.canvas || t.surface || (t.pattern && t.pattern !== 'none'))
    out.push(`- 배경: ${[t.canvas && `바탕색 ${t.canvas}`, t.surface && `카드 면 색 ${t.surface}`, t.pattern && t.pattern !== 'none' && `무늬 ${PATTERN_LABEL[t.pattern]}`].filter(Boolean).join(', ')}`)
  out.push(`- 블록 ${d.items.filter((i) => !i.hidden).length}개 (위→아래, 왼→오 순서)`, '')
  out.push('## 블록', '')
  let n = 0
  for (const it of readingOrder(d.items)) {
    if (it.hidden) continue
    const def = getBlock(it.type)
    n++
    out.push(`### ${n}. ${def?.name ?? `알 수 없는 블록(${it.type})`}`)
    out.push(`- 종류: \`${it.type}\``)
    out.push(`- 위치·크기: x ${it.x}, y ${it.y}, 폭 ${it.w}, 높이 ${it.h}`)
    if (def) {
      const props = { ...def.defaults, ...it.props }
      for (const f of def.props) out.push(`- ${f.label}: ${fmt(props[f.key])}`)
      const how = def.describe?.(props)
      if (how) out.push(`- 동작: ${how}`)
      else if (def.interactive) out.push('- 동작: 기본 상호작용(누르기·입력)을 지원한다.')
    }
    out.push('')
  }
  out.push('## 만들어 주세요', '')
  out.push(
    '좌표는 이 아트보드 폭 기준의 시안 배치다. 같은 배치를 기준 화면으로 삼아 React/HTML로 구현하되, 좁은 화면에서는 위→아래 순서로 쌓이는 반응형으로 만들어 주세요. 위에 적힌 동작은 실제로 동작하게 하고, 키보드 조작·움직임 줄이기 설정을 지원해 주세요.',
  )
  return out.join('\n')
}
