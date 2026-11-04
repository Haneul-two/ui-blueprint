import { useState, type CSSProperties } from 'react'
import { Count } from '../vendor/stageshow/motion/Count'
import { Icon } from '../ui/Icon'
import { asList, asNum, asStr, useTick } from './shared'
import type { BlockDef } from './types'

const EFFECTS = [
  { value: 'split', label: '글자 쪼개 등장' },
  { value: 'type', label: '타자기' },
  { value: 'gradient', label: '흐르는 그라디언트' },
  { value: 'flip', label: '글자 뒤집기' },
]

function Typewriter({ text, still }: { text: string; still: boolean }) {
  // 한 글자씩 늘어나고, 다 쓰면 1.6초 쉬었다 처음부터 다시 쓴다.
  const tick = useTick(70, still)
  const cycle = text.length + 24
  const n = still ? text.length : Math.min(text.length, tick % cycle)
  return (
    <span className="bk-type">
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="bk-type__caret" aria-hidden="true" data-still={still || undefined} />
      <span className="ub-sr">{text}</span>
    </span>
  )
}

function Flip({ words, still }: { words: string[]; still: boolean }) {
  const tick = useTick(1800, still)
  const w = words.length ? words[(still ? 0 : tick) % words.length] : ''
  return (
    <span className="bk-flip" aria-live="off">
      {[...w].map((ch, i) => (
        <span key={`${tick}-${i}`} className="bk-flip__ch" data-still={still || undefined} style={{ ['--d' as string]: `${i * 40}ms` } as CSSProperties}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

const textEffect: BlockDef = {
  type: 'text-effect',
  name: '글자 효과',
  category: 'motion',
  icon: 'type',
  size: { w: 720, h: 120 },
  minSize: { w: 200, h: 48 },
  props: [
    { key: 'text', label: '글(뒤집기는 줄마다 한 낱말)', kind: 'textarea' },
    { key: 'effect', label: '효과', kind: 'select', options: EFFECTS },
    { key: 'size', label: '글자 크기(px)', kind: 'number', min: 16, max: 120 },
  ],
  defaults: { text: '기록이 쌓이는 팀', effect: 'split', size: 56 },
  interactive: true,
  motion: true,
  source: 'React Bits·CSS Text Effects의 글자 효과 기법(새로 구현)',
  describe: (p) => `글자 효과 "${EFFECTS.find((e) => e.value === p.effect)?.label ?? ''}". 움직임 줄이기 설정이면 끝 상태로 멈춘다.`,
  Render({ props, still }) {
    const text = asStr(props.text)
    const effect = asStr(props.effect, 'split')
    const [replay, setReplay] = useState(0)
    // 블록 폭이 좁으면 글자를 줄인다(12cqw = 블록 폭의 12%). 넓을 때는 정한 크기 그대로.
    const style = { fontSize: `min(${asNum(props.size, 56)}px, 12cqw)` } as CSSProperties
    let body
    if (effect === 'type') body = <Typewriter text={text.replace(/\n/g, ' ')} still={still} />
    else if (effect === 'flip') body = <Flip words={text.split('\n').filter(Boolean)} still={still} />
    else if (effect === 'gradient') body = <span className="bk-grad" data-still={still || undefined}>{text}</span>
    else
      body = (
        <span className="bk-split" key={replay} aria-label={text}>
          {[...text].map((ch, i) => (
            <span key={i} aria-hidden="true" data-still={still || undefined} style={{ ['--d' as string]: `${i * 35}ms` } as CSSProperties}>
              {ch === ' ' ? ' ' : ch === '\n' ? <br /> : ch}
            </span>
          ))}
        </span>
      )
    return (
      <div className="bk-texfx" style={style} onClick={() => effect === 'split' && setReplay((r) => r + 1)}>
        {body}
      </div>
    )
  },
}

const numberRoll: BlockDef = {
  type: 'number-roll',
  name: '숫자 굴림',
  category: 'motion',
  icon: 'hash',
  size: { w: 280, h: 136 },
  minSize: { w: 160, h: 96 },
  props: [
    { key: 'label', label: '이름', kind: 'text' },
    { key: 'values', label: '바뀔 값들(줄마다 숫자)', kind: 'list' },
    { key: 'unit', label: '단위', kind: 'text' },
  ],
  defaults: { label: '이번 달 노트', values: ['1284', '1309', '1352'], unit: '개' },
  interactive: true,
  motion: true,
  source: 'stageshow 키트 Count(자리마다 굴러가는 숫자)',
  describe: () => '누를 때마다 다음 값으로 숫자 자리가 굴러 바뀐다.',
  Render({ props }) {
    const vals = asList(props.values).map(Number).filter(Number.isFinite)
    const [i, setI] = useState(0)
    const v = vals.length ? vals[i % vals.length] : 0
    return (
      <button type="button" className="bk-card bk-roll" onClick={() => setI((x) => x + 1)} aria-label={`${asStr(props.label)} ${v.toLocaleString('ko-KR')}${asStr(props.unit)}, 누르면 다음 값`}>
        <span className="bk-kpi__label">{asStr(props.label)}</span>
        <span className="bk-roll__value" aria-hidden="true">
          <Count value={v} format={(n) => Math.round(n).toLocaleString('ko-KR')} />
          <small>{asStr(props.unit)}</small>
        </span>
        <span className="bk-roll__hint" aria-hidden="true">
          <Icon name="pointer" size={12} />
          눌러서 바꾸기
        </span>
      </button>
    )
  },
}

const marquee: BlockDef = {
  type: 'marquee',
  name: '흐르는 띠',
  category: 'motion',
  icon: 'gallery',
  size: { w: 1440, h: 72 },
  minSize: { w: 240, h: 40 },
  props: [
    { key: 'items', label: '항목(줄마다)', kind: 'list' },
    { key: 'speed', label: '한 바퀴 시간(초)', kind: 'number', min: 6, max: 80 },
  ],
  defaults: { items: ['회의록', '회고', '주간 보고', '인터뷰', '기획서', '온보딩', '할 일'], speed: 24 },
  interactive: false,
  motion: true,
  source: '로고·태그 띠 마키 기법(Motion Prompt 참고)',
  describe: (p) => `항목들이 왼쪽으로 ${asNum(p.speed, 24)}초에 한 바퀴 흐른다. 마우스를 올리면 멈춘다.`,
  Render({ props, still }) {
    const items = asList(props.items)
    const row = (hidden: boolean) => (
      <ul aria-hidden={hidden || undefined}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    )
    return (
      <div className="bk-marquee" data-still={still || undefined} style={{ ['--t' as string]: `${asNum(props.speed, 24)}s` } as CSSProperties}>
        <div className="bk-marquee__track">
          {row(false)}
          {row(true)}
        </div>
      </div>
    )
  },
}

const spotlight: BlockDef = {
  type: 'spotlight',
  name: '스포트라이트 카드',
  category: 'motion',
  icon: 'sparkle',
  size: { w: 400, h: 240 },
  minSize: { w: 200, h: 144 },
  props: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'body', label: '설명', kind: 'textarea' },
  ],
  defaults: { title: '어디서든 이어 쓰기', body: '노트북에서 쓰던 노트를 휴대폰에서 그대로 이어서 씁니다.' },
  interactive: true,
  motion: true,
  source: 'landing-patterns 커서 스포트라이트 기법',
  describe: () => '카드 위에서 마우스를 움직이면 커서 자리를 따라 옅은 빛이 비친다.',
  Render({ props, still }) {
    const [p, setP] = useState<{ x: number; y: number } | null>(null)
    return (
      <div
        className="bk-card bk-spot"
        style={p ? ({ ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px` } as CSSProperties) : undefined}
        data-on={(p && !still) || undefined}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const s = r.width / e.currentTarget.offsetWidth || 1
          setP({ x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s })
        }}
        onPointerLeave={() => setP(null)}
      >
        <strong>{asStr(props.title)}</strong>
        <p>{asStr(props.body)}</p>
      </div>
    )
  },
}

export const motionBlocks = [textEffect, numberRoll, marquee, spotlight]
