import { CONFIG } from '../config'
import type { Design } from '../model/types'

// 설계를 주소 # 뒤에 담는다: JSON → deflate-raw 압축 → base64url. 서버를 거치지 않는다.

function toB64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i)
  return out
}
/** 풀어서 이 크기를 넘으면 멈춘다. 짧은 링크가 수백 MB로 부풀어 탭을 멈추게 하는 것(압축 폭탄)을 막는다. */
const MAX_DECODED = 4_000_000

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, max = Infinity): Promise<Uint8Array> {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > max) {
      await reader.cancel()
      throw new Error('too large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

export async function encodeDesign(d: Design): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(d))
  return toB64url(await pipe(json, new CompressionStream('deflate-raw')))
}

/** 풀기 실패면 null. 검사는 부르는 쪽에서 validateDesign으로 한다. */
export async function decodeDesign(s: string): Promise<unknown | null> {
  try {
    if (!s || s.length > CONFIG.shareMaxLength * 2) return null
    const bytes = await pipe(fromB64url(s), new DecompressionStream('deflate-raw'), MAX_DECODED)
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

export type ShareResult = { ok: true; url: string; long: boolean } | { ok: false; length: number }

export async function shareUrl(d: Design, base = location.href.split('#')[0]): Promise<ShareResult> {
  // 여는 쪽이 MAX_DECODED에서 멈추므로, 풀린 크기가 그보다 크면 링크를 만들지 않는다(만들어도 안 열린다).
  if (new TextEncoder().encode(JSON.stringify({ ...d, id: 'shared' })).length > MAX_DECODED) return { ok: false, length: Infinity }
  const code = await encodeDesign({ ...d, id: 'shared' })
  if (code.length > CONFIG.shareMaxLength) return { ok: false, length: code.length }
  const url = `${base}#/view?d=${code}`
  return { ok: true, url, long: url.length > CONFIG.shareWarnLength }
}
