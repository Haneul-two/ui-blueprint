import { Chart } from '../vendor/stageshow/chart'
import { Meter } from '../vendor/stageshow/parts/Meter'
import { Avatar } from '../vendor/stageshow/parts/Avatar'
import { Icon } from '../ui/Icon'
import type { ReactNode } from 'react'
import { asBool, asList, asNums, asStr, pair, useSize } from './shared'
import type { BlockDef } from './types'

const kpi: BlockDef = {
  type: 'kpi',
  name: 'KPI 카드',
  category: 'data',
  icon: 'gauge',
  size: { w: 280, h: 136 },
  minSize: { w: 160, h: 96 },
  props: [
    { key: 'label', label: '이름', kind: 'text' },
    { key: 'value', label: '값', kind: 'text' },
    { key: 'delta', label: '변화(예: +12%)', kind: 'text' },
    { key: 'spark', label: '작은 선 그래프 값(쉼표)', kind: 'text' },
  ],
  defaults: { label: '이번 주 활성 사용자', value: '12,480', delta: '+8.2%', spark: '4,6,5,8,7,9,11' },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Chart(스파크라인)',
  Render({ props }) {
    const [ref, size] = useSize<HTMLDivElement>()
    const d = asStr(props.delta)
    const down = d.trim().startsWith('-')
    const data = asNums(props.spark)
    return (
      <div className="bk-kpi">
        <span className="bk-kpi__label">{asStr(props.label)}</span>
        <strong className="bk-kpi__value">{asStr(props.value)}</strong>
        {d && (
          <span className="bk-kpi__delta" data-down={down || undefined}>
            <Icon name={down ? 'arrow-down' : 'arrow-up'} size={12} />
            {d.replace(/^[+-]/, '')}
          </span>
        )}
        <div className="bk-kpi__spark" ref={ref} aria-hidden="true">
          {data.length > 1 && size.w > 0 && <Chart data={data} width={size.w} height={size.h} area={false} dot={false} />}
        </div>
      </div>
    )
  },
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="bk-card bk-chart">
      <div className="bk-card__head">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

const lineChart: BlockDef = {
  type: 'line-chart',
  name: '선 차트',
  category: 'data',
  icon: 'trending',
  size: { w: 560, h: 280 },
  minSize: { w: 240, h: 160 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'sub', label: '보조 글', kind: 'text' },
    { key: 'data', label: '값(쉼표)', kind: 'text' },
    { key: 'area', label: '아래 채우기', kind: 'toggle' },
  ],
  defaults: { title: '노트 작성 수', sub: '최근 12주', data: '32,40,38,52,48,61,58,70,66,79,84,92', area: true },
  interactive: false,
  motion: true,
  source: 'stageshow 키트 Chart(선)',
  describe: () => '처음 보일 때 선이 그려지며 나타난다.',
  Render({ props }) {
    const [ref, size] = useSize<HTMLDivElement>()
    const data = asNums(props.data)
    return (
      <ChartCard title={asStr(props.title)} sub={asStr(props.sub)}>
        <div className="bk-chart__plot" ref={ref} role="img" aria-label={`${asStr(props.title)} 선 차트`}>
          {data.length > 1 && size.w > 0 && <Chart data={data} width={size.w} height={size.h} area={asBool(props.area)} />}
        </div>
      </ChartCard>
    )
  },
}

const barChart: BlockDef = {
  type: 'bar-chart',
  name: '막대 차트',
  category: 'data',
  icon: 'bar-chart',
  size: { w: 560, h: 280 },
  minSize: { w: 240, h: 160 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'sub', label: '보조 글', kind: 'text' },
    { key: 'data', label: '값(쉼표)', kind: 'text' },
  ],
  defaults: { title: '요일별 방문', sub: '이번 주', data: '42,58,64,51,72,38,30' },
  interactive: false,
  motion: true,
  source: 'stageshow 키트 Chart(막대)',
  describe: () => '처음 보일 때 막대가 자라며 나타난다.',
  Render({ props }) {
    const [ref, size] = useSize<HTMLDivElement>()
    const data = asNums(props.data)
    return (
      <ChartCard title={asStr(props.title)} sub={asStr(props.sub)}>
        <div className="bk-chart__plot" ref={ref} role="img" aria-label={`${asStr(props.title)} 막대 차트`}>
          {data.length > 0 && size.w > 0 && <Chart kind="bars" data={data} width={size.w} height={size.h} />}
        </div>
      </ChartCard>
    )
  },
}

const DONUT_COLORS = ['var(--ss-accent)', 'color-mix(in srgb, var(--ss-accent) 55%, var(--ss-surface))', 'color-mix(in srgb, var(--ss-accent) 25%, var(--ss-surface))', 'var(--ss-fill)']

