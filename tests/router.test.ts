import { describe, expect, it } from 'vitest'
import { parseHash } from '../src/app/router'

describe('주소 해석', () => {
  it('정상 주소', () => {
    expect(parseHash('#/edit/abc?fixture=app')).toEqual({ name: 'edit', id: 'abc', fixture: 'app' })
    expect(parseHash('#/view?d=xyz')).toEqual({ name: 'view', data: 'xyz' })
    expect(parseHash('#/blocks?theme=dark')).toEqual({ name: 'blocks', theme: 'dark' })
    expect(parseHash('')).toEqual({ name: 'home' })
  })
  it('깨진 퍼센트 인코딩은 던지지 않고 목록으로', () => {
    expect(parseHash('#/edit/%E0%A4%A')).toEqual({ name: 'home' })
  })
})
