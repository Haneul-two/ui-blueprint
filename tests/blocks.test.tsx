import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BLOCKS, defaultProps } from '../src/blocks/registry'
import { CATEGORIES } from '../src/blocks/types'
import { ICON_NAMES } from '../src/ui/Icon'
import { Artboard } from '../src/app/Artboard'
import { CONFIG } from '../src/config'
import { DEFAULT_THEME } from '../src/model/design'
import type { Design } from '../src/model/types'

describe('블록 레지스트리', () => {
  it('블록이 40개 이상이고 분류 7개 모두 3개 이상', () => {
    expect(BLOCKS.length).toBeGreaterThanOrEqual(40)
    for (const c of CATEGORIES) expect(BLOCKS.filter((b) => b.category === c.id).length, c.label).toBeGreaterThanOrEqual(3)
  })

  it('종류 이름이 겹치지 않는다', () => {
    expect(new Set(BLOCKS.map((b) => b.type)).size).toBe(BLOCKS.length)
  })

  for (const b of BLOCKS) {
    it(`${b.name}(${b.type}) 정의가 유효하다`, () => {
      expect(ICON_NAMES, '아이콘').toContain(b.icon)
      expect(b.source.length).toBeGreaterThan(0)
      // 크기는 격자 배수, 최소 크기 ≤ 기본 크기
      for (const n of [b.size.w, b.size.h, b.minSize.w, b.minSize.h]) expect(n % CONFIG.grid).toBe(0)
      expect(b.minSize.w).toBeLessThanOrEqual(b.size.w)
      expect(b.minSize.h).toBeLessThanOrEqual(b.size.h)
      for (const f of b.props) {
        expect(b.defaults, `기본값 ${f.key}`).toHaveProperty(f.key)
        const v = b.defaults[f.key]
        if (f.kind === 'number') {
          expect(typeof v).toBe('number')
          expect(v as number).toBeGreaterThanOrEqual(f.min)
          expect(v as number).toBeLessThanOrEqual(f.max)
        }
        if (f.kind === 'select') expect(f.options.map((o) => o.value)).toContain(v)
        if (f.kind === 'toggle') expect(typeof v).toBe('boolean')
        if (f.kind === 'list') expect(Array.isArray(v)).toBe(true)
        if (f.kind === 'text' || f.kind === 'textarea') expect(typeof v).toBe('string')
      }
    })

    for (const mode of ['edit', 'preview'] as const)
      it(`${b.name} 기본값으로 그려진다(${mode})`, () => {
        const d: Design = {
          v: 1,
          id: 't',
          name: 't',
          updatedAt: 0,
          artboard: { kind: 'desktop', w: 1440, h: 1200 },
          theme: { ...DEFAULT_THEME },
          items: [{ id: 'x', type: b.type, x: 0, y: 0, w: b.size.w, h: b.size.h, props: defaultProps(b) }],
        }
        const { container, unmount } = render(<Artboard design={d} mode={mode} />)
        expect(container.querySelector('.ub-unknown'), '그리기 실패 표시').toBeNull()
        expect(container.querySelector('.ub-item')!.innerHTML.length).toBeGreaterThan(20)
        unmount()
      })
  }
})
