import { useMemo, useState } from 'react'
import { BLOCKS } from '../blocks/registry'
import { CATEGORIES, type Category } from '../blocks/types'
import { Icon } from '../ui/Icon'
import { DRAG_MIME } from './Canvas'

export function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return BLOCKS.filter((b) => (cat === 'all' || b.category === cat) && (!s || b.name.toLowerCase().includes(s) || b.type.includes(s) || b.source.toLowerCase().includes(s)))
  }, [cat, q])

  return (
    <div className="ub-palette">
      <label className="ub-search">
        <Icon name="search" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="블록 찾기" aria-label="블록 찾기" />
        {q && (
          <button type="button" aria-label="검색어 지우기" onClick={() => setQ('')}>
            <Icon name="x" size={14} />
          </button>
        )}
      </label>
      <div className="ub-chips" role="group" aria-label="블록 분류">
        <button type="button" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          전체 {BLOCKS.length}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="ub-palette__empty">
          <p>맞는 블록이 없습니다</p>
          <button type="button" className="ub-btn" onClick={() => setQ('')}>
            검색어 지우기
          </button>
        </div>
      ) : (
        <ul className="ub-palette__list" aria-label="블록 목록. Enter로 추가, 캔버스로 끌어 놓기">
          {list.map((b) => (
            <li key={b.type}>
              <button
                type="button"
                className="ub-tile"
                draggable
                data-block={b.type}
                title={`${b.name} · 출처: ${b.source}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, b.type)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => onAdd(b.type)}
              >
                <Icon name={b.icon} size={18} />
                <span>{b.name}</span>
                {b.interactive && (
                  <>
                    <i className="ub-tile__live" aria-hidden="true" />
                    <span className="ub-sr">(미리보기에서 동작)</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
