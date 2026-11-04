import { useEffect, useId, useRef, useState } from 'react'
import { Facepile } from '../vendor/stageshow/parts/Facepile'
import { Avatar } from '../vendor/stageshow/parts/Avatar'
import { Icon } from '../ui/Icon'
import { asBool, asList, asNum, asStr, inert, pair } from './shared'
import type { BlockDef } from './types'

const hero: BlockDef = {
  type: 'hero',
  name: '히어로',
  category: 'content',
  icon: 'star',
  size: { w: 1440, h: 560 },
  minSize: { w: 320, h: 280 },
  props: [
    { key: 'title', label: '큰 제목', kind: 'textarea' },
    { key: 'sub', label: '설명', kind: 'textarea' },
    { key: 'primary', label: '주 버튼', kind: 'text' },
    { key: 'secondary', label: '보조 버튼', kind: 'text' },
    { key: 'align', label: '정렬', kind: 'select', options: [{ value: 'left', label: '왼쪽 + 그림' }, { value: 'center', label: '가운데' }] },
  ],
  defaults: {
    title: '흩어진 메모를\n팀의 기록으로',
    sub: '회의록, 아이디어, 할 일을 한곳에 모으고 필요한 사람에게만 보여 주세요.',
    primary: '무료로 시작',
    secondary: '둘러보기',
    align: 'left',
  },
  interactive: false,
  motion: false,
  source: 'stageshow hero-demo 구성, Aura 랜딩 템플릿의 히어로 배치 참고',
  Render({ props }) {
    const align = asStr(props.align, 'left')
    return (
      <section className="bk-hero" data-align={align}>
        <div className="bk-hero__copy">
          <h1>
            {asStr(props.title)
              .split('\n')
              .map((l, i) => (
                <span key={i}>{l}</span>
              ))}
          </h1>
          <p>{asStr(props.sub)}</p>
          <div className="bk-hero__cta">
            {asStr(props.primary) && <button type="button" className="bk-btn bk-btn--primary bk-btn--lg">{asStr(props.primary)}</button>}
            {asStr(props.secondary) && <button type="button" className="bk-btn bk-btn--secondary bk-btn--lg">{asStr(props.secondary)}</button>}
          </div>
        </div>
        {align === 'left' && (
          <div className="bk-hero__art" aria-hidden="true">
            <div className="bk-hero__win">
              <span className="bk-hero__bar" />
              <span className="bk-hero__line" style={{ width: '64%' }} />
              <span className="bk-hero__line" style={{ width: '82%' }} />
              <span className="bk-hero__line" style={{ width: '48%' }} />
              <span className="bk-hero__card" />
            </div>
          </div>
        )}
      </section>
    )
  },
}

const featureCard: BlockDef = {
  type: 'feature-card',
  name: '기능 카드',
  category: 'content',
  icon: 'zap',
  size: { w: 360, h: 200 },
  minSize: { w: 200, h: 144 },
  props: [
    { key: 'icon', label: '아이콘 이름', kind: 'text' },
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'body', label: '설명', kind: 'textarea' },
    { key: 'link', label: '링크 글(선택)', kind: 'text' },
  ],
  defaults: { icon: 'zap', title: '세 줄 자동 요약', body: '긴 회의록을 열면 핵심 결정과 할 일이 맨 위에 정리됩니다.', link: '자세히 보기' },
  interactive: false,
  motion: false,
  source: '21st.dev 기능 카드 구성 참고',
  Render({ props }) {
    return (
      <div className="bk-card bk-feature">
        <span className="bk-feature__icon">
          <Icon name={asStr(props.icon, 'zap')} size={20} />
        </span>
        <strong>{asStr(props.title)}</strong>
        <p>{asStr(props.body)}</p>
        {asStr(props.link) && (
          <a href="#" onClick={(e) => e.preventDefault()}>
            {asStr(props.link)}
          </a>
        )}
      </div>
    )
  },
}

