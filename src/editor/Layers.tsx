import { getBlock } from '../blocks/registry'
import type { Design, Item } from '../model/types'
import { Icon } from '../ui/Icon'

interface Props {
  design: Design
  selection: string[]
  onSelect: (ids: string[], additive: boolean) => void
  onPatch: (id: string, patch: Partial<Item>) => void
  onShift: (id: string, dir: 1 | -1) => void
}

/** 위가 앞(겹침 순서가 높은 것). 숨긴 블록은 여기서만 고를 수 있다. */
export function Layers({ design, selection, onSelect, onPatch, onShift }: Props) {
  const list = [...design.items].reverse()
  if (!list.length) return <p className="ub-hint ub-layers__empty">아직 블록이 없습니다.</p>
  return (
    <ul className="ub-layers" aria-label="레이어. 위일수록 앞에 놓입니다">
      {list.map((it, i) => {
        const def = getBlock(it.type)
        const sel = selection.includes(it.id)
        const label = def?.name ?? it.type
        return (
          <li key={it.id} data-selected={sel || undefined} data-hidden={it.hidden || undefined}>
            <button type="button" className="ub-layers__name" aria-pressed={sel} onClick={(e) => onSelect([it.id], e.shiftKey)}>
              <Icon name={def?.icon ?? 'square'} size={14} />
              <span>{label}</span>
              {it.hidden && <small>숨김</small>}
            </button>
            <button type="button" className="ub-iconbtn" aria-label={`${label} ${it.hidden ? '보이기' : '숨기기'}`} aria-pressed={!!it.hidden} onClick={() => onPatch(it.id, { hidden: !it.hidden || undefined })}>
              <Icon name={it.hidden ? 'eye-off' : 'eye'} size={14} />
            </button>
            <button type="button" className="ub-iconbtn" aria-label={`${label} ${it.locked ? '잠금 풀기' : '잠그기'}`} aria-pressed={!!it.locked} onClick={() => onPatch(it.id, { locked: !it.locked || undefined })}>
              <Icon name={it.locked ? 'lock' : 'lock-open'} size={14} />
            </button>
            <button type="button" className="ub-iconbtn" aria-label={`${label} 앞으로`} disabled={i === 0} onClick={() => onShift(it.id, 1)}>
              <Icon name="arrow-up" size={14} />
            </button>
            <button type="button" className="ub-iconbtn" aria-label={`${label} 뒤로`} disabled={i === list.length - 1} onClick={() => onShift(it.id, -1)}>
              <Icon name="arrow-down" size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
