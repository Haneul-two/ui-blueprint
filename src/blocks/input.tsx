import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { asBool, asList, asNum, asStr } from './shared'
import type { BlockDef } from './types'

const button: BlockDef = {
  type: 'button',
  name: '버튼',
  category: 'input',
  icon: 'rect',
  size: { w: 160, h: 48 },
  minSize: { w: 56, h: 32 },
  props: [
    { key: 'label', label: '글자', kind: 'text' },
    {
      key: 'variant',
      label: '종류',
      kind: 'select',
      options: [
        { value: 'primary', label: '주 버튼' },
        { value: 'secondary', label: '보조 버튼' },
        { value: 'ghost', label: '글자 버튼' },
        { value: 'danger', label: '위험' },
      ],
    },
    { key: 'icon', label: '아이콘 이름(선택)', kind: 'text' },
    { key: 'loading', label: '누르면 처리 중 표시', kind: 'toggle' },
  ],
  defaults: { label: '저장하기', variant: 'primary', icon: '', loading: true },
  interactive: true,
  motion: false,
  source: 'Animated Buttons의 눌림 피드백, stageshow 키트 Spinner',
  describe: (p) => (p.loading ? '누르면 1.2초 동안 "처리 중"으로 바뀌고 비활성화된 뒤 돌아온다.' : '누르면 눌림 표시가 난다.'),
  Render({ props }) {
    const [busy, setBusy] = useState(false)
    useEffect(() => {
      if (!busy) return
      const t = window.setTimeout(() => setBusy(false), 1200)
      return () => window.clearTimeout(t)
    }, [busy])
    const ic = asStr(props.icon)
    return (
      <button
        type="button"
        className={`bk-btn bk-btn--${asStr(props.variant, 'primary')} bk-fill`}
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => asBool(props.loading) && setBusy(true)}
      >
        {busy ? <Icon name="loader" size={16} className="bk-spin" /> : ic ? <Icon name={ic} size={16} /> : null}
        {busy ? '처리 중' : asStr(props.label)}
      </button>
    )
  },
}

function TextInput({ label, placeholder, help, type = 'text', icon }: { label: string; placeholder: string; help?: string; type?: string; icon?: string }) {
  const id = useId()
  return (
    <div className="bk-field">
      {label && <label htmlFor={id}>{label}</label>}
      <div className="bk-field__box">
        {icon && <Icon name={icon} size={16} />}
        <input id={id} type={type} placeholder={placeholder} />
      </div>
      {help && <small>{help}</small>}
    </div>
  )
}

const textField: BlockDef = {
  type: 'text-field',
  name: '입력칸',
  category: 'input',
  icon: 'text-input',
  size: { w: 320, h: 96 },
  minSize: { w: 160, h: 64 },
  props: [
    { key: 'label', label: '이름표', kind: 'text' },
    { key: 'placeholder', label: '안내 글', kind: 'text' },
    { key: 'help', label: '도움말', kind: 'text' },
    { key: 'type', label: '종류', kind: 'select', options: [{ value: 'text', label: '글자' }, { value: 'email', label: '이메일' }, { value: 'password', label: '비밀번호' }, { value: 'number', label: '숫자' }] },
  ],
  defaults: { label: '팀 이름', placeholder: '예: 마케팅팀', help: '나중에 바꿀 수 있습니다.', type: 'text' },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Field 구성 참고',
  Render({ props }) {
    return <TextInput label={asStr(props.label)} placeholder={asStr(props.placeholder)} help={asStr(props.help)} type={asStr(props.type, 'text')} />
  },
}

