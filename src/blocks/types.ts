import type { ComponentType } from 'react'
import type { Props, PropValue } from '../model/types'

export type Category = 'layout' | 'data' | 'input' | 'feedback' | 'content' | 'motion' | 'device'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'layout', label: '레이아웃' },
  { id: 'data', label: '데이터' },
  { id: 'input', label: '입력' },
  { id: 'feedback', label: '피드백' },
  { id: 'content', label: '콘텐츠' },
  { id: 'motion', label: '모션' },
  { id: 'device', label: '기기 틀' },
]

interface FieldBase {
  key: string
  label: string
}
export type PropField =
  | (FieldBase & { kind: 'text' })
  | (FieldBase & { kind: 'textarea' })
  | (FieldBase & { kind: 'number'; min: number; max: number; step?: number })
  | (FieldBase & { kind: 'select'; options: { value: string; label: string }[] })
  | (FieldBase & { kind: 'toggle' })
  | (FieldBase & { kind: 'color' })
  | (FieldBase & { kind: 'list' })

export type Mode = 'edit' | 'preview'

export interface RenderProps<P extends Props = Props> {
  props: P
  mode: Mode
  /** 참이면 움직임 없이 끝 상태로 그린다(움직임 줄이기, PNG 만들기). */
  still: boolean
}

export interface BlockDef {
  type: string
  name: string
  category: Category
  icon: string // lucide 아이콘 이름(kebab)
  size: { w: number; h: number }
  minSize: { w: number; h: number }
  props: PropField[]
  defaults: Record<string, PropValue>
  interactive: boolean
  motion: boolean
  source: string // 출처: 'stageshow 키트' 또는 참고한 기법
  describe?: (props: Props) => string // AI 사양서용 상호작용·내용 설명
  Render: ComponentType<RenderProps>
}
