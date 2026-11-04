import type { KeyboardEvent } from 'react'

/**
 * role="radiogroup" 안에서 방향키로 앞뒤 선택지를 고른다(포커스 이동 + 선택).
 * 방향키가 편집기까지 올라가면 선택한 블록이 움직이므로 여기서 멈춘다.
 */
export function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  e.stopPropagation()
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'))
  const i = radios.indexOf(document.activeElement as HTMLElement)
  const next = radios[(i + step + radios.length) % radios.length]
  next?.focus()
  next?.click()
}
