import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { CONFIG } from '../config'
import { Artboard } from '../app/Artboard'
import { getBlock } from '../blocks/registry'
import type { Mode } from '../blocks/types'
import type { Design, Item } from '../model/types'
import { HANDLES, resizeRect, snapLimit, snapMove, type Guide, type Handle, type Rect } from './snapping'

export const DRAG_MIME = 'application/x-ub-block'

interface Props {
  design: Design
  mode: Mode
  zoom: number
  forceStill: boolean
  selection: string[]
  onSelect: (ids: string[]) => void
  onCommitRects: (rects: Record<string, Rect>) => void
  onDropBlock: (type: string, x: number, y: number) => void
  artRef: (el: HTMLDivElement | null) => void
  guidesOn: boolean
}

type Gesture =
  | { kind: 'move'; ids: string[]; start: Record<string, Rect>; px: number; py: number; started: boolean; pointer: number }
  | { kind: 'resize'; id: string; handle: Handle; start: Rect; px: number; py: number; pointer: number }

const rectOf = (it: Item): Rect => ({ x: it.x, y: it.y, w: it.w, h: it.h })

/** 편집 모드에서는 블록 안쪽을 inert로 막아 누르기·탭 이동이 블록에 들어가지 않게 한다. */
function Content({ live, children }: { live: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (live) el.removeAttribute('inert')
    else el.setAttribute('inert', '')
  }, [live])
  return (
    <div ref={ref} className="ub-item__content">
      {children}
    </div>
  )
}

