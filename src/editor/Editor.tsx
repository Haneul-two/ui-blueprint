import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { getBlock } from '../blocks/registry'
import type { Mode } from '../blocks/types'
import { historyReducer, initHistory } from '../model/history'
import { designKey, saveDesign } from '../model/storage'
import { uid } from '../model/design'
import type { Design, Item } from '../model/types'
import { buildAiSpec } from '../io/aiSpec'
import { download, exportJson, safeFileName } from '../io/file'
import { artboardPng } from '../io/png'
import { ensureFont, fontOf } from '../app/fonts'
import { shareUrl } from '../io/share'
import { Icon } from '../ui/Icon'
import { radioKeys } from '../ui/radioKeys'
import { Toaster, useToasts } from '../ui/toast'
import { go } from '../app/router'
import { Artboard } from '../app/Artboard'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { Layers } from './Layers'
import { Palette } from './Palette'
import { ThemePanel } from './ThemePanel'
import * as ops from './ops'
import type { Rect } from './snapping'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('.ub-live, [role="radiogroup"], [role="tablist"]'))

function useNarrow() {
  const q = '(max-width: 899px)'
  const [n, setN] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const m = matchMedia(q)
    const on = () => setN(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return n
}

export function Editor({ initial }: { initial: Design }) {
  const [hist, dispatch] = useReducer(historyReducer, initial, initHistory)
  const design = hist.present
  const [mode, setMode] = useState<Mode>('edit')
  const [selection, setSelection] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [left, setLeft] = useState<'blocks' | 'layers'>('blocks')
  const [right, setRight] = useState<'props' | 'theme'>('props')
  const [guidesOn, setGuidesOn] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [otherTab, setOtherTab] = useState(false)
  const [share, setShare] = useState<{ url?: string; long?: boolean; tooLong?: boolean } | null>(null)
  const { list: toasts, notify } = useToasts()
  const narrow = useNarrow()
  const clip = useRef<Item[]>([])
  const artEl = useRef<HTMLDivElement | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // 처음 연 내용을 저장된 것으로 본다. 안 그러면 고치지 않은 탭이 400ms 뒤 다시 저장해 다른 탭의 변경을 덮는다.
  const lastSaved = useRef<string>(JSON.stringify(initial))
  const exportGen = useRef(0)
  const menu = useRef<HTMLDetailsElement>(null)
  // 내보내기 메뉴 바깥을 누르면 닫는다.
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.removeAttribute('open')
    }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  }, [])

  const apply = useCallback((fn: (d: Design) => Design, key?: string) => dispatch({ type: 'apply', fn, key }), [])

  // 자동 저장: 바뀐 뒤 autosaveMs 기다렸다 저장한다.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const json = JSON.stringify(design)
      if (json === lastSaved.current) return
      const ok = saveDesign(design)
      setSaveFailed(!ok)
      if (ok) lastSaved.current = json
    }, CONFIG.autosaveMs)
    return () => window.clearTimeout(t)
  }, [design])

  // 저장 대기(autosaveMs) 중에 목록으로 가거나 탭을 닫아도 마지막 변경을 잃지 않게 바로 저장한다.
  const latest = useRef(design)
  latest.current = design
  useEffect(() => {
    const flush = () => {
      const json = JSON.stringify(latest.current)
      if (json !== lastSaved.current && saveDesign(latest.current)) lastSaved.current = json
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  // 다른 탭에서 같은 설계를 고치면 알려 준다.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === designKey(design.id) && e.newValue && e.newValue !== lastSaved.current) setOtherTab(true)
    }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [design.id])

  // 선택에서 사라진 블록 id를 정리한다(실행 취소로 없어진 블록 등).
  useEffect(() => {
    setSelection((s) => {
      // 없어진 블록만 뺀다. 숨긴 블록은 레이어에서 골라 속성을 고칠 수 있어야 한다.
      const next = s.filter((id) => design.items.some((i) => i.id === id))
      return next.length === s.length ? s : next
    })
  }, [design.items])

  const fitZoom = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const z = Math.min(1, (el.clientWidth - 64) / design.artboard.w)
    setZoom(Math.max(CONFIG.zoom.min, Math.floor(z * 100) / 100))
  }, [design.artboard.w])
  useLayoutEffect(fitZoom, [design.artboard.kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCenter = () => {
    const el = scroller.current
    const a = artEl.current
    if (!el || !a) return { x: design.artboard.w / 2, y: 200 }
    const er = el.getBoundingClientRect()
    const ar = a.getBoundingClientRect()
    const x = (er.left + er.width / 2 - ar.left) / zoom
    const y = (er.top + Math.min(er.height, 600) / 2 - ar.top) / zoom
    return { x: Math.max(0, Math.min(design.artboard.w, x)), y: Math.max(0, Math.min(design.artboard.h, y)) }
  }

  const add = (type: string, at?: { x: number; y: number }) => {
    if (design.items.length >= CONFIG.limits.items) return notify(`블록은 ${CONFIG.limits.items}개까지 놓을 수 있습니다.`, 'error')
    // 리듀서는 렌더 때 돌므로 id를 미리 정해 넘긴다.
    const id = uid()
    const pos = at ?? visibleCenter()
    apply((d) => ops.addBlock(d, type, pos, !at, id)?.design ?? d)
    setSelection([id])
    setRight('props')
    if (mode === 'preview') setMode('edit')
  }

  const actions = {
    duplicate: () => {
      const src = design.items.filter((i) => selection.includes(i.id))
      if (!src.length) return
      const ids = src.map(() => uid())
      apply((d) => ops.cloneItems(d, src, ids).design)
      setSelection(ids)
    },
    remove: () => {
      if (!selection.length) return
      const ids = selection
      apply((d) => ops.removeIds(d, ids))
      setSelection([])
    },
    front: () => apply((d) => ops.toFront(d, selection)),
    back: () => apply((d) => ops.toBack(d, selection)),
  }

  // 키보드 단축키
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (isTyping(e.target) || mode !== 'edit') return
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (mod && k === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
      } else if (mod && k === 'd') {
        e.preventDefault()
        actions.duplicate()
      } else if (mod && k === 'c') {
        clip.current = design.items.filter((i) => selection.includes(i.id))
      } else if (mod && k === 'v') {
        if (!clip.current.length) return
        e.preventDefault()
        const src = clip.current
        const ids = src.map(() => uid())
        apply((d) => ops.cloneItems(d, src, ids).design)
        setSelection(ids)
      } else if (k === 'delete' || k === 'backspace') {
        if (!selection.length) return
        e.preventDefault()
        actions.remove()
      } else if (k.startsWith('arrow') && selection.length) {
        e.preventDefault()
        const step = e.shiftKey ? CONFIG.nudge.large : CONFIG.nudge.small
        const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0
        const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0
        apply((d) => ops.nudge(d, selection, dx, dy), `nudge:${selection.join()}`)
      } else if (k === 'escape') setSelection([])
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const doPng = async () => {
    const g = ++exportGen.current
    setExporting(true)
    try {
      // 테마 글꼴 CSS가 아직 안 왔으면 기다린다(안 기다리면 PNG에 글꼴이 빠진다). 그다음 정지 모드로 다시 그려질 때까지 두 프레임.
      await ensureFont(design.theme.font)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      if (!artEl.current) throw new Error('아트보드를 찾지 못했습니다.')
      const blob = await artboardPng(artEl.current, fontOf(design.theme.font).face)
      if (g !== exportGen.current) return
      download(`${safeFileName(design.name)}.png`, blob)
      notify('PNG를 내려받았습니다.')
    } catch (err) {
      if (g === exportGen.current) notify(`PNG를 만들지 못했습니다. ${(err as Error).message ?? ''}`, 'error')
    } finally {
      if (g === exportGen.current) setExporting(false)
    }
  }

  const doShare = async () => {
    const r = await shareUrl(design)
    setShare(r.ok ? { url: r.url, long: r.long } : { tooLong: true })
  }

  const copy = (text: string, done: string) =>
    navigator.clipboard.writeText(text).then(
      () => notify(done),
      () => notify('복사하지 못했습니다. 브라우저가 클립보드 접근을 막았습니다.', 'error'),
    )

  if (narrow)
    return (
      <div className="ub-narrow">
        <header className="ub-narrow__head">
          <button type="button" className="ub-btn" onClick={() => go('#/')}>
            <Icon name="chevron-left" size={14} /> 목록
          </button>
          <strong>{design.name}</strong>
        </header>
        <p className="ub-narrow__note">편집은 폭 900px 이상인 화면에서 할 수 있습니다. 여기서는 미리보기만 됩니다.</p>
        <ScaledPreview design={design} />
      </div>
    )

  const selItem = selection.length === 1 ? design.items.find((i) => i.id === selection[0]) : undefined

  return (
    <div className="ub-editor" data-mode={mode}>
      <header className="ub-toolbar">
        <button type="button" className="ub-iconbtn" aria-label="설계 목록으로" onClick={() => go('#/')}>
          <Icon name="chevron-left" size={18} />
        </button>
        <strong className="ub-toolbar__name" title={design.name}>
          {design.name}
        </strong>
        <span className="ub-toolbar__save" data-error={saveFailed || undefined}>
          {saveFailed ? '저장 실패' : '자동 저장됨'}
        </span>
        <div className="ub-toolbar__group">
          <button type="button" className="ub-iconbtn" aria-label="실행 취소 (Ctrl+Z)" title="실행 취소 (Ctrl+Z)" disabled={!hist.past.length} onClick={() => dispatch({ type: 'undo' })}>
            <Icon name="undo" size={16} />
          </button>
          <button type="button" className="ub-iconbtn" aria-label="다시 실행 (Ctrl+Shift+Z)" title="다시 실행 (Ctrl+Shift+Z)" disabled={!hist.future.length} onClick={() => dispatch({ type: 'redo' })}>
            <Icon name="redo" size={16} />
          </button>
        </div>
        <div className="ub-toolbar__group">
          <button type="button" className="ub-iconbtn" aria-label="축소" disabled={zoom <= CONFIG.zoom.min} onClick={() => setZoom((z) => Math.max(CONFIG.zoom.min, Math.round((z - CONFIG.zoom.step) * 4) / 4 || CONFIG.zoom.min))}>
            <Icon name="zoom-out" size={16} />
          </button>
          <button type="button" className="ub-btn ub-btn--quiet" onClick={fitZoom} title="화면에 맞추기">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="ub-iconbtn" aria-label="확대" disabled={zoom >= CONFIG.zoom.max} onClick={() => setZoom((z) => Math.min(CONFIG.zoom.max, Math.round((z + CONFIG.zoom.step) * 4) / 4))}>
            <Icon name="zoom-in" size={16} />
          </button>
          <button type="button" className="ub-iconbtn" aria-label="안내선" aria-pressed={guidesOn} title="안내선에 붙이기 (끄면 격자만)" onClick={() => setGuidesOn((g) => !g)}>
            <Icon name="grid" size={16} />
          </button>
        </div>
        <div className="ub-seg ub-toolbar__mode" role="radiogroup" onKeyDown={radioKeys} aria-label="모드">
          <button type="button" role="radio" aria-checked={mode === 'edit'} onClick={() => setMode('edit')}>
            <Icon name="pointer" size={14} /> 편집
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'preview'}
            onClick={() => {
              setMode('preview')
              setSelection([])
            }}
          >
            <Icon name="play" size={14} /> 미리보기
          </button>
        </div>
        <div className="ub-toolbar__end">
          <button type="button" className="ub-btn" onClick={doShare}>
            <Icon name="share" size={14} /> 공유 링크
          </button>
          <details className="ub-menu" ref={menu}>
            <summary className="ub-btn ub-btn--primary">
              <Icon name="download" size={14} /> 내보내기
            </summary>
            {/* 항목을 고르면 메뉴를 닫는다. 열어 두면 오른쪽 패널 탭을 가린다. */}
            <div className="ub-menu__list" role="group" aria-label="내보내기" onClick={(e) => (e.target as HTMLElement).closest('button') && menu.current?.removeAttribute('open')}>
              <button type="button" disabled={exporting} onClick={doPng}>
                <Icon name={exporting ? 'loader' : 'image'} size={14} /> {exporting ? '만드는 중…' : 'PNG 이미지'}
              </button>
              <button type="button" onClick={() => exportJson(design)}>
                <Icon name="file-json" size={14} /> 설계 파일(JSON)
              </button>
              <button type="button" onClick={() => copy(buildAiSpec(design), 'AI용 사양서를 복사했습니다.')}>
                <Icon name="copy" size={14} /> AI용 사양서 복사
              </button>
              <button type="button" onClick={() => download(`${safeFileName(design.name)}-spec.md`, buildAiSpec(design), 'text/markdown')}>
                <Icon name="file-text" size={14} /> AI용 사양서 내려받기(.md)
              </button>
            </div>
          </details>
        </div>
      </header>

      {(saveFailed || otherTab) && (
        <div className="ub-alert" role="alert">
          {saveFailed && <span>브라우저에 저장하지 못했습니다. 내보내기 → 설계 파일(JSON)로 보관해 두세요.</span>}
          {otherTab && (
            <span>
              다른 탭에서 이 설계가 바뀌었습니다.{' '}
              <button type="button" className="ub-link" onClick={() => location.reload()}>
                새로 불러오기
              </button>
              <button type="button" className="ub-link" onClick={() => setOtherTab(false)}>
                이 탭 내용 유지
              </button>
            </span>
          )}
        </div>
      )}

      {share && (
        <div className="ub-share" role="dialog" aria-label="공유 링크">
          {share.tooLong ? (
            <p>
              블록이 많아 링크에 담을 수 없습니다. JSON 파일로 보내 주세요.{' '}
              <button type="button" className="ub-link" onClick={() => exportJson(design)}>
                JSON 내보내기
              </button>
            </p>
          ) : (
            <>
              <p>이 링크를 연 사람은 지금 설계를 보기 전용으로 보고, 자기 브라우저로 복사해 고칠 수 있습니다. 나중에 고친 내용은 새 링크를 만들어야 반영됩니다.</p>
              <div className="ub-share__row">
                <input readOnly value={share.url} aria-label="공유 링크" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="ub-btn ub-btn--primary" onClick={() => copy(share.url!, '공유 링크를 복사했습니다.')}>
                  복사
                </button>
              </div>
              {share.long && <p className="ub-hint">링크가 깁니다({share.url!.length.toLocaleString()}자). 메신저에서 잘릴 수 있으니 JSON 파일도 함께 보내세요.</p>}
            </>
          )}
          <button type="button" className="ub-iconbtn ub-share__close" aria-label="공유 창 닫기" onClick={() => setShare(null)}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <aside className="ub-left" aria-label="블록과 레이어">
        <div className="ub-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={left === 'blocks'} onClick={() => setLeft('blocks')}>
            블록
          </button>
          <button type="button" role="tab" aria-selected={left === 'layers'} onClick={() => setLeft('layers')}>
            레이어 {design.items.length}
          </button>
        </div>
        {left === 'blocks' ? (
          <Palette onAdd={(t) => add(t)} />
        ) : (
          <Layers
            design={design}
            selection={selection}
            onSelect={(ids, additive) => {
              setMode('edit')
              setSelection((s) => (additive ? [...new Set([...s, ...ids])] : ids))
            }}
            onPatch={(id, patch) => apply((d) => ops.patchItem(d, id, patch))}
            onShift={(id, dir) => apply((d) => ops.shift(d, id, dir))}
          />
        )}
      </aside>

      <main className="ub-canvas" ref={scroller} aria-label="캔버스">
        <Canvas
          design={design}
          mode={mode}
          zoom={zoom}
          forceStill={exporting}
          selection={mode === 'edit' ? selection : []}
          onSelect={setSelection}
          onCommitRects={(rects: Record<string, Rect>) => apply((d) => ops.setRects(d, rects))}
          onDropBlock={(type, x, y) => add(type, { x, y })}
          artRef={(el) => (artEl.current = el)}
          guidesOn={guidesOn}
        />
        {mode === 'edit' && (
          <p className="ub-canvas__hint" aria-hidden="true">
            끌어서 옮기기, 모서리로 크기 조절, Shift+클릭으로 여러 개 선택, 화살표로 8px(Shift는 40px), Alt를 누르고 끌면 안내선 끔
          </p>
        )}
      </main>

      <aside className="ub-right" aria-label="속성">
        <div className="ub-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={right === 'props'} onClick={() => setRight('props')}>
            {selItem ? getBlock(selItem.type)?.name ?? '블록' : selection.length > 1 ? `${selection.length}개 선택` : '설계'}
          </button>
          <button type="button" role="tab" aria-selected={right === 'theme'} onClick={() => setRight('theme')}>
            테마
          </button>
        </div>
        {right === 'props' ? (
          <Inspector
            design={design}
            selection={selection}
            onItem={(id, patch) => apply((d) => ops.patchItem(d, id, patch))}
            onProp={(id, key, v) => apply((d) => ops.setProp(d, id, key, v))}
            onArtboard={(patch) => {
              const kind = patch.kind && patch.kind !== design.artboard.kind ? patch.kind : null
              if (kind && ops.setArtboard(design, patch).artboard.kind !== kind)
                return notify(`블록이 많아 높이 ${CONFIG.artboardMaxH}px 안에 ${CONFIG.artboards[kind].label} 폭으로 다시 놓을 수 없습니다. 블록을 줄인 뒤 바꿔 주세요.`, 'error')
              apply((d) => ops.setArtboard(d, patch))
              if (kind && design.items.length) notify(`${CONFIG.artboards[kind].label} 폭에 맞춰 블록을 다시 배치했습니다. Ctrl+Z로 되돌릴 수 있습니다.`)
            }}
            onRename={(name) => apply((d) => ({ ...d, name }))}
            actions={actions}
          />
        ) : (
          <ThemePanel theme={design.theme} onChange={(t) => apply((d) => ({ ...d, theme: t }), 'theme')} notify={notify} />
        )}
      </aside>
      <Toaster list={toasts} />
    </div>
  )
}

/** 창 폭에 맞춰 줄인 미리보기(최대 1배). 보기 전용 화면과 좁은 화면에서 쓴다. */
export function ScaledPreview({ design }: { design: Design }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const read = () => setScale(Math.min(1, el.clientWidth / design.artboard.w))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [design.artboard.w])
  return (
    <div className="ub-scaled" ref={box}>
      <div style={{ width: design.artboard.w * scale, height: design.artboard.h * scale, margin: '0 auto' }}>
        <Artboard design={design} mode="preview" style={{ transform: `scale(${scale})` }} />
      </div>
    </div>
  )
}
