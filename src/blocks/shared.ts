import { useEffect, useState } from 'react'
import type { PropValue } from '../model/types'

/** list 속성 값을 항상 문자열 배열로 받는다. */
export function asList(v: PropValue | undefined): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') return v.split('\n').filter(Boolean)
  return []
}
export const asStr = (v: PropValue | undefined, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
export const asNum = (v: PropValue | undefined, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)
export const asBool = (v: PropValue | undefined): boolean => v === true

/** "이름|값" 꼴 줄을 나눈다. */
export function pair(line: string): [string, string] {
  const i = line.indexOf('|')
  return i < 0 ? [line.trim(), ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()]
}

/** 일정 간격으로 1씩 오르는 수. still이면 멈춘다. */
export function useTick(ms: number, still: boolean): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (still) return
    const t = window.setInterval(() => setN((v) => v + 1), ms)
    return () => window.clearInterval(t)
  }, [ms, still])
  return n
}

/** 요소의 실제 크기(px). 차트처럼 픽셀 크기가 필요한 블록에 쓴다. */
export function useSize<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }] {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!el) return
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, size]
}

/** "1,2,3" 또는 목록을 숫자 배열로. */
export function asNums(v: PropValue | undefined): number[] {
  const parts = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\s]+/) : []
  return parts.map(Number).filter((n) => Number.isFinite(n))
}

/** React 18은 inert 속성을 모른다. 빈 문자열로 넣어야 경고 없이 붙는다. */
export const inert = (on: boolean): Record<string, string> => (on ? { inert: '' } : {})
