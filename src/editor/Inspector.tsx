import { useEffect, useId, useRef, useState } from 'react'
import { CONFIG, type ArtboardKind } from '../config'
import { getBlock } from '../blocks/registry'
import type { PropField } from '../blocks/types'
import { minArtboardH } from '../model/design'
import type { Design, Item, PropValue } from '../model/types'
import { Icon } from '../ui/Icon'

/** 입력 중에는 바로 반영하지 않고, 멈춘 지 propCommitMs가 지나거나 포커스가 빠질 때 한 번만 반영한다(실행 취소 1단계). */
function useDeferred<T>(value: T, commit: (v: T) => void): [T, (v: T) => void, () => void] {
  const [local, setLocal] = useState(value)
  const dirty = useRef(false)
  const timer = useRef<number>()
  const latest = useRef(local)
  const commitRef = useRef(commit)
  commitRef.current = commit
  useEffect(() => {
    if (!dirty.current) setLocal(value)
  }, [value])
  const flush = () => {
    window.clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    commitRef.current(latest.current)
  }
  const change = (v: T) => {
    dirty.current = true
    latest.current = v
    setLocal(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, CONFIG.propCommitMs)
  }
  // 선택이 바뀌어 사라질 때도 쓰던 값을 잃지 않게 반영한다.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (dirty.current) {
        dirty.current = false
        commitRef.current(latest.current)
      }
    },
    [],
  )
  return [local, change, flush]
}

function NumberInput({ label, value, min, max, step = 1, disabled, onCommit }: { label: string; value: number; min: number; max: number; step?: number; disabled?: boolean; onCommit: (n: number) => void }) {
  const id = useId()
  const [v, setV, flush] = useDeferred(String(value), (s) => {
    const n = Number(s)
    if (s.trim() !== '' && Number.isFinite(n)) onCommit(Math.max(min, Math.min(max, n)))
  })
  return (
    <div className="ub-num">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" disabled={disabled} min={min} max={max} step={step} value={v} onChange={(e) => setV(e.target.value)} onBlur={flush} onKeyDown={(e) => e.key === 'Enter' && flush()} />
    </div>
  )
}

