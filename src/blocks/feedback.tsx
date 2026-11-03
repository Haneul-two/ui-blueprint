import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { asBool, asList, asStr, pair } from './shared'
import type { BlockDef } from './types'

const TONES = [
  { value: 'info', label: '안내' },
  { value: 'success', label: '성공' },
  { value: 'warning', label: '주의' },
  { value: 'danger', label: '오류' },
]
const TONE_ICON: Record<string, string> = { info: 'info', success: 'check', warning: 'circle-alert', danger: 'circle-alert' }

const toast: BlockDef = {
  type: 'toast',
  name: '토스트',
  category: 'feedback',
  icon: 'bell-ring',
  size: { w: 360, h: 152 },
  minSize: { w: 240, h: 120 },
  props: [
    { key: 'trigger', label: '띄우는 버튼 글자', kind: 'text' },
    { key: 'message', label: '알림 글', kind: 'text' },
    { key: 'action', label: '되돌리기 버튼(선택)', kind: 'text' },
    { key: 'tone', label: '종류', kind: 'select', options: TONES },
    { key: 'show', label: '처음부터 보이기', kind: 'toggle' },
  ],
  defaults: { trigger: '노트 보관', message: '노트를 보관했습니다.', action: '되돌리기', tone: 'success', show: true },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Toast 위치·모양 참고',
  describe: () => '버튼을 누르면 아래에서 알림이 떠오르고 4초 뒤 사라진다. 되돌리기를 누르면 바로 닫힌다.',
  Render({ props }) {
    const [show, setShow] = useState(asBool(props.show))
    const [gen, setGen] = useState(0)
    useEffect(() => setShow(asBool(props.show)), [props.show])
    useEffect(() => {
      if (!gen) return
      const t = window.setTimeout(() => setShow(false), 4000)
      return () => window.clearTimeout(t)
    }, [gen])
    const tone = asStr(props.tone, 'info')
    return (
      <div className="bk-toast-demo">
        <button
          type="button"
          className="bk-btn bk-btn--secondary"
          onClick={() => {
            setShow(true)
            setGen((g) => g + 1)
          }}
        >
          {asStr(props.trigger)}
        </button>
        <div className="bk-toast" data-tone={tone} data-show={show || undefined} role="status" aria-live="polite">
          {show && (
            <>
              <Icon name={TONE_ICON[tone] ?? 'info'} size={16} />
              <span>{asStr(props.message)}</span>
              {asStr(props.action) && (
                <button type="button" onClick={() => setShow(false)}>
                  {asStr(props.action)}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  },
}

const banner: BlockDef = {
  type: 'banner',
  name: '알림 배너',
  category: 'feedback',
  icon: 'megaphone',
  size: { w: 720, h: 64 },
  minSize: { w: 240, h: 48 },
  props: [
    { key: 'message', label: '글', kind: 'text' },
    { key: 'link', label: '링크 글(선택)', kind: 'text' },
    { key: 'tone', label: '종류', kind: 'select', options: TONES },
    { key: 'dismiss', label: '닫기 버튼', kind: 'toggle' },
  ],
  defaults: { message: '11월 10일 새벽 2시부터 30분간 점검합니다.', link: '자세히', tone: 'warning', dismiss: true },
  interactive: true,
  motion: false,
  source: '시스템 배너 패턴(Montage 디자인 시스템 구조 참고)',
  describe: () => '닫기를 누르면 배너가 사라진다.',
  Render({ props }) {
    const [open, setOpen] = useState(true)
    const tone = asStr(props.tone, 'info')
    if (!open)
      return (
        <button type="button" className="bk-ghost-restore" onClick={() => setOpen(true)}>
          배너 다시 보기
        </button>
      )
    return (
      <div className="bk-banner" data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
        <Icon name={TONE_ICON[tone] ?? 'info'} size={18} />
        <p>{asStr(props.message)}</p>
        {asStr(props.link) && (
          <a href="#" onClick={(e) => e.preventDefault()}>
            {asStr(props.link)}
          </a>
        )}
        {asBool(props.dismiss) && (
          <button type="button" aria-label="배너 닫기" onClick={() => setOpen(false)}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    )
  },
}

const modal: BlockDef = {
  type: 'modal',
  name: '모달',
  category: 'feedback',
  icon: 'app-window',
  size: { w: 640, h: 400 },
  minSize: { w: 320, h: 264 },
  props: [
    { key: 'trigger', label: '여는 버튼 글자', kind: 'text' },
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'body', label: '내용', kind: 'textarea' },
    { key: 'confirm', label: '확인 버튼', kind: 'text' },
    { key: 'danger', label: '위험한 작업', kind: 'toggle' },
    { key: 'open', label: '처음부터 열림', kind: 'toggle' },
  ],
  defaults: { trigger: '노트 삭제', title: '이 노트를 삭제할까요?', body: '삭제한 노트는 30일 동안 휴지통에 남습니다.', confirm: '삭제', danger: true, open: true },
  interactive: true,
  motion: false,
  source: 'Transitions.dev의 모달 열기·닫기 전환 기법',
  describe: () => '버튼을 누르면 배경이 어두워지며 대화상자가 커지듯 열린다. 취소·확인·Esc·배경 클릭으로 닫히고 포커스는 여는 버튼으로 돌아간다. 이 블록의 영역이 모달이 덮는 화면이다.',
  Render({ props, mode, still }) {
    const [open, setOpen] = useState(asBool(props.open))
    useEffect(() => setOpen(asBool(props.open)), [props.open])
    const trig = useRef<HTMLButtonElement>(null)
    const box = useRef<HTMLDivElement>(null)
    const id = useId()
    const close = () => {
      setOpen(false)
      trig.current?.focus()
    }
    // 처음부터 열린 모달은 포커스가 바깥에 있다. 미리보기에서는 바깥에서 누른 Esc로도 닫히고,
    // 바깥에서 Tab을 누르면 모달 안으로 들어오게 한다.
    useEffect(() => {
      if (!open || mode !== 'preview') return
      const on = (e: KeyboardEvent) => {
        // 열린 모달이 여럿이면 먼저 받은 하나만 처리한다.
        if (e.defaultPrevented) return
        const inside = !!box.current?.contains(document.activeElement)
        if (inside) return // 안쪽 키 처리는 모달 자신이 한다
        const t = e.target as HTMLElement | null
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
        if (e.key === 'Escape') {
          e.preventDefault()
          close()
        } else if (e.key === 'Tab' && t?.closest('.ub-live') && !t.closest('.bk-modal-demo')) {
          e.preventDefault()
          box.current?.querySelector<HTMLElement>('[data-first]')?.focus()
        }
      }
      window.addEventListener('keydown', on)
      return () => window.removeEventListener('keydown', on)
    }, [open, mode]) // eslint-disable-line react-hooks/exhaustive-deps
    return (
      <div className="bk-modal-demo">
        <button ref={trig} type="button" className={`bk-btn ${asBool(props.danger) ? 'bk-btn--danger' : 'bk-btn--primary'}`} onClick={() => {
            setOpen(true)
            requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('[data-first]')?.focus())
          }}>
          {asStr(props.trigger)}
        </button>
        {open && (
          <div className="bk-modal__scrim" data-still={still || undefined} onPointerDown={(e) => e.target === e.currentTarget && close()}>
            <div
              ref={box}
              className="bk-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={id}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  close()
                }
                if (e.key === 'Tab') {
                  const f = box.current?.querySelectorAll<HTMLElement>('button')
                  if (!f?.length) return
                  const first = f[0]
                  const last = f[f.length - 1]
                  if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                  }
                }
              }}
            >
              <strong id={id}>{asStr(props.title)}</strong>
              <p>{asStr(props.body)}</p>
              <div className="bk-modal__actions">
                <button type="button" className="bk-btn bk-btn--secondary" data-first onClick={close}>
                  취소
                </button>
                <button type="button" className={`bk-btn ${asBool(props.danger) ? 'bk-btn--danger' : 'bk-btn--primary'}`} onClick={close}>
                  {asStr(props.confirm)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
}

const tooltip: BlockDef = {
  type: 'tooltip',
  name: '툴팁',
  category: 'feedback',
  icon: 'circle-help',
  size: { w: 240, h: 112 },
  minSize: { w: 160, h: 96 },
  props: [
    { key: 'label', label: '버튼 글자', kind: 'text' },
    { key: 'tip', label: '툴팁 글', kind: 'text' },
    { key: 'show', label: '항상 보이기', kind: 'toggle' },
  ],
  defaults: { label: '공유 링크', tip: '링크가 있는 사람은 누구나 볼 수 있습니다', show: false },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Tooltip 모양',
  describe: () => '마우스를 올리거나 키보드 포커스가 가면 위에 설명이 뜬다.',
  Render({ props }) {
    const [hover, setHover] = useState(false)
    const id = useId()
    const show = hover || asBool(props.show)
    return (
      <div className="bk-tip-demo">
        <span className="bk-tip" role="tooltip" id={id} data-show={show || undefined}>
          {asStr(props.tip)}
        </span>
        <button
          type="button"
          className="bk-btn bk-btn--secondary"
          aria-describedby={id}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
        >
          <Icon name="link" size={16} />
          {asStr(props.label)}
        </button>
      </div>
    )
  },
}

const emptyState: BlockDef = {
  type: 'empty-state',
  name: '빈 상태',
  category: 'feedback',
  icon: 'inbox',
  size: { w: 480, h: 280 },
  minSize: { w: 240, h: 200 },
  props: [
    { key: 'icon', label: '아이콘 이름', kind: 'text' },
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'body', label: '설명', kind: 'textarea' },
    { key: 'cta', label: '다음 행동 버튼', kind: 'text' },
  ],
  defaults: { icon: 'file-text', title: '아직 노트가 없습니다', body: '첫 노트를 쓰면 여기에 모입니다.', cta: '새 노트 쓰기' },
  interactive: true,
  motion: false,
  source: '빈 상태 = 안내 + 다음 행동(프론트엔드 체크리스트)',
  Render({ props }) {
    return (
      <div className="bk-empty">
        <span className="bk-empty__icon">
          <Icon name={asStr(props.icon, 'inbox')} size={24} />
        </span>
        <strong>{asStr(props.title)}</strong>
        <p>{asStr(props.body)}</p>
        {asStr(props.cta) && (
          <button type="button" className="bk-btn bk-btn--primary">
            <Icon name="plus" size={16} />
            {asStr(props.cta)}
          </button>
        )}
      </div>
    )
  },
}

const skeleton: BlockDef = {
  type: 'skeleton',
  name: '스켈레톤 로딩',
  category: 'feedback',
  icon: 'loader',
  size: { w: 400, h: 240 },
  minSize: { w: 200, h: 96 },
  props: [
    { key: 'rows', label: '줄 수', kind: 'number', min: 1, max: 8 },
    { key: 'avatar', label: '동그라미 자리', kind: 'toggle' },
  ],
  defaults: { rows: 3, avatar: true },
  interactive: false,
  motion: true,
  source: 'stageshow loading 예시(내용과 같은 모양의 자리)',
  describe: () => '내용 자리가 옅게 반짝이며 불러오는 중임을 보여 준다.',
  Render({ props, still }) {
    const n = typeof props.rows === 'number' ? props.rows : 3
    return (
      <div className="bk-card bk-skel" data-still={still || undefined} aria-busy="true" aria-label="불러오는 중">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="bk-skel__row" aria-hidden="true">
            {asBool(props.avatar) && <span className="bk-skel__dot" />}
            <span className="bk-skel__lines">
              <span style={{ width: `${70 - i * 8}%` }} />
              <span style={{ width: `${45 - i * 4}%` }} />
            </span>
          </div>
        ))}
      </div>
    )
  },
}

const badges: BlockDef = {
  type: 'badges',
  name: '배지 묶음',
  category: 'feedback',
  icon: 'tag',
  size: { w: 400, h: 48 },
  minSize: { w: 120, h: 32 },
  props: [{ key: 'items', label: '배지(글자|종류: neutral·success·warning·danger·accent)', kind: 'list' }],
  defaults: { items: ['공유됨|success', '검토 중|warning', '오류|danger', '새 기능|accent', '보관|neutral'] },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Badge·Chip 모양',
  Render({ props }) {
    return (
      <div className="bk-badges">
        {asList(props.items).map(pair).map(([t, tone], i) => (
          <span key={i} className="bk-badge" data-tone={tone || 'neutral'}>
            {t}
          </span>
        ))}
      </div>
    )
  },
}

export const feedbackBlocks = [toast, banner, modal, tooltip, emptyState, skeleton, badges]
