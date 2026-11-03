// 모든 숫자 설정은 여기 한 곳에 둔다. (조절) 표시는 사용자 선호가 없는 기본값이다.
export const CONFIG = {
  grid: 8, // 이동·크기 스냅 단위(px) (조절)
  artboards: {
    desktop: { label: '데스크톱', w: 1440, h: 1024 },
    tablet: { label: '태블릿', w: 834, h: 1112 },
    phone: { label: '휴대폰', w: 390, h: 844 },
  },
  artboardMinH: 200,
  artboardMaxH: 8000, // (조절) 전체 블록 회귀 설계(약 7,400px)가 들어가는 높이
  historyLimit: 100, // 실행 취소 단계 수 (조절)
  autosaveMs: 400, // 마지막 변경 뒤 자동 저장까지 (조절)
  propCommitMs: 400, // 속성 입력을 한 단계로 묶는 시간 (조절)
  shareWarnLength: 6000, // 이 길이를 넘으면 메신저 잘림 안내 (조절)
  shareMaxLength: 32000, // 이 길이를 넘으면 링크를 만들지 않음 (조절)
  zoom: { min: 0.25, max: 2, step: 0.25 }, // (조절)
  pngScale: 2, // (조절)
  nudge: { small: 8, large: 40 }, // (조절)
  dragThreshold: 3, // 이 거리를 넘게 움직여야 끌기 시작 (조절)
  snapDistance: 6, // 안내선에 붙는 거리(px, 화면 기준) (조절)
  addOffset: 24, // 클릭 추가 시 겹치면 비켜 놓는 거리 (조절)
  limits: { items: 500, string: 2000, list: 50, name: 80 },
} as const

export type ArtboardKind = keyof typeof CONFIG.artboards