export function Canvas({ design, mode, zoom, forceStill, selection, onSelect, onCommitRects, onDropBlock, artRef, guidesOn }: Props) {
  const [draft, setDraftState] = useState<Record<string, Rect> | null>(null)
  const draftRef = useRef<Record<string, Rect> | null>(null)
  const setDraft = (d: Record<string, Rect> | null) => {
    draftRef.current = d
    setDraftState(d)
  }
  const [guides, setGuides] = useState<Guide[]>([])
  const gesture = useRef<Gesture | null>(null)
  const artEl = useRef<HTMLDivElement | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const edit = mode === 'edit'
  const art = design.artboard

  const toArt = (cx: number, cy: number) => {
    const r = artEl.current!.getBoundingClientRect()
    return { x: (cx - r.left) / zoom, y: (cy - r.top) / zoom }
  }

  const end = (commit: boolean) => {
    const g = gesture.current
    gesture.current = null
    setGuides([])
    const d = draftRef.current
    setDraft(null)
    if (commit && d && g && (g.kind === 'resize' || g.started)) onCommitRects(d)
  }

  // Esc로 끌기 취소, 창 밖에서 손을 떼도 끝나게 전역에서 듣는다.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current
      if (!g || e.pointerId !== g.pointer) return
      if (e.buttons === 0) return end(true)
      const dx = (e.clientX - g.px) / zoom
      const dy = (e.clientY - g.py) / zoom
      if (g.kind === 'move') {
        if (!g.started) {
          if (Math.hypot(e.clientX - g.px, e.clientY - g.py) < CONFIG.dragThreshold) return
          g.started = true
        }
        const lead = g.ids[0]
        const s = g.start[lead]
        const others = design.items.filter((it) => !g.ids.includes(it.id) && !it.hidden).map(rectOf)
        const snapped = snapMove({ ...s, x: s.x + dx, y: s.y + dy }, others, art, snapLimit(zoom), guidesOn && !e.altKey)
        let ox = snapped.rect.x - s.x
        let oy = snapped.rect.y - s.y
        // 여러 개를 함께 옮길 때는 모두 아트보드 안에 남는 범위로 줄인다.
        for (const id of g.ids) {
          const r = g.start[id]
          ox = Math.max(-r.x, Math.min(ox, art.w - r.w - r.x))
          oy = Math.max(-r.y, Math.min(oy, art.h - r.h - r.y))
        }
        const next: Record<string, Rect> = {}
        for (const id of g.ids) next[id] = { ...g.start[id], x: g.start[id].x + ox, y: g.start[id].y + oy }
        setDraft(next)
        setGuides(snapped.guides)
      } else {
        const def = getBlock(design.items.find((i) => i.id === g.id)?.type ?? '')
        setDraft({ [g.id]: resizeRect(g.start, g.handle, dx, dy, def?.minSize ?? { w: 8, h: 8 }, art) })
      }
    }
    const up = (e: PointerEvent) => gesture.current && e.pointerId === gesture.current.pointer && end(true)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gesture.current) {
        e.stopPropagation()
        end(false)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', key, true)
    }
  })

  const startMove = (e: RPointerEvent, it: Item) => {
    if (!edit || e.button !== 0) return
    e.stopPropagation()
    let ids = selection
    if (e.shiftKey) {
      ids = selection.includes(it.id) ? selection.filter((x) => x !== it.id) : [...selection, it.id]
      onSelect(ids)
      return
    }
    if (!selection.includes(it.id)) {
      ids = [it.id]
      onSelect(ids)
    }
    const movable = design.items.filter((x) => ids.includes(x.id) && !x.locked)
    if (!movable.length) return
    // 누른 블록을 기준(첫 번째)으로 둔다.
    const order = [it.id, ...movable.map((m) => m.id).filter((x) => x !== it.id)].filter((id) => movable.some((m) => m.id === id))
    if (!order.length) return
    const start: Record<string, Rect> = {}
    for (const m of movable) start[m.id] = rectOf(m)
    gesture.current = { kind: 'move', ids: order, start, px: e.clientX, py: e.clientY, started: false, pointer: e.pointerId }
  }

  const startResize = (e: RPointerEvent, it: Item, handle: Handle) => {
    if (e.button !== 0) return
    e.stopPropagation()
    gesture.current = { kind: 'resize', id: it.id, handle, start: rectOf(it), px: e.clientX, py: e.clientY, pointer: e.pointerId }
  }

  const shown = draft ? { ...design, items: design.items.map((it) => (draft[it.id] ? { ...it, ...draft[it.id] } : it)) } : design
  const single = selection.length === 1 ? shown.items.find((i) => i.id === selection[0]) : undefined

  return (
    <div
      className="ub-canvas__board"
      data-drop={dropOver || undefined}
      style={{ width: art.w * zoom, height: art.h * zoom } as CSSProperties}
      onPointerDown={(e) => {
        if (edit && e.button === 0 && !e.shiftKey) onSelect([])
      }}
      onDragOver={(e) => {
        if (!edit || !e.dataTransfer.types.includes(DRAG_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDropOver(true)
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={(e) => {
        setDropOver(false)
        const type = e.dataTransfer.getData(DRAG_MIME)
        if (!edit || !type) return
        e.preventDefault()
        const p = toArt(e.clientX, e.clientY)
        if (p.x < 0 || p.y < 0 || p.x > art.w || p.y > art.h) return
        onDropBlock(type, p.x, p.y)
      }}
    >
      <Artboard
        design={shown}
        mode={mode}
        forceStill={forceStill}
        artRef={(el) => {
          artEl.current = el
          artRef(el)
        }}
        style={{ transform: `scale(${zoom})` }}
        renderItem={(it, content) => {
          const sel = selection.includes(it.id)
          return (
            <div
              key={it.id}
              className="ub-item"
              data-id={it.id}
              data-type={it.type}
              data-selected={(edit && sel) || undefined}
              data-locked={it.locked || undefined}
              style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
              onPointerDown={(e) => startMove(e, it)}
            >
              <Content live={!edit}>{content}</Content>
            </div>
          )
        }}
      >
        {edit && !design.items.some((i) => !i.hidden) && (
          <div className="ub-canvas__empty" data-noexport>
            왼쪽에서 블록을 끌어다 놓으세요
          </div>
        )}
        {edit &&
          guides.map((g, i) => (
            <span key={i} className="ub-guide" data-axis={g.axis} data-noexport style={g.axis === 'x' ? { left: g.at } : { top: g.at }} />
          ))}
        {edit && single && (
          <div
            className="ub-sel"
            data-noexport
            data-locked={single.locked || undefined}
            style={{ left: single.x, top: single.y, width: single.w, height: single.h, ['--z' as string]: zoom } as CSSProperties}
          >
            <span className="ub-dim ub-dim--w">{single.w}</span>
            <span className="ub-dim ub-dim--h">{single.h}</span>
            {!single.locked &&
              HANDLES.map((h) => (
                <span key={h} className="ub-handle" data-h={h} aria-hidden="true" onPointerDown={(e) => startResize(e, single, h)} />
              ))}
          </div>
        )}
      </Artboard>
    </div>
  )
}
