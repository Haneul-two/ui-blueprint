import { layoutBlocks } from './layout'
import { dataBlocks } from './data'
import { inputBlocks } from './input'
import { feedbackBlocks } from './feedback'
import { contentBlocks } from './content'
import { motionBlocks } from './motion'
import { deviceBlocks } from './device'
import type { BlockDef } from './types'
import type { Props } from '../model/types'
import { CONFIG } from '../config'

export const BLOCKS: BlockDef[] = [...layoutBlocks, ...dataBlocks, ...inputBlocks, ...feedbackBlocks, ...contentBlocks, ...motionBlocks, ...deviceBlocks]

const BY_TYPE = new Map(BLOCKS.map((b) => [b.type, b]))

export const getBlock = (type: string): BlockDef | undefined => BY_TYPE.get(type)
export const KNOWN_TYPES = new Set(BY_TYPE.keys())

/** 밖에서 온 속성 값을 블록 정의에 맞춘다. 숫자는 범위 안으로, 종류가 틀린 값은 기본값으로.
 *  그리기 직전에 쓴다. 안 그러면 공유 링크의 rows: 100000000 같은 값이 그대로 반복 횟수가 된다. */
export function sanitizeProps(def: BlockDef, props: Props): Props {
  const out: Props = { ...def.defaults }
  for (const f of def.props) {
    const v = props[f.key]
    if (v === undefined) continue
    if (f.kind === 'number') out[f.key] = typeof v === 'number' && Number.isFinite(v) ? Math.max(f.min, Math.min(f.max, v)) : def.defaults[f.key]
    else if (f.kind === 'toggle') out[f.key] = typeof v === 'boolean' ? v : def.defaults[f.key]
    else if (f.kind === 'select') out[f.key] = f.options.some((o) => o.value === v) ? v : def.defaults[f.key]
    else if (f.kind === 'list') out[f.key] = Array.isArray(v) ? v.slice(0, CONFIG.limits.list) : def.defaults[f.key]
    else out[f.key] = typeof v === 'string' ? v : def.defaults[f.key]
  }
  return out
}

/** 블록 기본값으로 새 props를 만든다(목록 값은 복사). */
export function defaultProps(def: BlockDef) {
  const out: BlockDef['defaults'] = {}
  for (const [k, v] of Object.entries(def.defaults)) out[k] = Array.isArray(v) ? [...v] : v
  return out
}
