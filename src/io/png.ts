import { toBlob } from 'html-to-image'
import { CONFIG } from '../config'

/** "U+AC00-D7A3, U+0020" 같은 unicode-range에 글자 하나라도 들어가는지 */
function inRange(range: string, codes: Set<number>): boolean {
  if (!range) return true
  return range.split(',').some((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-')
    const lo = parseInt(a.replace(/\?/g, '0'), 16)
    const hi = b ? parseInt(b, 16) : parseInt(a.replace(/\?/g, 'f'), 16)
    for (const c of codes) if (c >= lo && c <= hi) return true
    return false
  })
}

const dataUrl = (blob: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => fail(r.error)
    r.readAsDataURL(blob)
  })

/**
 * PNG에 심을 글꼴 CSS. 고른 글꼴(face) 중 아트보드에 실제로 쓰인 글자 묶음 파일만 골라 data URL로 넣는다.
 * html-to-image 기본 동작은 페이지의 모든 @font-face(한글 글꼴은 수백 개)를 받아 매우 느리다.
 */
async function fontCss(el: HTMLElement, face: string): Promise<string> {
  let text = el.textContent ?? ''
  el.querySelectorAll('input, textarea').forEach((i) => (text += (i as HTMLInputElement).value + (i as HTMLInputElement).placeholder))
  const codes = new Set<number>()
  for (const ch of text) codes.add(ch.codePointAt(0)!)
  const rules: CSSFontFaceRule[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList
    try {
      list = sheet.cssRules
    } catch {
      continue // 다른 출처 CSS는 읽을 수 없다(이 사이트는 글꼴을 함께 실어 해당 없음)
    }
    for (const r of Array.from(list))
      if (r instanceof CSSFontFaceRule && r.style.getPropertyValue('font-family').replace(/["']/g, '').trim() === face && inRange(r.style.getPropertyValue('unicode-range'), codes))
        rules.push(r)
  }
  const out = await Promise.all(
    rules.map(async (r) => {
      const m = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/)
      if (!m) return ''
      try {
        const res = await fetch(new URL(m[1], r.parentStyleSheet?.href ?? location.href))
        if (!res.ok) return ''
        const src = await dataUrl(await res.blob())
        const st = r.style
        return `@font-face{font-family:"${face}";font-style:${st.getPropertyValue('font-style') || 'normal'};font-weight:${st.getPropertyValue('font-weight') || '400'};src:url(${src});${st.getPropertyValue('unicode-range') ? `unicode-range:${st.getPropertyValue('unicode-range')};` : ''}}`
      } catch {
        return '' // 글꼴 하나 못 받아도 그림은 대체 글꼴로 만든다
      }
    }),
  )
  return out.join('\n')
}

/** 아트보드 요소를 PNG로 찍는다. 부르는 쪽이 정지 모드로 다시 그린 뒤 넘긴다. face는 테마 글꼴 이름. */
export async function artboardPng(el: HTMLElement, face: string): Promise<Blob> {
  // 화면에 그려진 글자의 글꼴 파일이 다 내려올 때까지 기다린다.
  await document.fonts.load(`16px "${face}"`, el.textContent?.slice(0, 2000) || 'A').catch(() => undefined)
  await document.fonts.ready
  const blob = await toBlob(el, {
    pixelRatio: CONFIG.pngScale,
    cacheBust: true,
    fontEmbedCSS: await fontCss(el, face),
    width: el.offsetWidth,
    height: el.offsetHeight,
    style: { transform: 'none', margin: '0', left: '0', top: '0' },
    // 선택 표시·치수선·안내선 같은 편집기 장식은 빼고 찍는다.
    filter: (node) => !(node instanceof HTMLElement && node.dataset.noexport !== undefined),
  })
  if (!blob) throw new Error('이미지를 만들지 못했습니다.')
  return blob
}
