import { useEffect, useId, useRef, useState } from 'react'
import { themeVars } from '../app/Artboard'
import { ensureFont, FONTS, type FontGroup } from '../app/fonts'
import type { ThemeTokens } from '../model/types'
import { Icon } from '../ui/Icon'
import { radioKeys } from '../ui/radioKeys'

const SWATCHES = ['#1f4fd1', '#0f766e', '#b45309', '#be123c', '#4d7c0f', '#334155']
const GROUPS: FontGroup[] = ['고딕', '명조', '제목용', '둥근·손글씨', '고정폭']
// 바탕색·카드 면 색 견본(밝기별). 맨 앞 null은 '기본'.
const CANVAS = {
  light: [null, '#ffffff', '#f4f1ea', '#eef4ff', '#ecf7f1', '#f4f0fb', '#fdf0f2', '#fff8e6'],
  dark: [null, '#000000', '#0b1226', '#0d1a14', '#1a1220', '#1f1a14', '#18181b'],
} as const
const SURFACE = {
  light: [null, '#ffffff', '#f8fafc', '#fffdf7', '#f5f7ff'],
  dark: [null, '#1a1a1d', '#141b2d', '#16211b', '#221a28'],
} as const
const PATTERNS = [
  { id: 'none', label: '없음' },
  { id: 'dots', label: '점' },
  { id: 'grid', label: '격자' },
  { id: 'glow', label: '빛' },
] as const
// 밝기별 본문 글자색(blocks.css --bk-body). 고른 바탕·면 색과의 대비를 잴 때 쓴다.
const TEXT = { light: '#55565c', dark: '#b4b4ba' }
const DEFAULT_BG = { light: '#f7f8fa', dark: '#111113' }
const DEFAULT_SURFACE = { light: '#ffffff', dark: '#1a1a1d' }

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

function Swatches({ label, value, fallback, list, onPick, id }: { label: string; value?: string; fallback: string; list: readonly (string | null)[]; onPick: (v?: string) => void; id: string }) {
  return (
    <div className="ub-field">
      <label htmlFor={id}>{label}</label>
      <div className="ub-swatches">
        {list.map((c) =>
          c === null ? (
            <button key="default" type="button" className="ub-swatch-default" aria-label={`${label} 기본`} aria-pressed={!value} onClick={() => onPick(undefined)}>
              <Icon name="x" size={12} />
            </button>
          ) : (
            <button key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} style={{ background: c }} onClick={() => onPick(c)} />
          ),
        )}
        <input id={id} type="color" value={value ?? fallback} onChange={(e) => onPick(e.target.value)} />
      </div>
    </div>
  )
}

