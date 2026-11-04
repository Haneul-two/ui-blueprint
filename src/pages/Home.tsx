import { useRef, useState } from 'react'
import { CONFIG, type ArtboardKind } from '../config'
import { BLOCKS, KNOWN_TYPES } from '../blocks/registry'
import { newDesign, uid } from '../model/design'
import { deleteDesign, listDesigns, loadDesignRaw, saveDesign, type IndexEntry } from '../model/storage'
import { validateDesign } from '../model/validate'
import { pickJsonFile } from '../io/file'
import { PRESETS } from '../presets'
import { go } from '../app/router'
import { Icon } from '../ui/Icon'
import { radioKeys } from '../ui/radioKeys'
import { Toaster, useToasts } from '../ui/toast'
import type { Design } from '../model/types'
import { HomeHero } from './HomeHero'

const KIND_ICON: Record<ArtboardKind, string> = { desktop: 'monitor', tablet: 'tablet', phone: 'smartphone' }

function open(d: Design, notify: (m: string, t?: 'error') => void) {
  if (!saveDesign(d)) return notify('브라우저에 저장하지 못했습니다. 사생활 보호 모드이거나 저장 공간이 찼습니다.', 'error')
  go(`#/edit/${encodeURIComponent(d.id)}`)
}

const when = (t: number) => new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function Home() {
  const [list, setList] = useState<IndexEntry[]>(listDesigns)
  const [kind, setKind] = useState<ArtboardKind>('desktop')
  const [renaming, setRenaming] = useState<string | null>(null)
  const { list: toasts, notify } = useToasts()
  const startRef = useRef<HTMLElement>(null)
  const refresh = () => setList(listDesigns())

  const importJson = async () => {
    const f = await pickJsonFile()
    if (!f) return
    let raw: unknown
    try {
      raw = JSON.parse(f.text)
    } catch {
      return notify('JSON 형식이 아닌 파일입니다.', 'error')
    }
    const r = validateDesign(raw, KNOWN_TYPES)
    if (!r.ok) return notify(`불러오지 못했습니다. ${r.error}`, 'error')
    if (r.unknownTypes.length) notify(`이 버전에 없는 블록 ${r.unknownTypes.length}종은 자리표시로 보입니다.`)
    open({ ...r.design, id: uid('d'), updatedAt: Date.now() }, notify)
  }

  const withRaw = (id: string, fn: (d: Design) => void) => {
    const r = validateDesign(loadDesignRaw(id), KNOWN_TYPES)
    if (r.ok) fn(r.design)
    else notify('저장된 설계를 읽지 못했습니다.', 'error')
  }

  return (
    <div className="ub-home">
      <HomeHero
        blocks={BLOCKS.length}
        onImport={importJson}
        onStart={() => startRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      />
      <main className="ub-home__body">
        <section className="ub-home__start" aria-labelledby="start-h" ref={startRef}>
          <h2 id="start-h">
            <small className="ub-idx">01</small> 새로 시작
          </h2>
          <div className="ub-start">
            <div className="ub-start__blank">
              <strong>빈 설계</strong>
              <div className="ub-kinds" role="radiogroup" onKeyDown={radioKeys} aria-label="아트보드 종류">
                {(Object.keys(CONFIG.artboards) as ArtboardKind[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
                    <Icon name={KIND_ICON[k]} size={18} />
                    <span>{CONFIG.artboards[k].label}</span>
                  </button>
                ))}
              </div>
              <small className="ub-mono">
                {CONFIG.artboards[kind].w} × {CONFIG.artboards[kind].h}
              </small>
              <button type="button" className="ub-btn ub-btn--primary" onClick={() => open(newDesign('새 설계', kind), notify)}>
                <Icon name="plus" size={14} /> 빈 설계로 시작
              </button>
            </div>
            {PRESETS.map((p, n) => {
              const d = p.make()
              return (
                <button key={p.id} type="button" className="ub-start__preset" onClick={() => open({ ...d, id: uid('d'), updatedAt: Date.now() }, notify)}>
                  <span className="ub-start__thumb" aria-hidden="true" data-kind={d.artboard.kind}>
                    <svg viewBox={`0 0 ${d.artboard.w} ${d.artboard.h}`} preserveAspectRatio="xMidYMin meet">
                      {d.items.map((it, i) => (
                        <rect key={it.id} x={it.x} y={it.y} width={it.w} height={it.h} rx={12} pathLength={100} style={{ ['--i' as string]: i }} />
                      ))}
                    </svg>
                    <span className="ub-start__no">A-0{n + 1}</span>
                  </span>
                  <strong>{d.name}</strong>
                  <small>{p.desc}</small>
                  <small className="ub-mono">
                    {d.artboard.w} × {d.artboard.h} · 블록 {d.items.length}
                  </small>
                </button>
              )
            })}
          </div>
        </section>

        <section className="ub-home__list" aria-labelledby="list-h">
          <h2 id="list-h">
            <small className="ub-idx">02</small> 내 설계 {list.length > 0 && <span>{list.length}</span>}
          </h2>
          {list.length === 0 ? (
            <p className="ub-hint">아직 저장된 설계가 없습니다. 위에서 빈 설계나 예시로 시작하세요.</p>
          ) : (
            <ul className="ub-designs">
              {list.map((e) => (
                <li key={e.id}>
                  <Icon name={KIND_ICON[e.kind] ?? 'monitor'} size={18} />
                  {renaming === e.id ? (
                    <form
                      className="ub-designs__rename"
                      onSubmit={(ev) => {
                        ev.preventDefault()
                        const name = String(new FormData(ev.currentTarget).get('name') ?? '').trim().slice(0, CONFIG.limits.name)
                        if (name) withRaw(e.id, (d) => saveDesign({ ...d, name, updatedAt: Date.now() }))
                        setRenaming(null)
                        refresh()
                      }}
                    >
                      <input name="name" defaultValue={e.name} aria-label="새 이름" autoFocus onKeyDown={(ev) => ev.key === 'Escape' && setRenaming(null)} />
                      <button type="submit" className="ub-btn">
                        저장
                      </button>
                    </form>
                  ) : (
                    <a href={`#/edit/${encodeURIComponent(e.id)}`} className="ub-designs__name">
                      <strong>{e.name}</strong>
                      <small>
                        블록 {e.count}개, {when(e.updatedAt)} 수정
                      </small>
                    </a>
                  )}
                  <div className="ub-designs__actions">
                    <button type="button" className="ub-iconbtn" aria-label={`${e.name} 이름 바꾸기`} onClick={() => setRenaming(e.id)}>
                      <Icon name="type" size={14} />
                    </button>
                    <button
                      type="button"
                      className="ub-iconbtn"
                      aria-label={`${e.name} 복제`}
                      onClick={() =>
                        withRaw(e.id, (d) => {
                          saveDesign({ ...d, id: uid('d'), name: `${d.name} 사본`.slice(0, CONFIG.limits.name), updatedAt: Date.now() })
                          refresh()
                        })
                      }
                    >
                      <Icon name="copy" size={14} />
                    </button>
                    <button
                      type="button"
                      className="ub-iconbtn ub-iconbtn--danger"
                      aria-label={`${e.name} 삭제`}
                      onClick={() => {
                        if (!confirm(`"${e.name}" 설계를 지울까요? 되돌릴 수 없습니다.`)) return
                        deleteDesign(e.id)
                        refresh()
                        notify('설계를 지웠습니다.')
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <footer className="ub-home__foot">
          <p>설계는 이 브라우저에만 저장됩니다. 부품 일부는 stageshow 키트(MIT)를 바탕으로 했고, 실존 브랜드를 흉내 낸 블록은 넣지 않았습니다.</p>
        </footer>
      </main>
      <Toaster list={toasts} />
    </div>
  )
}