const pricing: BlockDef = {
  type: 'pricing',
  name: '가격표',
  category: 'content',
  icon: 'credit-card',
  size: { w: 960, h: 440 },
  minSize: { w: 320, h: 320 },
  props: [
    { key: 'plans', label: '요금제(이름|월 가격|설명|기능,기능)', kind: 'list' },
    { key: 'pick', label: '추천 요금제 순서(1부터)', kind: 'number', min: 1, max: 4 },
    { key: 'yearly', label: '연간 결제 토글', kind: 'toggle' },
  ],
  defaults: {
    plans: ['개인|0|혼자 쓰기|노트 무제한,기기 2대', '팀|8000|10명까지|공유 공간,권한 관리,자동 요약', '회사|15000|인원 제한 없음|감사 기록,전용 지원,SSO'],
    pick: 2,
    yearly: true,
  },
  interactive: true,
  motion: false,
  source: '가격표 패턴(Kombai 갤러리), 연간 할인 토글',
  describe: () => '월간/연간을 바꾸면 가격이 20% 할인된 값으로 바뀐다.',
  Render({ props }) {
    const [yearly, setYearly] = useState(false)
    const plans = asList(props.plans).slice(0, 4).map((l) => l.split('|').map((s) => s.trim()))
    const pick = asNum(props.pick, 2) - 1
    return (
      <div className="bk-pricing">
        {asBool(props.yearly) && (
          <div className="bk-pricing__switch" role="radiogroup" aria-label="결제 주기">
            <button type="button" role="radio" aria-checked={!yearly} onClick={() => setYearly(false)}>
              월간
            </button>
            <button type="button" role="radio" aria-checked={yearly} onClick={() => setYearly(true)}>
              연간 20% 할인
            </button>
          </div>
        )}
        <div className="bk-pricing__grid" style={{ ['--n' as string]: plans.length }}>
          {plans.map(([name, price, desc, feats], i) => {
            const p = Number(price) || 0
            const shown = yearly ? Math.round((p * 0.8) / 100) * 100 : p
            return (
              <div key={i} className="bk-plan" data-pick={i === pick || undefined}>
                {i === pick && <span className="bk-badge" data-tone="accent">추천</span>}
                <strong>{name}</strong>
                <p>{desc}</p>
                <div className="bk-plan__price">
                  <b>{shown === 0 ? '무료' : `${shown.toLocaleString('ko-KR')}원`}</b>
                  {shown > 0 && <small>/ 1인·월</small>}
                </div>
                <ul>
                  {(feats ?? '').split(',').filter(Boolean).map((f, j) => (
                    <li key={j}>
                      <Icon name="check" size={14} />
                      {f.trim()}
                    </li>
                  ))}
                </ul>
                <button type="button" className={`bk-btn ${i === pick ? 'bk-btn--primary' : 'bk-btn--secondary'}`}>
                  {p === 0 ? '무료로 시작' : '선택하기'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
}

const testimonial: BlockDef = {
  type: 'testimonial',
  name: '후기',
  category: 'content',
  icon: 'quote',
  size: { w: 440, h: 248 },
  minSize: { w: 240, h: 160 },
  props: [
    { key: 'quote', label: '후기', kind: 'textarea' },
    { key: 'name', label: '이름', kind: 'text' },
    { key: 'role', label: '소속', kind: 'text' },
  ],
  defaults: { quote: '회의가 끝나면 정리할 게 없어졌어요. 결정한 내용이 이미 노트 맨 위에 있으니까요.', name: '정민서', role: '스타트업 프로덕트 리드' },
  interactive: false,
  motion: false,
  source: '기본 후기 카드',
  Render({ props }) {
    return (
      <figure className="bk-card bk-quote">
        <Icon name="quote" size={20} />
        <blockquote>{asStr(props.quote)}</blockquote>
        <figcaption>
          <Avatar name={asStr(props.name)} size={32} />
          <span>
            <b>{asStr(props.name)}</b>
            <small>{asStr(props.role)}</small>
          </span>
        </figcaption>
      </figure>
    )
  },
}

const facepile: BlockDef = {
  type: 'facepile',
  name: '아바타 묶음',
  category: 'content',
  icon: 'users',
  size: { w: 280, h: 48 },
  minSize: { w: 120, h: 32 },
  props: [
    { key: 'names', label: '이름(줄마다)', kind: 'list' },
    { key: 'label', label: '옆 글', kind: 'text' },
    { key: 'size', label: '크기', kind: 'number', min: 16, max: 48 },
  ],
  defaults: { names: ['김하늘', '이도윤', '박서연', '최지우'], label: '외 12명이 보는 중', size: 28 },
  interactive: false,
  motion: false,
  source: 'stageshow 키트 Facepile',
  Render({ props }) {
    return (
      <div className="bk-facepile">
        <Facepile names={asList(props.names).slice(0, 8)} size={asNum(props.size, 28)} overlap={8} />
        {asStr(props.label) && <span>{asStr(props.label)}</span>}
      </div>
    )
  },
}

const timeline: BlockDef = {
  type: 'timeline',
  name: '타임라인',
  category: 'content',
  icon: 'milestone',
  size: { w: 400, h: 320 },
  minSize: { w: 240, h: 160 },
  props: [
    { key: 'items', label: '단계(날짜|제목|설명)', kind: 'list' },
    { key: 'current', label: '지금 단계(1부터)', kind: 'number', min: 1, max: 20 },
  ],
  defaults: { items: ['11월 1일|기획 확정|범위와 일정을 정했습니다', '11월 8일|디자인 검토|시안 3개 중 하나를 골랐습니다', '11월 15일|개발 시작|첫 화면부터 만듭니다', '11월 29일|공개|사용자에게 엽니다'], current: 2 },
  interactive: false,
  motion: false,
  source: '진행 단계 패턴',
  Render({ props }) {
    const items = asList(props.items).map((l) => l.split('|').map((s) => s.trim()))
    const cur = asNum(props.current, 1) - 1
    return (
      <ol className="bk-timeline">
        {items.map(([date, t, d], i) => (
          <li key={i} data-state={i < cur ? 'done' : i === cur ? 'now' : 'next'} aria-current={i === cur ? 'step' : undefined}>
            <span className="bk-timeline__dot" aria-hidden="true">
              {i < cur && <Icon name="check" size={10} />}
            </span>
            <time>{date}</time>
            <strong>{t}</strong>
            {d && <p>{d}</p>}
          </li>
        ))}
      </ol>
    )
  },
}

const image: BlockDef = {
  type: 'image',
  name: '이미지 자리',
  category: 'content',
  icon: 'image',
  size: { w: 480, h: 320 },
  minSize: { w: 48, h: 48 },
  props: [
    { key: 'caption', label: '설명(무엇이 들어갈 자리인지)', kind: 'text' },
    { key: 'ratio', label: '표시', kind: 'select', options: [{ value: 'plain', label: '자리만' }, { value: 'label', label: '크기 표시' }] },
  ],
  defaults: { caption: '제품 화면 캡처', ratio: 'label' },
  interactive: false,
  motion: false,
  source: '와이어프레임 이미지 자리 표기',
  describe: (p) => `그림 자리: ${asStr(p.caption)}`,
  Render({ props }) {
    return (
      <div className="bk-image" role="img" aria-label={asStr(props.caption) || '이미지 자리'}>
        <svg className="bk-image__x" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
          <line x1="0" y1="0" x2="100" y2="100" />
          <line x1="100" y1="0" x2="0" y2="100" />
        </svg>
        <span>
          <Icon name="image" size={18} />
          {asStr(props.caption)}
        </span>
      </div>
    )
  },
}

const paragraph: BlockDef = {
  type: 'paragraph',
  name: '글 단락',
  category: 'content',
  icon: 'align-left',
  size: { w: 560, h: 160 },
  minSize: { w: 120, h: 32 },
  props: [
    { key: 'text', label: '글', kind: 'textarea' },
    { key: 'size', label: '글자 크기', kind: 'select', options: [{ value: 's', label: '작게' }, { value: 'm', label: '보통' }, { value: 'l', label: '크게' }] },
  ],
  defaults: {
    text: '하루 노트는 팀이 남긴 기록을 잃어버리지 않게 돕습니다. 노트마다 누가 언제 무엇을 바꿨는지 남고, 필요한 사람에게만 보이도록 범위를 정할 수 있습니다.',
    size: 'm',
  },
  interactive: false,
  motion: false,
  source: '본문 타이포',
  Render({ props }) {
    return (
      <div className="bk-para" data-size={asStr(props.size, 'm')}>
        {asStr(props.text)
          .split('\n')
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
    )
  },
}

const faq: BlockDef = {
  type: 'faq',
  name: '자주 묻는 질문',
  category: 'content',
  icon: 'circle-help',
  size: { w: 640, h: 320 },
  minSize: { w: 280, h: 120 },
  props: [
    { key: 'items', label: '질문|답', kind: 'list' },
    { key: 'single', label: '하나만 펼치기', kind: 'toggle' },
  ],
  defaults: {
    items: ['무료로 계속 쓸 수 있나요?|개인 요금제는 기간 제한 없이 무료입니다.', '팀원을 몇 명까지 초대하나요?|팀 요금제는 10명까지, 회사 요금제는 제한이 없습니다.', '데이터는 어디에 저장되나요?|국내 데이터센터에 암호화해 저장합니다.'],
    single: true,
  },
  interactive: true,
  motion: false,
  source: '아코디언 패턴(WAI-ARIA)',
  describe: (p) => `질문을 누르면 답이 펼쳐진다${p.single ? '(하나를 펼치면 나머지는 접힘)' : ''}.`,
  Render({ props }) {
    const items = asList(props.items).map(pair)
    const [open, setOpen] = useState<number[]>([0])
    const id = useId()
    return (
      <div className="bk-faq">
        {items.map(([q, a], i) => {
          const on = open.includes(i)
          return (
            <div key={i} className="bk-faq__item" data-open={on || undefined}>
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`${id}${i}`}
                  onClick={() => setOpen((o) => (on ? o.filter((x) => x !== i) : asBool(props.single) ? [i] : [...o, i]))}
                >
                  {q}
                  <Icon name="chevron-down" size={16} />
                </button>
              </h3>
              <div id={`${id}${i}`} role="region" hidden={!on}>
                <p>{a}</p>
              </div>
            </div>
          )
        })}
      </div>
    )
  },
}

const chat: BlockDef = {
  type: 'chat',
  name: '채팅',
  category: 'content',
  icon: 'message-circle',
  size: { w: 400, h: 440 },
  minSize: { w: 280, h: 280 },
  props: [
    { key: 'title', label: '대화 이름', kind: 'text' },
    { key: 'messages', label: '메시지(나| 또는 상대| 로 시작)', kind: 'list' },
    { key: 'reply', label: '보내면 돌아올 답', kind: 'text' },
  ],
  defaults: {
    title: '디자인팀',
    messages: ['상대|시안 B로 가는 거 맞죠?', '나|네, 색만 조금 밝게 바꿀게요', '상대|좋아요. 금요일까지 부탁해요'],
    reply: '확인했습니다!',
  },
  interactive: true,
  motion: false,
  source: 'stageshow ai-chat·messages 예시의 말풍선 흐름 참고',
  describe: () => '아래 칸에 글을 쓰고 보내면 내 말풍선이 붙고, 상대가 입력 중 표시 뒤 답한다.',
  Render({ props }) {
    const base = asList(props.messages).map((l) => {
      const [who, t] = pair(l)
      return { me: who === '나', t }
    })
    const [extra, setExtra] = useState<{ me: boolean; t: string }[]>([])
    const [typing, setTyping] = useState(false)
    const [draft, setDraft] = useState('')
    const list = useRef<HTMLDivElement>(null)
    useEffect(() => {
      if (list.current) list.current.scrollTop = list.current.scrollHeight
    }, [extra, typing])
    useEffect(() => {
      if (!typing) return
      const t = window.setTimeout(() => {
        setTyping(false)
        setExtra((e) => [...e, { me: false, t: asStr(props.reply) }])
      }, 1100)
      return () => window.clearTimeout(t)
    }, [typing, props.reply])
    return (
      <div className="bk-card bk-chat">
        <div className="bk-card__head">
          <strong>{asStr(props.title)}</strong>
        </div>
        <div className="bk-chat__list" ref={list} aria-live="polite">
          {[...base, ...extra].map((m, i) => (
            <p key={i} className="bk-bubble" data-me={m.me || undefined}>
              {m.t}
            </p>
          ))}
          {typing && (
            <p className="bk-bubble bk-bubble--typing" aria-label="입력 중">
              <span />
              <span />
              <span />
            </p>
          )}
        </div>
        <form
          className="bk-chat__compose"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft.trim()) return
            setExtra((x) => [...x, { me: true, t: draft.trim() }])
            setDraft('')
            setTyping(true)
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="메시지 입력" aria-label="메시지 입력" />
          <button type="submit" aria-label="보내기" className="bk-icon-btn">
            <Icon name="arrow-up" size={16} />
          </button>
        </form>
      </div>
    )
  },
}

const carousel: BlockDef = {
  type: 'carousel',
  name: '카드 캐러셀',
  category: 'content',
  icon: 'gallery',
  size: { w: 720, h: 280 },
  minSize: { w: 320, h: 200 },
  props: [
    { key: 'cards', label: '카드(제목|설명)', kind: 'list' },
    { key: 'perView', label: '한 번에 보이는 수', kind: 'number', min: 1, max: 4 },
  ],
  defaults: {
    cards: ['회의록 템플릿|안건·결정·할 일 세 칸', '주간 보고|지난주와 비교해 자동 정리', '인터뷰 노트|질문 목록과 메모를 나란히', '회고|잘한 점·아쉬운 점·다음 행동', '온보딩|새 팀원이 읽을 문서 묶음'],
    perView: 3,
  },
  interactive: true,
  motion: false,
  source: '하늘 창고 선반 넘기기(칸 단위 이동) 패턴',
  describe: () => '이전/다음 버튼으로 카드가 한 칸씩 미끄러진다. 끝에서는 버튼이 비활성으로 보인다.',
  Render({ props }) {
    const cards = asList(props.cards).map(pair)
    const per = Math.max(1, Math.min(4, asNum(props.perView, 3)))
    const max = Math.max(0, cards.length - per)
    const [i, setI] = useState(0)
    const at = Math.min(i, max)
    return (
      <div className="bk-carousel" style={{ ['--per' as string]: per, ['--at' as string]: at }}>
        <div className="bk-carousel__track">
          {cards.map(([t, d], k) => (
            <div key={k} className="bk-card bk-carousel__card" {...inert(k < at || k >= at + per)}>
              <div className="bk-carousel__art" aria-hidden="true" />
              <strong>{t}</strong>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <div className="bk-carousel__nav">
          <button type="button" className="bk-icon-btn" aria-label="이전" aria-disabled={at === 0} onClick={() => at > 0 && setI(at - 1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <span>
            {at + 1}–{Math.min(cards.length, at + per)} / {cards.length}
          </span>
          <button type="button" className="bk-icon-btn" aria-label="다음" aria-disabled={at >= max} onClick={() => at < max && setI(at + 1)}>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
    )
  },
}

export const contentBlocks = [hero, featureCard, pricing, testimonial, facepile, timeline, image, paragraph, faq, chat, carousel]
