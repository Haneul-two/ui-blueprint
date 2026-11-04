// 아트보드 글꼴 목록. 모두 사이트에 함께 싣고(외부 글꼴 서버 없음), 고른 글꼴의 CSS만 그때 불러온다.
// 한글 글꼴은 글자 범위별로 잘게 나뉘어 있어 화면에 실제로 쓰인 글자 묶음만 내려받는다.

export type FontGroup = '고딕' | '명조' | '제목용' | '둥근·손글씨' | '고정폭'

export interface FontDef {
  id: string
  label: string
  group: FontGroup
  /** CSS font-family 값 */
  family: string
  /** 글꼴 파일의 family 이름(PNG에 글꼴을 심을 때 찾는 이름) */
  face: string
  load?: () => Promise<unknown>
}

const SYS = 'system-ui, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif'
const SERIF = '"Nanum Myeongjo", Georgia, "Times New Roman", serif'

export const FONTS: FontDef[] = [
  { id: 'sans', label: '프리텐다드', group: '고딕', face: 'Pretendard Variable', family: `"Pretendard Variable", Pretendard, ${SYS}` },
  {
    id: 'noto-sans',
    label: '본고딕',
    group: '고딕',
    face: 'Noto Sans KR',
    family: `"Noto Sans KR", ${SYS}`,
    load: () => Promise.all([import('@fontsource/noto-sans-kr/400.css'), import('@fontsource/noto-sans-kr/700.css')]),
  },
  {
    id: 'plex',
    label: 'IBM 플렉스',
    group: '고딕',
    face: 'IBM Plex Sans KR',
    family: `"IBM Plex Sans KR", ${SYS}`,
    load: () => Promise.all([import('@fontsource/ibm-plex-sans-kr/400.css'), import('@fontsource/ibm-plex-sans-kr/700.css')]),
  },
  {
    id: 'serif',
    label: '본명조',
    group: '명조',
    face: 'Noto Serif KR',
    family: `"Noto Serif KR", ${SERIF}`,
    load: () => Promise.all([import('@fontsource/noto-serif-kr/400.css'), import('@fontsource/noto-serif-kr/700.css')]),
  },
  {
    id: 'myeongjo',
    label: '나눔명조',
    group: '명조',
    face: 'Nanum Myeongjo',
    family: SERIF,
    load: () => Promise.all([import('@fontsource/nanum-myeongjo/400.css'), import('@fontsource/nanum-myeongjo/700.css')]),
  },
  {
    id: 'gowun-batang',
    label: '고운바탕',
    group: '명조',
    face: 'Gowun Batang',
    family: `"Gowun Batang", ${SERIF}`,
    load: () => Promise.all([import('@fontsource/gowun-batang/400.css'), import('@fontsource/gowun-batang/700.css')]),
  },
  { id: 'do-hyeon', label: '도현', group: '제목용', face: 'Do Hyeon', family: `"Do Hyeon", ${SYS}`, load: () => import('@fontsource/do-hyeon/400.css') },
  { id: 'black-han', label: '검은고딕', group: '제목용', face: 'Black Han Sans', family: `"Black Han Sans", ${SYS}`, load: () => import('@fontsource/black-han-sans/400.css') },
  { id: 'gowun-dodum', label: '고운돋움', group: '둥근·손글씨', face: 'Gowun Dodum', family: `"Gowun Dodum", ${SYS}`, load: () => import('@fontsource/gowun-dodum/400.css') },
  { id: 'jua', label: '주아', group: '둥근·손글씨', face: 'Jua', family: `Jua, ${SYS}`, load: () => import('@fontsource/jua/400.css') },
  { id: 'pen', label: '나눔손글씨 펜', group: '둥근·손글씨', face: 'Nanum Pen Script', family: `"Nanum Pen Script", ${SYS}`, load: () => import('@fontsource/nanum-pen-script/400.css') },
  { id: 'mono', label: 'JetBrains Mono', group: '고정폭', face: 'JetBrains Mono', family: '"JetBrains Mono", "D2Coding", ui-monospace, Consolas, monospace' },
]

const BY_ID = new Map(FONTS.map((f) => [f.id, f]))
export const isFontId = (v: unknown): v is string => typeof v === 'string' && BY_ID.has(v)
export const fontOf = (id: string): FontDef => BY_ID.get(id) ?? FONTS[0]

const loading = new Map<string, Promise<unknown>>()
/** 고른 글꼴의 CSS를 한 번만 불러온다. 실패해도 대체 글꼴로 보이니 오류는 삼키고, 다음에 다시 시도하게 캐시에서 뺀다. */
export function ensureFont(id: string): Promise<unknown> {
  const f = fontOf(id)
  if (!f.load) return Promise.resolve()
  let p = loading.get(f.id)
  if (!p) {
    p = f.load().catch(() => {
      loading.delete(f.id)
    })
    loading.set(f.id, p)
  }
  return p
}
