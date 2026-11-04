import { Component, useEffect, type CSSProperties, type ReactNode } from 'react'
import { LookContext } from '../vendor/stageshow/looks'
import { StillContext, useReducedMotion } from '../vendor/stageshow/reduced-motion'
import { getBlock, sanitizeProps } from '../blocks/registry'
import type { Mode } from '../blocks/types'
import type { Design, Item, ThemeTokens } from '../model/types'
import { ensureFont, fontOf } from './fonts'
const CONTROL = { compact: '32px', normal: '38px', roomy: '44px' }

/** 테마 조절판 값을 아트보드 CSS 변수로 바꾼다. 조절판의 "CSS 변수 복사"도 이 함수를 쓴다. */
export function themeVars(t: ThemeTokens): Record<string, string> {
  return {
    '--ss-accent': t.accent,
    '--ss-accent-soft': `color-mix(in srgb, ${t.accent} ${t.mode === 'dark' ? 22 : 12}%, transparent)`,
    '--ub-radius': `${t.radius}px`,
    '--ss-radius-sm': `${Math.round(t.radius * 0.6)}px`,
    '--ss-radius-md': `${Math.round(t.radius * 0.8)}px`,
    '--ss-radius-lg': `${t.radius}px`,
    '--ss-radius-window': `${Math.round(t.radius * 1.2)}px`,
    '--ss-font': fontOf(t.font).family,
    '--ss-control': CONTROL[t.density],
    ...(t.canvas ? { '--ss-canvas': t.canvas } : {}),
    ...(t.surface ? { '--ss-surface': t.surface } : {}),
  }
}

const LOOK = { theme: 'light', palette: 'accent', fidelity: 'standard', layout: 'wide' } as const

class Guard extends Component<{ children: ReactNode; name: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <div className="ub-unknown">“{this.props.name}” 블록을 그리지 못했습니다</div> : this.props.children
  }
}

export function BlockView({ item, mode, still }: { item: Item; mode: Mode; still: boolean }) {
  const def = getBlock(item.type)
  if (!def) return <div className="ub-unknown">알 수 없는 블록: {item.type}</div>
  const R = def.Render
  return (
    <Guard name={def.name}>
      <R props={sanitizeProps(def, item.props)} mode={mode} still={still} />
    </Guard>
  )
}

interface ArtboardProps {
  design: Design
  mode: Mode
  /** 강제로 멈춘 그림(PNG 만들기). 움직임 줄이기 설정은 따로 반영된다. */
  forceStill?: boolean
  /** 블록마다 겉 상자를 직접 그리고 싶을 때(편집기). 없으면 위치만 잡은 상자를 쓴다. */
  renderItem?: (item: Item, content: ReactNode) => ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
  artRef?: (el: HTMLDivElement | null) => void
}

export function Artboard({ design, mode, forceStill, renderItem, children, className, style, artRef }: ArtboardProps) {
  const reduced = useReducedMotion()
  const still = !!forceStill || reduced
  const { w, h } = design.artboard
  const look = { ...LOOK, theme: design.theme.mode }
  useEffect(() => {
    ensureFont(design.theme.font)
  }, [design.theme.font])
  return (
    <LookContext.Provider value={look}>
      <StillContext.Provider value={still}>
        <div
          ref={artRef}
          className={`ub-art ss-stage${mode === 'preview' ? ' ub-live' : ''}${className ? ` ${className}` : ''}`}
          data-theme={design.theme.mode}
          data-pattern={design.theme.pattern && design.theme.pattern !== 'none' ? design.theme.pattern : undefined}
          data-palette="accent"
          data-fidelity="standard"
          data-layout="wide"
          data-density={design.theme.density}
          data-still={still || undefined}
          data-mode={mode}
          style={{ width: w, height: h, ...(themeVars(design.theme) as CSSProperties), ...style }}
        >
          {design.items.map((it) => {
            if (it.hidden) return null
            const content = <BlockView item={it} mode={mode} still={still} />
            return renderItem ? (
              renderItem(it, content)
            ) : (
              <div key={it.id} className="ub-item" data-type={it.type} style={{ left: it.x, top: it.y, width: it.w, height: it.h }}>
                {content}
              </div>
            )
          })}
          {children}
        </div>
      </StillContext.Provider>
    </LookContext.Provider>
  )
}
