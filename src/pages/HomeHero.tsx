import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { Icon } from '../ui/Icon'

const TITLE = ['놓으면', '화면이', '됩니다.']

type Wire = { k: string; x: number; y: number; w: number; h: number }
// 히어로 도면 속 대시보드 뼈대(시트 기준 %). 마지막 KPI 자리는 커서가 끌어다 놓는다.
const WIRES: Wire[] = [
  { k: 'side', x: 0, y: 0, w: 16, h: 100 },
  { k: 'title', x: 20, y: 6, w: 36, h: 9 },
  { k: 'search', x: 70, y: 7, w: 26, h: 6 },
  { k: 'kpi', x: 20, y: 20, w: 17, h: 16 },
  { k: 'kpi', x: 39, y: 20, w: 17, h: 16 },
  { k: 'kpi', x: 58, y: 20, w: 17, h: 16 },
  { k: 'chart', x: 20, y: 41, w: 49, h: 53 },
  { k: 'donut', x: 71, y: 41, w: 25, h: 53 },
]
const SLOT = { x: 77, y: 20, w: 19, h: 16 }
const pos = (r: { x: number; y: number; w: number; h: number }) =>
  ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }) as CSSProperties

function Drawing() {
  return (
    <div className="hero__stage" aria-hidden="true">
      <div className="hero__board">
        <div className="hero__boardbar">
          <i />
          <i />
          <i />
          <span>team-dashboard · 1440 × 1024</span>
        </div>
        <div className="hero__sheet">
          {WIRES.map((w, i) => (
            <span key={i} className="hero__wire" data-k={w.k} style={{ ...pos(w), ['--d' as string]: `${700 + i * 110}ms` }}>
              {w.k === 'chart' && (
                <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                  <polyline points="4,44 18,36 30,40 44,26 58,30 72,16 86,20 96,6" />
                </svg>
              )}
              {w.k === 'donut' && (
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="13" />
                </svg>
              )}
            </span>
          ))}
          <span className="hero__dim hero__dim--chart" style={{ left: '20%', top: '41%', width: '49%' }}>
            <b>704</b>
          </span>
          <span className="hero__slot" style={pos(SLOT)} />
          <span className="hero__guide hero__guide--v" style={{ left: `${SLOT.x}%` }} />
          <span className="hero__guide hero__guide--h" style={{ top: `${SLOT.y}%` }} />
          <span className="hero__drag" style={pos(SLOT)}>
            <span className="hero__wire" data-k="kpi" data-held />
            <span className="hero__tag">264 × 136</span>
            <svg className="hero__cursor" viewBox="0 0 24 24">
              <path d="M5 3l14 8-6 1.5L10 19z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

export function HomeHero({ blocks, onStart, onImport }: { blocks: number; onStart: () => void; onImport: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const frame = useRef(0)
  // 커서 주변 격자를 밝힌다. 한 프레임에 한 번만 갱신한다.
  const onMove = (e: PointerEvent) => {
    const el = ref.current
    // 움직임 줄이기를 켠 사람에게는 커서를 따라 움직이는 빛을 끈다.
    if (!el || frame.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const { clientX, clientY } = e
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${clientX - r.left}px`)
      el.style.setProperty('--my', `${clientY - r.top}px`)
    })
  }

  return (
    <header className="hero" ref={ref} onPointerMove={onMove}>
      <div className="hero__bg" aria-hidden="true">
        <span className="hero__glow hero__glow--a" />
        <span className="hero__glow hero__glow--b" />
        <span className="hero__grid" />
        <span className="hero__grid hero__grid--hot" />
        <span className="hero__scan" />
      </div>

      <nav className="hero__bar" aria-label="첫 화면 메뉴">
        <a href="#/" className="hero__brand">
          <span className="ub-logo" aria-hidden="true" />
          UI 설계도
        </a>
        <div className="hero__links">
          <a href="#/blocks">블록 둘러보기</a>
          <button type="button" onClick={onImport}>
            <Icon name="upload" size={14} /> 설계 파일 불러오기
          </button>
        </div>
      </nav>

      <div className="hero__copy">
        <p className="hero__eyebrow wr-after" style={{ ['--d' as string]: '0ms' } as CSSProperties}>
          UI BLUEPRINT <span>·</span> 블록 {blocks}개
        </p>
        <h1 className="hero__title">
          {TITLE.map((w, i) => (
            <span key={i}>
              {i > 0 && ' '}
              <span className="wr-word" data-last={i === TITLE.length - 1 || undefined}>
                <span style={{ ['--d' as string]: `${150 + i * 90}ms` } as CSSProperties}>{w}</span>
              </span>
            </span>
          ))}
        </h1>
        <div className="hero__cta wr-after" style={{ ['--d' as string]: '520ms' } as CSSProperties}>
          <button type="button" className="hero__btn hero__btn--primary" onClick={onStart}>
            설계 시작하기 <Icon name="arrow-down" size={16} />
          </button>
          <a className="hero__btn" href="#/blocks">
            <Icon name="layout-grid" size={16} /> 블록 둘러보기
          </a>
        </div>
      </div>

      <Drawing />
    </header>
  )
}
