import { toBlob } from 'html-to-image'
import { CONFIG } from '../config'

/** 아트보드 요소를 PNG로 찍는다. 부르는 쪽이 정지 모드로 다시 그린 뒤 넘긴다. */
export async function artboardPng(el: HTMLElement): Promise<Blob> {
  const blob = await toBlob(el, {
    pixelRatio: CONFIG.pngScale,
    cacheBust: true,
    width: el.offsetWidth,
    height: el.offsetHeight,
    style: { transform: 'none', margin: '0', left: '0', top: '0' },
    // 선택 표시·치수선·안내선 같은 편집기 장식은 빼고 찍는다.
    filter: (node) => !(node instanceof HTMLElement && node.dataset.noexport !== undefined),
  })
  if (!blob) throw new Error('이미지를 만들지 못했습니다.')
  return blob
}
