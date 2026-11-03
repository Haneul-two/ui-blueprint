import { useId, useRef, useState } from 'react'
import { themeVars } from '../app/Artboard'
import type { ThemeTokens } from '../model/types'
import { Icon } from '../ui/Icon'

const SWATCHES = ['#1f4fd1', '#0f766e', '#b45309', '#be123c', '#4d7c0f', '#334155']

export function ThemePanel({ theme, onChange, notify }: { theme: ThemeTokens; onChange: (t: ThemeTokens) => void; notify: (msg: string) => void }) {
  const id = useId()
  const gen = useRef(0)
  const [copied, setCopied] = useState(false)
  const set = <K extends keyof ThemeTokens>(k: K, v: ThemeTokens[K]) => onChange({ ...theme, [k]: v })
  const css = `:root {\n${Object.entries(themeVars(theme))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')}\n}`
  return (
    <div className="ub-theme">
      <div className="ub-field">
        <span className="ub-label">화면</span>
        <div className="ub-seg" role="radiogroup" aria-label="밝기">
          <button type="button" role="radio" aria-checked={theme.mode === 'light'} onClick={() => set('mode', 'light')}>
            <Icon name="sun" size={14} /> 밝게
          </button>
          <button type="button" role="radio" aria-checked={theme.mode === 'dark'} onClick={() => set('mode', 'dark')}>
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
      <div className="ub-field">
        <label htmlFor={`${id}f`}>글꼴</label>
        <select id={`${id}f`} value={theme.font} onChange={(e) => set('font', e.target.value as ThemeTokens['font'])}>
          <option value="sans">고딕(산세리프)</option>
          <option value="serif">명조(세리프)</option>
          <option value="mono">고정폭</option>
        </select>
      </div>
      <div className="ub-field">
        <span className="ub-label">간격</span>
        <div className="ub-seg" role="radiogroup" aria-label="간격">
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