function Field({ f, value, onCommit }: { f: PropField; value: PropValue | undefined; onCommit: (v: PropValue) => void }) {
  const id = useId()
  const asText = f.kind === 'list' ? (Array.isArray(value) ? value.join('\n') : String(value ?? '')) : String(value ?? '')
  const [v, setV, flush] = useDeferred(asText, (s) => onCommit(f.kind === 'list' ? s.split('\n').map((x) => x.trimEnd().slice(0, CONFIG.limits.string)).filter(Boolean).slice(0, CONFIG.limits.list) : s.slice(0, CONFIG.limits.string)))
  if (f.kind === 'toggle')
    return (
      <label className="ub-check">
        <input type="checkbox" checked={value === true} onChange={(e) => onCommit(e.target.checked)} />
        {f.label}
      </label>
    )
  if (f.kind === 'number') return <NumberInput label={f.label} value={typeof value === 'number' ? value : f.min} min={f.min} max={f.max} step={f.step} onCommit={onCommit} />
  if (f.kind === 'select')
    return (
      <div className="ub-field">
        <label htmlFor={id}>{f.label}</label>
        <select id={id} value={String(value ?? '')} onChange={(e) => onCommit(e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  if (f.kind === 'color')
    return (
      <div className="ub-field">
        <label htmlFor={id}>{f.label}</label>
        <input id={id} type="color" value={String(value ?? '#000000')} onChange={(e) => onCommit(e.target.value)} />
      </div>
    )
  const multi = f.kind === 'textarea' || f.kind === 'list'
  return (
    <div className="ub-field">
      <label htmlFor={id}>{f.label}</label>
      {multi ? (
        <textarea id={id} rows={f.kind === 'list' ? Math.min(8, Math.max(3, v.split('\n').length + 1)) : 3} value={v} onChange={(e) => setV(e.target.value)} onBlur={flush} />
      ) : (
        <input id={id} type="text" value={v} onChange={(e) => setV(e.target.value)} onBlur={flush} onKeyDown={(e) => e.key === 'Enter' && flush()} />
      )}
    </div>
  )
}

interface Props {
  design: Design
  selection: string[]
  onItem: (id: string, patch: Partial<Item>) => void
  onProp: (id: string, key: string, v: PropValue) => void
  onArtboard: (patch: Partial<{ kind: ArtboardKind; h: number }>) => void
  onRename: (name: string) => void
  actions: { duplicate: () => void; remove: () => void; front: () => void; back: () => void }
}

export function Inspector({ design, selection, onItem, onProp, onArtboard, onRename, actions }: Props) {
  const items = design.items.filter((i) => selection.includes(i.id))
  const nameId = useId()
  const [name, setName, flushName] = useDeferred(design.name, (s) => onRename(s.trim().slice(0, CONFIG.limits.name) || '이름 없는 설계'))

  if (items.length === 0) {
    const minH = minArtboardH(design)
    return (
      <div className="ub-inspector">
        <h2>설계</h2>
        <div className="ub-field">
          <label htmlFor={nameId}>이름</label>
          <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} onBlur={flushName} onKeyDown={(e) => e.key === 'Enter' && flushName()} />
        </div>
        <div className="ub-field">
          <span className="ub-label">아트보드</span>
          <div className="ub-seg" role="radiogroup" aria-label="아트보드 종류">
            {(Object.keys(CONFIG.artboards) as ArtboardKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={design.artboard.kind === k} onClick={() => onArtboard({ kind: k })}>
                <Icon name={k === 'desktop' ? 'monitor' : k === 'tablet' ? 'tablet' : 'smartphone'} size={14} />
                {CONFIG.artboards[k].label}
              </button>
            ))}
          </div>
          <small>
            폭 {design.artboard.w}px. 바꾸면 블록을 새 폭에 맞춰 다시 배치합니다.
          </small>
        </div>
        <NumberInput label={`높이 (최소 ${minH})`} value={design.artboard.h} min={minH} max={CONFIG.artboardMaxH} step={CONFIG.grid} onCommit={(h) => onArtboard({ h })} />
        <p className="ub-hint">블록을 누르면 여기서 위치·크기·내용을 바꿀 수 있습니다.</p>
      </div>
    )
  }

  if (items.length > 1)
    return (
      <div className="ub-inspector">
        <h2>{items.length}개 선택</h2>
        <p className="ub-hint">함께 끌어 옮기거나 지울 수 있습니다. Shift+클릭으로 선택을 더하거나 뺍니다.</p>
        <div className="ub-actions">
          <button type="button" className="ub-btn" onClick={actions.duplicate}>
            <Icon name="copy" size={14} /> 복제
          </button>
          <button type="button" className="ub-btn ub-btn--danger" onClick={actions.remove}>
            <Icon name="trash" size={14} /> 삭제
          </button>
        </div>
      </div>
    )

  const it = items[0]
  const def = getBlock(it.type)
  const props = { ...(def?.defaults ?? {}), ...it.props }
  const art = design.artboard
  return (
    <div className="ub-inspector" key={it.id}>
      <h2>
        {def && <Icon name={def.icon} size={16} />}
        {def?.name ?? `알 수 없는 블록(${it.type})`}
      </h2>
      {def && <p className="ub-source">출처: {def.source}</p>}
      <div className="ub-grid4">
        <NumberInput label="X" value={it.x} min={0} max={art.w - it.w} step={CONFIG.grid} disabled={!!it.locked} onCommit={(x) => onItem(it.id, { x })} />
        <NumberInput label="Y" value={it.y} min={0} max={art.h - it.h} step={CONFIG.grid} disabled={!!it.locked} onCommit={(y) => onItem(it.id, { y })} />
        <NumberInput label="폭" value={it.w} min={def?.minSize.w ?? 8} max={art.w - it.x} step={CONFIG.grid} disabled={!!it.locked} onCommit={(w) => onItem(it.id, { w })} />
        <NumberInput label="높이" value={it.h} min={def?.minSize.h ?? 8} max={art.h - it.y} step={CONFIG.grid} disabled={!!it.locked} onCommit={(h) => onItem(it.id, { h })} />
      </div>
      <div className="ub-actions">
        <button type="button" className="ub-btn" onClick={actions.duplicate} title="복제 (Ctrl+D)">
          <Icon name="copy" size={14} /> 복제
        </button>
        <button type="button" className="ub-btn" onClick={actions.front} title="맨 앞으로">
          <Icon name="move-up" size={14} /> 앞으로
        </button>
        <button type="button" className="ub-btn" onClick={actions.back} title="맨 뒤로">
          <Icon name="move-down" size={14} /> 뒤로
        </button>
        <button type="button" className="ub-btn" aria-pressed={!!it.locked} onClick={() => onItem(it.id, { locked: !it.locked || undefined })}>
          <Icon name={it.locked ? 'lock' : 'lock-open'} size={14} /> {it.locked ? '잠김' : '잠그기'}
        </button>
        <button type="button" className="ub-btn ub-btn--danger" onClick={actions.remove} title="삭제 (Delete)">
          <Icon name="trash" size={14} /> 삭제
        </button>
      </div>
      {def && def.props.length > 0 && (
        <div className="ub-props">
          <h3>내용</h3>
          {def.props.map((f) => (
            <Field key={f.key} f={f} value={props[f.key]} onCommit={(v) => onProp(it.id, f.key, v)} />
          ))}
        </div>
      )}
      {def?.describe && <p className="ub-hint">미리보기 동작: {def.describe(props)}</p>}
    </div>
  )
}
