import type { ArtboardKind } from '../config'

export type PropValue = string | number | boolean | string[]
export type Props = Record<string, PropValue>

export interface Item {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  props: Props
  hidden?: boolean
  locked?: boolean
}

export interface ThemeTokens {
  mode: 'light' | 'dark'
  accent: string
  radius: number // 기준 모서리(px)
  font: string // src/app/fonts.ts 의 FONTS id
  density: 'compact' | 'normal' | 'roomy'
  /** 아트보드 바탕색. 없으면 밝기(mode) 기본값 */
  canvas?: string
  /** 카드·패널 면 색. 없으면 밝기 기본값 */
  surface?: string
  /** 바탕 무늬 */
  pattern?: 'none' | 'dots' | 'grid' | 'glow'
}

export interface Design {
  v: 1
  id: string
  name: string
  updatedAt: number
  artboard: { kind: ArtboardKind; w: number; h: number }
  theme: ThemeTokens
  items: Item[] // 배열 순서 = 겹침 순서(뒤가 위)
}
