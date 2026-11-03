import { useLayoutEffect, useRef, useState } from 'react'
import { BLOCKS, defaultProps } from '../blocks/registry'
import { CATEGORIES, type BlockDef } from '../blocks/types'
import { DEFAULT_THEME } from '../model/design'
import type { Design } from '../model/types'
import { Artboard } from '../app/Artboard'
import { Icon } from '../ui/Icon'

/** 블록 한 개를 기본 크기 그대로 그린 뒤, 카드 폭에 맞춰 줄여 보인다. */
function Specimen({ def, mode }: { def: BlockDef; mode: 'light' | 'dark' }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const w = def.size.w + 32
  const h = def.size.h + 32
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const read = () => setScale(Math.min(1, el.clientWidth / w))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  const design: Design = {
    v: 1,
    id: `spec-${def.type}`,
    name: def.name,
    updatedAt: 0,
    artboard: { kind: 'desktop', w, h },
    theme: { ...DEFAULT_THEME, mode },
    items: [{ id: def.type, type: def.type, x: 16, y: 16, w: def.size.w, h: def.size.h, props: defaultProps(def) }],
  }
  return (
    <div className="ub-specimen__stage" data-theme={mode} ref={box} style={{ height: h * scale }}>
      <Artboard design={design} mode="preview" style={{ transform: `scale(${scale})` }} className="ub-specimen__art" />
    </div>
  )
}

export function Blocks({ theme }: { theme?: string }) {
  const mode = theme === 'dark' ? 'dark' : 'light'
  return (
    <div className="ub-blocks">
      <header className="ub-blocks__head">
        <a className="ub-iconbtn" href="#/" aria-label="설계 목록으로">
          <Icon name="home" size={16} />
        </a>
        <div>
          <h1>블록 {BLOCKS.length}개</h1>
          <p>모두 실제로 눌러 볼 수 있습니다. 설계 화면 왼쪽 목록에서 끌어다 놓으면 됩니다.</p>
        </div>
        <a className="ub-btn" href={mode === 'dark' ? '#/blocks' : '#/blocks?theme=dark'}>
          <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={14} /> {mode === 'dark' ? '밝은 화면으로' : '어두운 화면으로'}
        </a>
      </header>
      {CATEGORIES.map((c) => (
        <section key={c.id} aria-labelledby={`cat-${c.id}`} className="ub-blocks__cat">
          <h2 id={`cat-${c.id}`}>
            {c.label} <span>{BLOCKS.filter((b) => b.category === c.id).length}</span>
          </h2>
          <div className="ub-blocks__grid">
            {BLOCKS.filter((b) => b.category === c.id).map((b) => (
              <article key={b.type} className="ub-specimen" data-type={b.type} data-wide={b.size.w > 600 || undefined}>
                <Specimen def={b} mode={mode} />
                <div className="ub-specimen__meta">
                  <strong>
                    <Icon name={b.icon} size={14} /> {b.name}
                  </strong>
                  {b.interactive && <span className="ub-pill">눌러 보기</span>}
                  {b.motion && <span className="ub-pill">움직임</span>}
                  <small>{b.source}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
