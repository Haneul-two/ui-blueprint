// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodeDesign, encodeDesign, shareUrl } from '../src/io/share'
import { CONFIG } from '../src/config'
import { FIXTURES } from '../src/presets'

describe('공유 링크', () => {
  it('프리셋·전체 블록 설계가 압축→풀기 왕복에서 같다', async () => {
    for (const [name, make] of Object.entries(FIXTURES)) {
      const d = make()
      const back = await decodeDesign(await encodeDesign(d))
      expect(back, name).toEqual(d)
    }
  })
  it('전체 블록 설계 링크 길이를 기록하고 한도 안인지 본다', async () => {
    const d = FIXTURES['all-blocks']()
    const code = await encodeDesign(d)
    console.log(`전체 블록(${d.items.length}개) 링크 코드 길이: ${code.length}자 / 한도 ${CONFIG.shareMaxLength}`)
    const r = await shareUrl(d, 'https://example.com/')
    expect(r.ok).toBe(code.length <= CONFIG.shareMaxLength)
  })
  it('깨진 코드는 null', async () => {
    expect(await decodeDesign('abc$$')).toBeNull()
    expect(await decodeDesign('')).toBeNull()
  })
  it('한도를 넘는 설계는 링크를 만들지 않는다', async () => {
    const d = FIXTURES.dashboard()
    // 압축이 잘 안 되는 임의 문자열로 키운다
    const noise = Array.from({ length: 40 }, () => Array.from({ length: 1500 }, () => String.fromCharCode(0xac00 + Math.floor(Math.random() * 11000))).join(''))
    const big = { ...d, items: noise.map((t, i) => ({ ...d.items[1], id: `n${i}`, props: { title: t } })) }
    const r = await shareUrl(big, 'https://example.com/')
    expect(r.ok).toBe(false)
  })
})

describe('위험한 입력', () => {
  it('풀면 아주 커지는 링크(압축 폭탄)는 null', async () => {
    const big = new TextEncoder().encode('{"v":1,"pad":"' + '0'.repeat(10_000_000) + '"}')
    const res = new Response(new Blob([big]).stream().pipeThrough(new CompressionStream('deflate-raw')))
    const bytes = new Uint8Array(await res.arrayBuffer())
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    const code = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(code.length).toBeLessThan(CONFIG.shareMaxLength)
    expect(await decodeDesign(code)).toBeNull()
  })
})

describe('링크 만들기 한도', () => {
  it('압축은 작아도 풀린 크기가 열기 한도를 넘으면 링크를 만들지 않는다', async () => {
    const d = FIXTURES.dashboard()
    const big = { ...d, items: [{ ...d.items[1], props: { title: '가'.repeat(1_400_000) } }] }
    const r = await shareUrl(big, 'https://example.com/')
    expect(r.ok).toBe(false)
  })
})
