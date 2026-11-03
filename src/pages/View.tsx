import { useEffect, useState } from 'react'
import { KNOWN_TYPES } from '../blocks/registry'
import { uid } from '../model/design'
import { saveDesign } from '../model/storage'
import { validateDesign } from '../model/validate'
import type { Design } from '../model/types'
import { decodeDesign } from '../io/share'
import { go } from '../app/router'
import { ScaledPreview } from '../editor/Editor'
import { Icon } from '../ui/Icon'

type State = { s: 'loading' } | { s: 'error' } | { s: 'ok'; design: Design; unknown: number }

export function View({ data }: { data: string }) {
  const [st, setSt] = useState<State>({ s: 'loading' })
  useEffect(() => {
    let live = true
    setSt({ s: 'loading' })
    decodeDesign(data).then((raw) => {
      if (!live) return
      const r = raw ? validateDesign(raw, KNOWN_TYPES) : null
      setSt(r && r.ok ? { s: 'ok', design: r.design, unknown: r.unknownTypes.length } : { s: 'error' })
    })
    return () => {
      live = false
    }
  }, [data])

  if (st.s === 'loading')
    return (
      <div className="ub-view ub-view--center" aria-busy="true">
        <Icon name="loader" size={20} className="bk-spin" /> 설계를 여는 중
      </div>
    )
  if (st.s === 'error')
    return (
      <div className="ub-view ub-view--center">
        <strong>링크가 깨졌거나 이 버전에서 열 수 없습니다.</strong>
        <p>링크를 끝까지 복사했는지 확인하거나, 보낸 사람에게 설계 파일(JSON)을 받아 불러오세요.</p>
        <a className="ub-btn ub-btn--primary" href="#/">
          설계 목록으로
        </a>
      </div>
    )
  const d = st.design
  return (
    <div className="ub-view">
      <header className="ub-view__head">
        <a className="ub-iconbtn" href="#/" aria-label="설계 목록으로">
          <Icon name="home" size={16} />
        </a>
        <div>
          <strong>{d.name}</strong>
          <small>보기 전용. 블록을 눌러 동작을 확인할 수 있습니다.</small>
        </div>
        <button
          type="button"
          className="ub-btn ub-btn--primary"
          onClick={() => {
            const copy = { ...d, id: uid('d'), name: `${d.name} 사본`.slice(0, 80), updatedAt: Date.now() }
            if (saveDesign(copy)) go(`#/edit/${encodeURIComponent(copy.id)}`)
          }}
        >
          <Icon name="copy" size={14} /> 내 설계로 복사
        </button>
      </header>
      {st.unknown > 0 && <p className="ub-alert">이 버전에 없는 블록 {st.unknown}종은 자리표시로 보입니다.</p>}
      <ScaledPreview design={d} />
    </div>
  )
}
