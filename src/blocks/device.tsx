import { Window, Bar } from '../vendor/stageshow/window'
import { Phone } from '../vendor/stageshow/phone'
import { useLook } from '../vendor/stageshow/looks'
import { useTick, asList, asStr, useSize } from './shared'
import type { BlockDef } from './types'

const SCREENS = [
  { value: 'dashboard', label: '대시보드' },
  { value: 'doc', label: '문서' },
  { value: 'list', label: '목록' },
]

/** 기기 틀 안 화면: 글자 대신 자리표시 막대로 그린다(stageshow의 filler 원칙). */
function FauxScreen({ kind, title }: { kind: string; title: string }) {
  if (kind === 'doc')
    return (
      <div className="bk-faux bk-faux--doc">
        <strong>{title}</strong>
        {[92, 84, 88, 60, 0, 90, 76, 82, 40].map((w, i) => (w ? <Bar key={i} w={`${w}%`} h={7} tone={2} /> : <span key={i} className="bk-faux__gap" />))}
      </div>
    )
  if (kind === 'list')
    return (
      <div className="bk-faux bk-faux--list">
        <strong>{title}</strong>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bk-faux__row">
            <span className="bk-faux__av" />
            <Bar w={`${60 - i * 5}%`} h={7} tone={3} />
            <Bar w={48} h={7} tone={2} />
          </div>
        ))}
      </div>
    )
  return (
    <div className="bk-faux bk-faux--dash">
      <strong>{title}</strong>
      <div className="bk-faux__kpis">
        {[0, 1, 2].map((i) => (
          <span key={i} className="bk-faux__kpi">
            <Bar w={40} h={6} tone={2} />
            <b />
          </span>
        ))}
      </div>
      <div className="bk-faux__chart">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 50 C 30 44, 40 30, 70 34 S 120 14, 150 20 S 190 8, 200 6" />
        </svg>
      </div>
    </div>
  )
}

const browser: BlockDef = {
  type: 'browser',
  name: '브라우저 창',
  category: 'device',
  icon: 'monitor',
  size: { w: 720, h: 440 },
  minSize: { w: 320, h: 200 },
  props: [
    { key: 'url', label: '주소', kind: 'text' },
    { key: 'title', label: '화면 제목', kind: 'text' },
    { key: 'screen', label: '안 화면', kind: 'select', options: SCREENS },
  ],
  defaults: { url: 'haru-note.app/team', title: '팀 대시보드', screen: 'dashboard' },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Window',
  describe: (p) => `브라우저 창 틀 안에 ${SCREENS.find((s) => s.value === p.screen)?.label ?? ''} 화면을 자리표시로 보여 준다.`,
  Render({ props }) {
    return (
      <div className="bk-device">
        <Window chrome="card" url={asStr(props.url)}>
          <FauxScreen kind={asStr(props.screen, 'dashboard')} title={asStr(props.title)} />
        </Window>
      </div>
    )
  },
}

const phone: BlockDef = {
  type: 'phone',
  name: '휴대폰',
  category: 'device',
  icon: 'smartphone',
  size: { w: 280, h: 560 },
  minSize: { w: 160, h: 320 },
  props: [
    { key: 'title', label: '화면 제목', kind: 'text' },
    { key: 'screen', label: '안 화면', kind: 'select', options: SCREENS },
    { key: 'time', label: '상태 막대 시각', kind: 'text' },
  ],
  defaults: { title: '오늘의 노트', screen: 'list', time: '9:41' },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Phone(특정 제조사 모양이 아닌 기본 틀)',
  Render({ props }) {
    const [ref, size] = useSize<HTMLDivElement>()
    const { theme } = useLook()
    // 틀 비율(대략 1:2.05)에 맞춰 상자 안에 들어가는 폭을 고른다.
    const w = Math.floor(Math.min(size.w, size.h / 2.05))
    return (
      <div className="bk-device bk-device--phone" ref={ref}>
        {w > 40 && (
          <Phone width={w} frame="soft" island={false} dark={theme === 'dark'} time={asStr(props.time, '9:41')}>
            <FauxScreen kind={asStr(props.screen, 'list')} title={asStr(props.title)} />
          </Phone>
        )}
      </div>
    )
  },
}

const terminal: BlockDef = {
  type: 'terminal',
  name: '터미널',
  category: 'device',
  icon: 'terminal',
  size: { w: 560, h: 280 },
  minSize: { w: 280, h: 160 },
  props: [
    { key: 'title', label: '창 이름', kind: 'text' },
    { key: 'lines', label: '줄($로 시작하면 명령)', kind: 'list' },
  ],
  defaults: { title: 'haru-note', lines: ['$ npm install haru-note', '설치 완료 (2.1초)', '$ haru login', '로그인했습니다: team@example.com', '$ haru sync'] },
  interactive: false,
  motion: true,
  source: 'stageshow 키트 Window(terminal)',
  describe: () => '마지막 줄 끝에서 커서가 깜빡인다.',
  Render({ props, still }) {
    const tick = useTick(530, still)
    const lines = asList(props.lines)
    return (
      <div className="bk-device">
        <Window chrome="terminal" title={asStr(props.title)}>
          <div className="bk-term">
            {lines.map((l, i) => (
              <div key={i} className={l.startsWith('$') ? 'bk-term__cmd' : 'bk-term__out'}>
                {l}
                {i === lines.length - 1 && <span className="bk-term__caret" data-off={(!still && tick % 2 === 1) || undefined} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </Window>
      </div>
    )
  },
}

export const deviceBlocks = [browser, phone, terminal]