const search: BlockDef = {
  type: 'search',
  name: '검색창',
  category: 'input',
  icon: 'search',
  size: { w: 400, h: 48 },
  minSize: { w: 160, h: 40 },
  props: [
    { key: 'placeholder', label: '안내 글', kind: 'text' },
    { key: 'suggest', label: '추천 검색어(줄마다)', kind: 'list' },
  ],
  defaults: { placeholder: '노트, 사람, 일정 검색', suggest: ['회의록', '회고', '고객 인터뷰', '주간 보고'] },
  interactive: true,
  motion: false,
  source: '자동완성 패턴(Component Gallery)',
  describe: () => '글자를 치면 0.2초 뒤 추천 검색어가 걸러져 아래에 뜬다. 방향키·Enter로 고른다.',
  Render({ props }) {
    const [q, setQ] = useState('')
    const [shown, setShown] = useState('')
    const [hi, setHi] = useState(0)
    const id = useId()
    useEffect(() => {
      const t = window.setTimeout(() => setShown(q), 200)
      return () => window.clearTimeout(t)
    }, [q])
    const list = shown ? asList(props.suggest).filter((s) => s.includes(shown)) : []
    const open = list.length > 0 && q === shown
    return (
      <div className="bk-search">
        <div className="bk-field__box">
          <Icon name="search" size={16} />
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={id}
            aria-label="검색"
            value={q}
            placeholder={asStr(props.placeholder)}
            onChange={(e) => {
              setQ(e.target.value)
              setHi(0)
            }}
            onKeyDown={(e) => {
              if (!open) return
              if (e.key === 'ArrowDown') setHi((h) => (h + 1) % list.length)
              else if (e.key === 'ArrowUp') setHi((h) => (h - 1 + list.length) % list.length)
              else if (e.key === 'Enter') {
                setQ(list[hi])
                setShown('')
              } else return
              e.preventDefault()
            }}
          />
        </div>
        {open && (
          <ul id={id} role="listbox" className="bk-pop">
            {list.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === hi}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setQ(s)
                  setShown('')
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
}

const toggle: BlockDef = {
  type: 'toggle',
  name: '토글',
  category: 'input',
  icon: 'toggle',
  size: { w: 320, h: 64 },
  minSize: { w: 160, h: 40 },
  props: [
    { key: 'label', label: '이름표', kind: 'text' },
    { key: 'desc', label: '설명', kind: 'text' },
    { key: 'on', label: '처음에 켜짐', kind: 'toggle' },
  ],
  defaults: { label: '이메일 알림', desc: '새 댓글이 달리면 알려 드립니다.', on: true },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Toggle 모양',
  describe: () => '누르면 켜짐/꺼짐이 바뀐다.',
  Render({ props }) {
    const [on, setOn] = useState(asBool(props.on))
    useEffect(() => setOn(asBool(props.on)), [props.on])
    return (
      <div className="bk-toggle">
        <div>
          <strong>{asStr(props.label)}</strong>
          {asStr(props.desc) && <small>{asStr(props.desc)}</small>}
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label={asStr(props.label) || '토글'} className="bk-switch" onClick={() => setOn((v) => !v)}>
          <span />
        </button>
      </div>
    )
  },
}

function useChoice(initial: number, n: number) {
  const [v, setV] = useState(initial)
  useEffect(() => setV(initial), [initial])
  return [Math.min(Math.max(0, v), Math.max(0, n - 1)), setV] as const
}

const segmented: BlockDef = {
  type: 'segmented',
  name: '세그먼트',
  category: 'input',
  icon: 'split',
  size: { w: 320, h: 40 },
  minSize: { w: 120, h: 32 },
  props: [
    { key: 'items', label: '항목(줄마다)', kind: 'list' },
    { key: 'value', label: '처음 선택(1부터)', kind: 'number', min: 1, max: 8 },
  ],
  defaults: { items: ['일', '주', '월', '년'], value: 2 },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Segmented 모양',
  describe: () => '누른 칸으로 선택 표시가 미끄러져 옮겨 간다.',
  Render({ props }) {
    const items = asList(props.items)
    const [v, setV] = useChoice(asNum(props.value, 1) - 1, items.length)
    return (
      <div className="bk-seg" role="radiogroup" aria-label="보기 단위" style={{ ['--n' as string]: items.length, ['--i' as string]: v }}>
        <span className="bk-seg__thumb" aria-hidden="true" />
        {items.map((it, i) => (
          <button key={i} type="button" role="radio" aria-checked={i === v} onClick={() => setV(i)}>
            {it}
          </button>
        ))}
      </div>
    )
  },
}

const tabs: BlockDef = {
  type: 'tabs',
  name: '탭',
  category: 'input',
  icon: 'layout-template',
  size: { w: 560, h: 240 },
  minSize: { w: 240, h: 120 },
  props: [{ key: 'tabs', label: '탭(이름|내용)', kind: 'list' }],
  defaults: {
    tabs: ['개요|이번 주 노트 128개, 공유 42개, 댓글 316개가 쌓였습니다.', '활동|가장 활발한 시간은 화요일 오전 10시입니다.', '설정|알림과 공유 범위를 여기서 바꿉니다.'],
  },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Tabs 모양, WAI-ARIA 탭 패턴',
  describe: () => '탭을 누르거나 좌우 방향키로 옮기면 아래 내용이 바뀐다.',
  Render({ props }) {
    const list = asList(props.tabs).map((l) => {
      const i = l.indexOf('|')
      return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)]
    })
    const [v, setV] = useChoice(0, list.length)
    const id = useId()
    const refs = useRef<(HTMLButtonElement | null)[]>([])
    const go = (i: number) => {
      const n = (i + list.length) % list.length
      setV(n)
      refs.current[n]?.focus()
    }
    return (
      <div className="bk-card bk-tabs">
        <div role="tablist" className="bk-tabs__list">
          {list.map(([t], i) => (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${id}t${i}`}
              aria-selected={i === v}
              aria-controls={`${id}p${i}`}
              tabIndex={i === v ? 0 : -1}
              onClick={() => setV(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') go(v + 1)
                else if (e.key === 'ArrowLeft') go(v - 1)
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {list.map(([, body], i) => (
          <div key={i} role="tabpanel" id={`${id}p${i}`} aria-labelledby={`${id}t${i}`} hidden={i !== v} className="bk-tabs__panel">
            {body}
          </div>
        ))}
      </div>
    )
  },
}

const dropdown: BlockDef = {
  type: 'dropdown',
  name: '드롭다운',
  category: 'input',
  icon: 'chevron-down',
  size: { w: 240, h: 72 },
  minSize: { w: 144, h: 40 },
  props: [
    { key: 'label', label: '이름표', kind: 'text' },
    { key: 'options', label: '항목(줄마다)', kind: 'list' },
  ],
  defaults: { label: '공유 범위', options: ['나만 보기', '팀 전체', '링크가 있는 사람'] },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Menu 모양',
  describe: () => '누르면 항목 목록이 열리고, 고르면 닫히며 값이 바뀐다. Esc로 닫는다.',
  Render({ props }) {
    const opts = asList(props.options)
    const [open, setOpen] = useState(false)
    const [v, setV] = useState(0)
    const id = useId()
    const root = useRef<HTMLDivElement>(null)
    useEffect(() => {
      if (!open) return
      const off = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
      document.addEventListener('pointerdown', off)
      return () => document.removeEventListener('pointerdown', off)
    }, [open])
    return (
      <div className="bk-dropdown" ref={root} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
        {asStr(props.label) && <span className="bk-dropdown__label" id={`${id}l`}>{asStr(props.label)}</span>}
        <button type="button" className="bk-select" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}l ${id}v`} onClick={() => setOpen((o) => !o)}>
          <span id={`${id}v`}>{opts[v] ?? '선택'}</span>
          <Icon name="chevron-down" size={16} />
        </button>
        {open && (
          <ul role="listbox" className="bk-pop" aria-labelledby={`${id}l`}>
            {opts.map((o, i) => (
              <li key={i} role="option" aria-selected={i === v}>
                <button
                  type="button"
                  autoFocus={i === v}
                  onClick={() => {
                    setV(i)
                    setOpen(false)
                  }}
                >
                  {o}
                  {i === v && <Icon name="check" size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
}

const checklist: BlockDef = {
  type: 'checklist',
  name: '체크리스트',
  category: 'input',
  icon: 'list-checks',
  size: { w: 320, h: 224 },
  minSize: { w: 200, h: 96 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'items', label: '항목(앞에 x 붙이면 완료)', kind: 'list' },
  ],
  defaults: { title: '시작하기', items: ['x 팀 공간 만들기', 'x 첫 노트 쓰기', '동료 초대하기', '일정 연결하기'] },
  interactive: true,
  motion: false,
  source: '온보딩 체크리스트 패턴(UXSnaps)',
  describe: () => '항목을 누르면 체크가 바뀌고 위 진행 수가 따라 바뀐다.',
  Render({ props }) {
    const parsed = asList(props.items).map((l) => (l.startsWith('x ') ? { t: l.slice(2), d: true } : { t: l, d: false }))
    const [done, setDone] = useState(parsed.map((p) => p.d))
    const key = parsed.map((p) => p.t + p.d).join()
    useEffect(() => setDone(parsed.map((p) => p.d)), [key]) // eslint-disable-line react-hooks/exhaustive-deps
    const n = done.filter(Boolean).length
    return (
      <div className="bk-card bk-check">
        <div className="bk-card__head">
          <strong>{asStr(props.title)}</strong>
          <span>
            {n}/{parsed.length}
          </span>
        </div>
        <ul>
          {parsed.map((p, i) => (
            <li key={i}>
              <label>
                <input type="checkbox" checked={done[i] ?? false} onChange={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} />
                <span>{p.t}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    )
  },
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const signupForm: BlockDef = {
  type: 'signup-form',
  name: '가입 폼',
  category: 'input',
  icon: 'mail',
  size: { w: 400, h: 392 },
  minSize: { w: 280, h: 320 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'cta', label: '버튼 글자', kind: 'text' },
  ],
  defaults: { title: '팀 공간 만들기', cta: '무료로 시작' },
  interactive: true,
  motion: false,
  source: 'stageshow form-error 예시(오류는 해당 칸 아래, 고치면 사라짐)',
  describe: () => '빈 칸·이메일 형식 오류를 해당 칸 아래에 보여 주고 고치면 사라진다. 통과하면 버튼이 잠깐 처리 중이었다가 "완료"로 바뀐다.',
  Render({ props }) {
    const [v, setV] = useState({ name: '', email: '' })
    const [tried, setTried] = useState(false)
    const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
    const id = useId()
    const errs = {
      name: v.name.trim() ? '' : '이름을 적어 주세요.',
      email: !v.email.trim() ? '이메일을 적어 주세요.' : EMAIL.test(v.email) ? '' : '이메일 형식이 아닙니다. 예: name@example.com',
    }
    useEffect(() => {
      if (state !== 'busy') return
      const t = window.setTimeout(() => setState('done'), 900)
      return () => window.clearTimeout(t)
    }, [state])
    const field = (k: 'name' | 'email', label: string, type: string) => {
      const err = tried ? errs[k] : ''
      return (
        <div className="bk-field" data-error={err ? '' : undefined}>
          <label htmlFor={id + k}>{label}</label>
          <div className="bk-field__box">
            <input
              id={id + k}
              type={type}
              value={v[k]}
              aria-invalid={!!err || undefined}
              aria-describedby={err ? id + k + 'e' : undefined}
              onChange={(e) => {
                setV((o) => ({ ...o, [k]: e.target.value }))
                if (state === 'done') setState('idle')
              }}
            />
          </div>
          {err && (
            <small id={id + k + 'e'} className="bk-field__err">
              <Icon name="circle-alert" size={12} />
              {err}
            </small>
          )}
        </div>
      )
    }
    return (
      <form
        className="bk-card bk-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (!errs.name && !errs.email && state === 'idle') setState('busy')
        }}
      >
        <strong className="bk-form__title">{asStr(props.title)}</strong>
        {field('name', '이름', 'text')}
        {field('email', '이메일', 'email')}
        <button type="submit" className="bk-btn bk-btn--primary" disabled={state === 'busy'} data-done={state === 'done' || undefined}>
          {state === 'busy' ? <Icon name="loader" size={16} className="bk-spin" /> : state === 'done' ? <Icon name="check" size={16} /> : null}
          {state === 'busy' ? '처리 중' : state === 'done' ? '완료' : asStr(props.cta)}
        </button>
      </form>
    )
  },
}

export const inputBlocks = [button, textField, search, toggle, segmented, tabs, dropdown, checklist, signupForm]