export function ThemePanel({ theme, onChange, notify }: { theme: ThemeTokens; onChange: (t: ThemeTokens) => void; notify: (msg: string) => void }) {
  const id = useId()
  const gen = useRef(0)
  const [copied, setCopied] = useState(false)
  const set = <K extends keyof ThemeTokens>(k: K, v: ThemeTokens[K]) => {
    const next = { ...theme, [k]: v }
    if (v === undefined) delete next[k]
    onChange(next)
  }
  // 글꼴 견본을 그 글꼴로 보여 주려고 목록의 글꼴 CSS를 미리 불러 둔다(견본 글자 묶음만 내려받는다).
  useEffect(() => {
    FONTS.forEach((f) => ensureFont(f.id))
  }, [])
  const low =
    Math.min(contrast(theme.canvas ?? DEFAULT_BG[theme.mode], TEXT[theme.mode]), contrast(theme.surface ?? DEFAULT_SURFACE[theme.mode], TEXT[theme.mode])) < 4.5
  // 밝기를 바꿀 때 고른 바탕이 새 글자색과 대비가 모자라면 바탕·면 색을 기본으로 돌린다.
  const setMode = (mode: ThemeTokens['mode']) => {
    const next: ThemeTokens = { ...theme, mode }
    if ([theme.canvas, theme.surface].some((c) => c && contrast(c, TEXT[mode]) < 4.5)) {
      delete next.canvas
      delete next.surface
    }
    onChange(next)
  }
  const css = `:root {\n${Object.entries(themeVars(theme))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')}\n}`
  return (
    <div className="ub-theme">
      <div className="ub-field">
        <span className="ub-label">화면</span>
        <div className="ub-seg" role="radiogroup" onKeyDown={radioKeys} aria-label="밝기">
          <button type="button" role="radio" aria-checked={theme.mode === 'light'} onClick={() => setMode('light')}>
            <Icon name="sun" size={14} /> 밝게
          </button>
          <button type="button" role="radio" aria-checked={theme.mode === 'dark'} onClick={() => setMode('dark')}>
            <Icon name="moon" size={14} /> 어둡게
          </button>
        </div>
      </div>
      <div className="ub-field">
        <label htmlFor={`${id}c`}>강조색</label>
        <div className="ub-swatches">
          {SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={`강조색 ${c}`} aria-pressed={theme.accent === c} style={{ background: c }} onClick={() => set('accent', c)} />
          ))}
          <input id={`${id}c`} type="color" value={theme.accent} onChange={(e) => set('accent', e.target.value)} />
        </div>
      </div>
      <div className="ub-field">
        <label htmlFor={`${id}r`}>모서리 {theme.radius}px</label>
        <input id={`${id}r`} type="range" min={0} max={24} step={1} value={theme.radius} onChange={(e) => set('radius', Number(e.target.value))} />
      </div>
      <Swatches label="바탕색" id={`${id}bg`} value={theme.canvas} fallback={DEFAULT_BG[theme.mode]} list={CANVAS[theme.mode]} onPick={(v) => set('canvas', v)} />
      <Swatches label="카드 면 색" id={`${id}sf`} value={theme.surface} fallback={DEFAULT_SURFACE[theme.mode]} list={SURFACE[theme.mode]} onPick={(v) => set('surface', v)} />
      {low && (
        <p className="ub-warn" role="status">
          바탕과 글자의 대비가 낮아 글이 잘 안 보일 수 있습니다.{' '}
          <button type="button" className="ub-link" onClick={() => setMode(theme.mode === 'light' ? 'dark' : 'light')}>
            {theme.mode === 'light' ? '어둡게' : '밝게'}로 바꾸기
          </button>
        </p>
      )}
      <div className="ub-field">
        <span className="ub-label">바탕 무늬</span>
        <div className="ub-seg" role="radiogroup" onKeyDown={radioKeys} aria-label="바탕 무늬">
          {PATTERNS.map((pt) => (
            <button key={pt.id} type="button" role="radio" aria-checked={(theme.pattern ?? 'none') === pt.id} onClick={() => set('pattern', pt.id === 'none' ? undefined : pt.id)}>
              {pt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ub-field">
        <span className="ub-label">글꼴</span>
        <div className="ub-fonts" role="radiogroup" onKeyDown={radioKeys} aria-label="글꼴">
          {GROUPS.map((g) => (
            <div key={g} className="ub-fonts__group">
              <small>{g}</small>
              {FONTS.filter((f) => f.group === g).map((f) => (
                <button key={f.id} type="button" role="radio" aria-checked={theme.font === f.id} onClick={() => set('font', f.id)}>
                  <span style={{ fontFamily: f.family }} aria-hidden="true">
                    가나다 Aa
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="ub-field">
        <span className="ub-label">간격</span>
        <div className="ub-seg" role="radiogroup" onKeyDown={radioKeys} aria-label="간격">
          {(['compact', 'normal', 'roomy'] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={theme.density === d} onClick={() => set('density', d)}>
              {d === 'compact' ? '촘촘' : d === 'normal' ? '보통' : '여유'}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="ub-btn"
        onClick={() => {
          const g = ++gen.current
          navigator.clipboard
            .writeText(css)
            .then(() => {
              if (g !== gen.current) return
              setCopied(true)
              notify('CSS 변수를 복사했습니다.')
              window.setTimeout(() => g === gen.current && setCopied(false), 1500)
            })
            .catch(() => g === gen.current && notify('복사하지 못했습니다. 브라우저가 클립보드 접근을 막았습니다.'))
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} size={14} /> {copied ? '복사됨' : 'CSS 변수 복사'}
      </button>
    </div>
  )
}
