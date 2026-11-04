import { CONFIG, type ArtboardKind } from '../config'
import { BLOCKS, defaultProps, getBlock } from '../blocks/registry'
import { DEFAULT_THEME } from '../model/design'
import type { Design, Item, Props } from '../model/types'

type Spec = [type: string, x: number, y: number, w: number, h: number, props?: Props]

function make(id: string, name: string, kind: ArtboardKind, h: number, specs: Spec[]): Design {
  const items: Item[] = specs.map(([type, x, y, w, hh, props], i) => {
    const def = getBlock(type)
    if (!def) throw new Error(`프리셋에 없는 블록: ${type}`)
    return { id: `${id}-${i + 1}`, type, x, y, w, h: hh, props: { ...defaultProps(def), ...props } }
  })
  return { v: 1, id, name, updatedAt: 0, artboard: { kind, w: CONFIG.artboards[kind].w, h }, theme: { ...DEFAULT_THEME }, items }
}

export const dashboardPreset = (): Design =>
  make('preset-dashboard', '팀 대시보드', 'desktop', 1024, [
    ['sidebar', 0, 0, 240, 1024],
    ['section-title', 272, 32, 720, 88],
    ['search', 1008, 56, 400, 48],
    ['kpi', 272, 144, 264, 136],
    ['kpi', 552, 144, 264, 136, { label: '새 노트', value: '1,284', delta: '+12%', spark: '3,5,4,6,8,7,10' }],
    ['kpi', 832, 144, 264, 136, { label: '공유된 노트', value: '342', delta: '-3.1%', spark: '9,8,8,7,7,6,6' }],
    ['kpi', 1112, 144, 296, 136, { label: '평균 응답 시간', value: '2.4시간', delta: '-18%', spark: '9,8,7,7,5,5,4' }],
    ['line-chart', 272, 304, 704, 320],
    ['donut', 992, 304, 416, 320],
    ['table', 272, 648, 704, 312],
    ['activity', 992, 648, 416, 312],
  ])

export const landingPreset = (): Design =>
  make('preset-landing', '서비스 소개 페이지', 'desktop', 2600, [
    ['navbar', 0, 0, 1440, 64],
    ['hero', 0, 64, 1440, 560],
    ['marquee', 0, 656, 1440, 72],
    ['section-title', 400, 784, 640, 104, { title: '기록을 일로 바꾸는 세 가지', sub: '쓰는 순간부터 정리되는 노트', align: 'center' }],
    ['feature-card', 104, 920, 400, 200],
    ['feature-card', 520, 920, 400, 200, { icon: 'calendar', title: '노트에서 바로 일정', body: '회의록 안 날짜를 누르면 참석자 일정에 바로 들어갑니다.' }],
    ['feature-card', 936, 920, 400, 200, { icon: 'lock', title: '볼 사람만 보기', body: '노트마다 공개 범위를 정하고 기록을 남깁니다.' }],
    ['bento', 104, 1160, 1232, 480],
    ['testimonial', 104, 1688, 608, 248],
    ['testimonial', 728, 1688, 608, 248, { quote: '주간 보고를 따로 쓰지 않아요. 한 주 노트가 알아서 모입니다.', name: '한지민', role: '마케팅 팀장' }],
    ['pricing', 240, 1960, 960, 440],
    ['footer', 0, 2440, 1440, 160],
  ])

export const appPreset = (): Design =>
  make('preset-app', '모바일 앱 홈', 'phone', 844, [
    ['section-title', 16, 24, 352, 80, { title: '좋은 아침이에요', sub: '오늘 확인할 노트가 3개 있습니다.' }],
    ['search', 16, 112, 352, 48],
    ['segmented', 16, 176, 352, 40, { items: ['전체', '내 노트', '공유됨'], value: 1 }],
    ['kpi', 16, 232, 168, 120, { label: '오늘 쓴 노트', value: '4', delta: '+2', spark: '' }],
    ['kpi', 200, 232, 168, 120, { label: '남은 할 일', value: '7', delta: '-1', spark: '' }],
    ['checklist', 16, 368, 352, 224, { title: '오늘 할 일' }],
    ['toast', 16, 608, 352, 152],
  ])

export const PRESETS = [
  { id: 'dashboard', make: dashboardPreset, desc: '사이드바, KPI 4개, 차트, 표가 있는 업무 대시보드' },
  { id: 'landing', make: landingPreset, desc: '히어로, 기능 카드, 가격표, 푸터로 된 소개 페이지' },
  { id: 'app', make: appPreset, desc: '검색, 요약 카드, 할 일 목록이 있는 휴대폰 화면' },
]

/** 회귀 확인용: 모든 블록을 기본 크기로 줄지어 놓은 설계. */
export function allBlocksFixture(): Design {
  const W = CONFIG.artboards.desktop.w
  const gap = 32
  let x = gap
  let y = gap
  let rowH = 0
  const specs: Spec[] = []
  // 높이순으로 줄을 채워 빈 곳을 줄인다(그냥 순서대로면 최대 높이를 넘는다).
  for (const b of [...BLOCKS].sort((a, c) => c.size.h - a.size.h)) {
    const w = Math.min(b.size.w, W - gap * 2)
    if (x + w > W - gap) {
      x = gap
      y += rowH + gap
      rowH = 0
    }
    specs.push([b.type, x, y, w, b.size.h])
    x += w + gap
    rowH = Math.max(rowH, b.size.h)
  }
  const h = Math.min(CONFIG.artboardMaxH, Math.ceil((y + rowH + gap) / CONFIG.grid) * CONFIG.grid)
  return make('fixture-all', '전체 블록 (회귀 확인용)', 'desktop', h, specs)
}

export const FIXTURES: Record<string, () => Design> = {
  dashboard: dashboardPreset,
  landing: landingPreset,
  app: appPreset,
  'all-blocks': allBlocksFixture,
}