const donut: BlockDef = {
  type: 'donut',
  name: '도넛 차트',
  category: 'data',
  icon: 'pie-chart',
  size: { w: 360, h: 240 },
  minSize: { w: 240, h: 160 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'parts', label: '조각(이름|값), 최대 4개', kind: 'list' },
  ],
  defaults: { title: '사용 기기', parts: ['데스크톱|54', '휴대폰|33', '태블릿|13'] },
  interactive: false,
  motion: false,
  source: '기본 도넛 차트',
  Render({ props }) {
    const parts = asList(props.parts).slice(0, 4).map(pair).map(([n, v]) => ({ n, v: Math.max(0, Number(v) || 0) }))
    const total = parts.reduce((s, p) => s + p.v, 0) || 1
    const r = 15.9155
    let acc = 0
    return (
      <div className="bk-card bk-donut">
        <div className="bk-card__head">
          <strong>{asStr(props.title)}</strong>
        </div>
        <div className="bk-donut__body">
          <svg viewBox="0 0 42 42" role="img" aria-label={`${asStr(props.title)} 도넛 차트`}>
            <circle cx="21" cy="21" r={r} fill="none" stroke="var(--ss-fill)" strokeWidth="6" />
            {parts.map((p, i) => {
              const len = (p.v / total) * 100
              const el = (
                <circle key={i} cx="21" cy="21" r={r} fill="none" stroke={DONUT_COLORS[i]} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - acc} />
              )
              acc += len
              return el
            })}
          </svg>
          <ul>
            {parts.map((p, i) => (
              <li key={i}>
                <span className="bk-dot" style={{ background: DONUT_COLORS[i] }} aria-hidden="true" />
                {p.n}
                <b>{Math.round((p.v / total) * 100)}%</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  },
}

const table: BlockDef = {
  type: 'table',
  name: '표',
  category: 'data',
  icon: 'table',
  size: { w: 720, h: 288 },
  minSize: { w: 320, h: 120 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'columns', label: '열 이름(쉼표)', kind: 'text' },
    { key: 'rows', label: '행(값을 쉼표로)', kind: 'list' },
    { key: 'status', label: '마지막 열을 상태 배지로', kind: 'toggle' },
  ],
  defaults: {
    title: '최근 노트',
    columns: '제목,작성자,수정일,상태',
    rows: ['3분기 회고,김하늘,11월 2일,공유됨', '신규 기능 기획,이도윤,11월 1일,작성 중', '고객 인터뷰 정리,박서연,10월 30일,검토 중', '주간 회의록,최지우,10월 28일,공유됨'],
    status: true,
  },
  interactive: false,
  motion: false,
  source: 'stageshow table-edit 예시의 행 높이·위계 참고',
  Render({ props }) {
    const cols = asStr(props.columns).split(',').map((s) => s.trim())
    const rows = asList(props.rows).map((r) => r.split(',').map((s) => s.trim()))
    const badge = asBool(props.status)
    return (
      <div className="bk-card bk-table">
        {asStr(props.title) && (
          <div className="bk-card__head">
            <strong>{asStr(props.title)}</strong>
          </div>
        )}
        <table>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((_, j) => (
                  <td key={j}>
                    {badge && j === cols.length - 1 ? <span className="bk-badge" data-tone={toneOf(r[j] ?? '')}>{r[j]}</span> : r[j]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
}

function toneOf(s: string): string {
  if (/완료|공유|성공|정상/.test(s)) return 'success'
  if (/오류|실패|중단/.test(s)) return 'danger'
  if (/검토|대기|보류/.test(s)) return 'warning'
  return 'neutral'
}

const progress: BlockDef = {
  type: 'progress',
  name: '진행 막대',
  category: 'data',
  icon: 'rows',
  size: { w: 360, h: 184 },
  minSize: { w: 200, h: 64 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'items', label: '항목(이름|0~100)', kind: 'list' },
  ],
  defaults: { title: '분기 목표', items: ['신규 가입|72', '유료 전환|45', '이탈 줄이기|88'] },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Meter',
  Render({ props }) {
    const items = asList(props.items).map(pair)
    return (
      <div className="bk-card bk-progress">
        {asStr(props.title) && (
          <div className="bk-card__head">
            <strong>{asStr(props.title)}</strong>
          </div>
        )}
        {items.map(([n, v], i) => {
          const val = Math.max(0, Math.min(100, Number(v) || 0))
          return (
            <div key={i} className="bk-progress__row">
              <span>{n}</span>
              <b>{val}%</b>
              <Meter value={val / 100} />
            </div>
          )
        })}
      </div>
    )
  },
}

const activity: BlockDef = {
  type: 'activity',
  name: '활동 피드',
  category: 'data',
  icon: 'activity',
  size: { w: 360, h: 288 },
  minSize: { w: 240, h: 120 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'items', label: '항목(이름|내용|시간)', kind: 'list' },
  ],
  defaults: {
    title: '최근 활동',
    items: ['김하늘|3분기 회고를 공유했습니다|방금', '이도윤|일정 2개를 옮겼습니다|12분 전', '박서연|댓글을 남겼습니다|1시간 전', '최지우|새 노트를 만들었습니다|어제'],
  },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Avatar',
  Render({ props }) {
    const items = asList(props.items).map((l) => l.split('|').map((s) => s.trim()))
    return (
      <div className="bk-card bk-activity">
        <div className="bk-card__head">
          <strong>{asStr(props.title)}</strong>
        </div>
        <ul>
          {items.map(([n, t, time], i) => (
            <li key={i}>
              <Avatar name={n} size={28} />
              <p>
                <b>{n}</b> {t}
              </p>
              <time>{time}</time>
            </li>
          ))}
        </ul>
      </div>
    )
  },
}

export const dataBlocks = [kpi, lineChart, barChart, donut, table, progress, activity]
