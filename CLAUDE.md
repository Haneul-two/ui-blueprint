# UI 설계도 (ui-blueprint)

블록 48개를 골라 아트보드에 놓으며 대시보드·웹사이트·앱 화면을 설계하는 공개용 정적 웹 도구. 사양은 `docs/spec.md`, 경과는 `docs/HISTORY.md`.

## 현재 상태 (2026-11-04)
- 하위 프로젝트 3개(블록 라이브러리, 배치 편집기, 저장·공유·내보내기) 1차 완성. 공개 배포됨: https://haneul-two.github.io/ui-blueprint/ (main에 push하면 GitHub Actions가 테스트 후 자동 배포).
- 2026-11-04 2차 개편: 첫 화면 남색 청사진 히어로(움직이는 격자·빛, 블록 조립 연출), 편집기·견본 청사진 스타일, 아트보드 종류를 바꾸면 블록을 새 폭에 맞춰 다시 배치(`src/model/reflow.ts`).
- 단위 테스트 204개, e2e 46개 통과. Codex 교차 리뷰 2회 반영(2차 개편).
- 알려진 한계: 블록 48개 회귀 설계는 태블릿·휴대폰 전환 시 최대 높이(8000px)를 넘어 전환이 거부된다.
- 알려진 한계: 속성 패널 입력 직후 400ms 안에 탭을 닫으면 그 입력은 저장 안 됨(docs/HISTORY.md).

## 실행
- `npm install` → `npm run dev` (개발) / `npm run build` → `npm run preview` (포트 5190)
- 검사: `npm run typecheck`, `npm test`, `npm run build && npm run e2e`, `npm run check:public`
- 화면 캡처: `node scripts/shoot.mjs "#/blocks" 이름 [폭 높이] [dark|full]`, 분류별 `node scripts/shoot-sections.mjs [dark]`. 결과는 `shots/`(git 제외)
- 고정 설계로 바로 열기: `#/edit/<아무 id>?fixture=dashboard|landing|app|all-blocks`

## 구조
- `src/config.ts` 숫자 설정 전부(CONFIG)
- `src/blocks/` 블록 정의. 새 블록 = 분류 파일에 `BlockDef` 하나 추가하면 목록·속성 패널·AI 사양서·테스트가 따라온다
- `src/editor/` 편집기(Canvas 끌기·크기, snapping 순수 함수, ops 순수 편집 함수, Inspector·Layers·Palette·ThemePanel)
- `src/model/` 설계 타입·기록(실행 취소)·검사기·저장, `reflow.ts` 아트보드 종류 전환 때 다시 배치(좁은 화면은 쌓기, 넓은 화면은 줄 단위)
- `src/pages/HomeHero.tsx` 첫 화면 히어로, 스타일은 `src/styles/home.css`
- `src/io/` 공유 링크(deflate-raw + base64url), JSON 파일, PNG(html-to-image), AI 사양서
- `src/vendor/stageshow/` stageshow 키트 사본(MIT). 브랜드 자산은 뺐다(`NOTICE.md`)

## 규칙 (이유와 함께)
- Git Bash에서 `#/`로 시작하는 인자를 스크립트에 넘길 때는 `MSYS_NO_PATHCONV=1`을 둔다. 안 그러면 `#C:/Program Files/Git/...`로 바뀌어 엉뚱한 화면을 검사한다.
- 리듀서(`historyReducer`) 안에서 id를 만들지 않는다. 리듀서는 렌더 때 돌아 dispatch 직후 그 id를 읽을 수 없다. id는 dispatch 전에 `uid()`로 만들어 넘긴다.
- 블록 크기·최소 크기는 8의 배수로 둔다. 테스트가 강제한다. 아니면 끌어 놓은 좌표가 격자에서 벗어난다.
- 키트 CSS는 `@layer stageshow` 안에 있고 이 사이트 CSS는 레이어 밖이라 항상 이긴다. 키트 토큰을 덮을 때 라이트 전용 값은 `.ub-art:not([data-theme="dark"])`에 둔다. 안 그러면 다크 값까지 덮인다.
- 키트 아바타 이니셜·상태 글자색은 대비가 모자라 `blocks.css`에서 덮었다. 키트 사본은 고치지 않는다.
- 레퍼런스 사이트의 코드·이미지는 넣지 않는다. 구조와 기법만 참고한다. 실존 브랜드 흉내 블록 금지(사용자 요청).
- 공개물에 절대 경로·회사명 금지. 금지어 목록은 `scripts/forbidden.local.txt`(git 제외).
- 키트 리셋(`all: revert`)이 figure·button 같은 태그의 box-sizing을 content-box로 돌린다. 이 사이트 블록(`bk-*`)은 `blocks.css`에서 border-box로 고정했다. 빼면 폭 100% + 안쪽 여백 카드가 상자보다 넓어진다(후기 카드 +40px).
- 블록이 좁은 폭에서 배치를 바꿀 때는 `@container`를 쓴다(컨테이너는 `.ub-item`). 창 폭(@media)이 아니라 블록 폭이 기준이어야 휴대폰 아트보드에서 맞는다.
- 외부 웹 글꼴 CSS는 교차 출처라 html-to-image가 읽지 못해 콘솔 오류를 낸다. PNG는 `skipFonts`로 시스템 글꼴로 찍는다.
