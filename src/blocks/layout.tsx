import { Icon } from '../ui/Icon'
import { asBool, asList, asStr, pair } from './shared'
import type { BlockDef } from './types'

const navbar: BlockDef = {
  type: 'navbar',
  name: '상단 메뉴',
  category: 'layout',
  icon: 'panel-top',
  size: { w: 1440, h: 64 },
  minSize: { w: 320, h: 48 },
  props: [
    { key: 'brand', label: '서비스 이름', kind: 'text' },
    { key: 'links', label: '메뉴(줄마다 하나)', kind: 'list' },
    { key: 'cta', label: '오른쪽 버튼', kind: 'text' },
    { key: 'search', label: '검색칸 보이기', kind: 'toggle' },
  ],
  defaults: { brand: '하루 노트', links: ['기능', '요금', '고객 사례', '도움말'], cta: '시작하기', search: false },
  interactive: true,
  motion: false,
  source: 'Kombai 갤러리의 상단 바 구성 참고',
  Render({ props }) {
    const links = asList(props.links)
    return (
      <div className="bk-nav">
        <span className="bk-nav__brand">
          <span className="bk-mark" aria-hidden="true" />
          {asStr(props.brand)}
        </span>
        <nav className="bk-nav__links" aria-label="주 메뉴">
          {links.map((l, i) => (
            <a key={i} href="#" onClick={(e) => e.preventDefault()} className={i === 0 ? 'is-on' : undefined}>
              {l}
            </a>
          ))}
        </nav>
        {asBool(props.search) && (
          <label className="bk-nav__search">
            <Icon name="search" size={14} />
            <input placeholder="검색" aria-label="검색" />
          </label>
        )}
        {asStr(props.cta) && (
          <button type="button" className="bk-btn bk-btn--primary">
            {asStr(props.cta)}
          </button>
        )}
      </div>
    )
  },
}

const sidebar: BlockDef = {
  type: 'sidebar',
  name: '사이드바',
  category: 'layout',
  icon: 'panel-left',
  size: { w: 240, h: 640 },
  minSize: { w: 160, h: 200 },
  props: [
    { key: 'title', label: '맨 위 이름', kind: 'text' },
    { key: 'items', label: '메뉴(아이콘이름|글자)', kind: 'list' },
    { key: 'active', label: '선택된 순서(1부터)', kind: 'number', min: 1, max: 20 },
  ],
  defaults: {
    title: '하루 노트',
    items: ['home|홈', 'layout-dashboard|대시보드', 'inbox|받은 함', 'calendar|일정', 'users|팀', 'settings|설정'],
    active: 2,
  },
  interactive: true,
  motion: false,
  source: 'stageshow 키트 Window 사이드바 구성 참고',
  Render({ props }) {
    const items = asList(props.items).map(pair)
    const active = typeof props.active === 'number' ? props.active : 1
    return (
      <aside className="bk-side">
        <div className="bk-side__title">
          <span className="bk-mark" aria-hidden="true" />
          {asStr(props.title)}
        </div>
        <ul>
          {items.map(([ic, label], i) => (
            <li key={i}>
              <a href="#" onClick={(e) => e.preventDefault()} className={i + 1 === active ? 'is-on' : undefined} aria-current={i + 1 === active ? 'page' : undefined}>
                <Icon name={label ? ic : 'square'} size={16} />
                {label || ic}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    )
  },
}

const sectionTitle: BlockDef = {
  type: 'section-title',
  name: '섹션 제목',
  category: 'layout',
  icon: 'type',
  size: { w: 640, h: 104 },
  minSize: { w: 160, h: 40 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'sub', label: '설명', kind: 'textarea' },
    { key: 'align', label: '정렬', kind: 'select', options: [{ value: 'left', label: '왼쪽' }, { value: 'center', label: '가운데' }] },
  ],
  defaults: { title: '이번 주 한눈에 보기', sub: '팀이 기록한 노트와 일정 변화를 모았습니다.', align: 'left' },
  interactive: false,
  motion: false,
  source: '기본 타이포 위계',
  Render({ props }) {
    return (
      <div className="bk-section" data-align={asStr(props.align, 'left')}>
        <h2>{asStr(props.title)}</h2>
        {asStr(props.sub) && <p>{asStr(props.sub)}</p>}
      </div>
    )
  },
}

const panel: BlockDef = {
  type: 'panel',
  name: '빈 패널',
  category: 'layout',
  icon: 'square',
  size: { w: 400, h: 280 },
  minSize: { w: 48, h: 48 },
  props: [
    { key: 'title', label: '머리글(비우면 없음)', kind: 'text' },
    { key: 'style', label: '모양', kind: 'select', options: [{ value: 'card', label: '카드' }, { value: 'outline', label: '테두리' }, { value: 'tint', label: '옅은 색' }] },
  ],
  defaults: { title: '', style: 'card' },
  interactive: false,
  motion: false,
  source: '기본 컨테이너',
  Render({ props }) {
    return (
      <div className="bk-panel" data-style={asStr(props.style, 'card')}>
        {asStr(props.title) && <div className="bk-panel__head">{asStr(props.title)}</div>}
      </div>
    )
  },
}

const divider: BlockDef = {
  type: 'divider',
  name: '구분선',
  category: 'layout',
  icon: 'minus',
  size: { w: 640, h: 24 },
  minSize: { w: 24, h: 8 },
  props: [{ key: 'label', label: '가운데 글자(선택)', kind: 'text' }],
  defaults: { label: '' },
  interactive: false,
  motion: false,
  source: '기본 구분선',
  Render({ props }) {
    const l = asStr(props.label)
    return (
      <div className="bk-divider" role="separator">
        {l && <span>{l}</span>}
      </div>
    )
  },
}

const bento: BlockDef = {
  type: 'bento',
  name: '벤토 그리드',
  category: 'layout',
  icon: 'layout-grid',
  size: { w: 960, h: 480 },
  minSize: { w: 320, h: 240 },
  props: [{ key: 'tiles', label: '칸(제목|설명), 4개 권장', kind: 'list' }],
  defaults: {
    tiles: ['한곳에 모으는 노트|흩어진 메모를 팀 공간 하나로', '자동 요약|긴 회의록을 세 줄로', '일정 연결|노트에서 바로 일정을 잡습니다', '권한 관리|볼 사람만 보게'],
  },
  interactive: false,
  motion: false,
  source: 'stageshow bento 예시의 칸 위계 참고',
  Render({ props }) {
    const tiles = asList(props.tiles).slice(0, 6).map(pair)
    return (
      <div className="bk-bento" data-n={tiles.length}>
        {tiles.map(([t, d], i) => (
          <div key={i} className="bk-bento__tile">
            <div className="bk-bento__art" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>{t}</strong>
            {d && <p>{d}</p>}
          </div>
        ))}
      </div>
    )
  },
}

const footer: BlockDef = {
  type: 'footer',
  name: '푸터',
  category: 'layout',
  icon: 'panel-bottom',
  size: { w: 1440, h: 160 },
  minSize: { w: 320, h: 80 },
  props: [
    { key: 'brand', label: '서비스 이름', kind: 'text' },
    { key: 'cols', label: '열(제목|항목,항목)', kind: 'list' },
    { key: 'note', label: '맨 아래 글', kind: 'text' },
  ],
  defaults: {
    brand: '하루 노트',
    cols: ['제품|기능,요금,업데이트', '회사|소개,채용,문의', '도움|가이드,커뮤니티,상태'],
    note: '© 2026 하루 노트',
  },
  interactive: false,
  motion: false,
  source: '기본 푸터 구성',
  Render({ props }) {
    const cols = asList(props.cols).map(pair)
    return (
      <footer className="bk-footer">
        <div className="bk-footer__brand">
          <span className="bk-mark" aria-hidden="true" />
          {asStr(props.brand)}
          <small>{asStr(props.note)}</small>
        </div>
        {cols.map(([t, list], i) => (
          <div key={i} className="bk-footer__col">
            <strong>{t}</strong>
            {list.split(',').filter(Boolean).map((x, j) => (
              <span key={j}>{x.trim()}</span>
            ))}
          </div>
        ))}
      </footer>
    )
  },
}

export const layoutBlocks = [navbar, sidebar, sectionTitle, panel, divider, bento, footer]
