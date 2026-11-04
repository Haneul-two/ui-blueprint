// 화면 검사(e2e): npm run build 뒤 npm run e2e
// 사양서 5장 5~9·11번을 실제 브라우저(설치된 Chrome)로 확인한다.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BASE, SHOTS, launch, startServer } from './lib.mjs'

const results = []
const pass = (name, detail = '') => results.push({ ok: true, name, detail })
const fail = (name, detail = '') => results.push({ ok: false, name, detail })
const check = (cond, name, detail = '') => (cond ? pass(name, detail) : fail(name, detail))
const consoleErrors = []

function watch(page, label) {
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`[${label}] ${m.text()}`))
  page.on('pageerror', (e) => consoleErrors.push(`[${label}] ${e.message}`))
}

const items = (page) =>
  page.$$eval('.ub-canvas .ub-item, .ub-scaled .ub-item', (els) =>
    els.map((e) => ({ id: e.dataset.id, type: e.dataset.type, x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: parseFloat(e.style.width), h: parseFloat(e.style.height) })),
  )

async function openFixture(page, name, id = `e2e-${name}`) {
  await page.goto(`${BASE}#/edit/${id}?fixture=${name}`)
  await page.waitForSelector('.ub-canvas .ub-art')
  await page.waitForTimeout(300)
}

// 대비 측정: 글자 노드마다 글자색과 실제 배경색(조상 중 처음 나오는 불투명 배경)으로 WCAG 대비를 잰다.
const CONTRAST_FN = () => {
  const parse = (s) => {
    let m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }
    }
    m = s.match(/color\(srgb ([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number)
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] ?? 1 }
    }
    return null
  }
  const lum = ({ r, g, b }) => {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const bad = []
  let checked = 0
  let skipped = 0
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  while (walker.nextNode()) {
    const t = walker.currentNode
    const el = t.parentElement
    if (!el || seen.has(el) || !t.textContent.trim()) continue
    seen.add(el)
    if (el.closest('[aria-hidden="true"], .ub-sr, .ub-sr *, [inert] [hidden], option, script, style')) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || el.closest('button:disabled')) continue
    // 투명하게 숨긴 요소(뜨기 전 토스트 등)는 뺀다
    let op = 1
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity)
    if (op < 0.99) {
      skipped++
      continue
    }
    let bg = null
    let gradient = false
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        gradient = true
        break
      }
      const c = parse(s.backgroundColor)
      if (c && c.a > 0) {
        bg = bg ? blend(bg, c) : c
        if (bg.a >= 0.99 || c.a >= 0.99) {
          if (c.a >= 0.99 && bg !== c) bg = blend(bg, c)
          break
        }
      }
    }
    const fgRaw = parse(cs.color)
    if (gradient || !fgRaw || (cs.webkitTextFillColor && cs.webkitTextFillColor.includes('rgba(0, 0, 0, 0)'))) {
      skipped++
      continue
    }
    bg = bg && bg.a < 1 ? blend(bg, { r: 255, g: 255, b: 255, a: 1 }) : bg ?? { r: 255, g: 255, b: 255, a: 1 }
    const fg = fgRaw.a < 1 ? blend(fgRaw, bg) : fgRaw
    const L1 = lum(fg)
    const L2 = lum(bg)
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
    const size = parseFloat(cs.fontSize)
    const bold = Number(cs.fontWeight) >= 700
    // 아트보드는 축소되어 보일 수 있으니 CSS 글자 크기(설계 크기)로 판정한다
    const large = size >= 24 || (bold && size >= 18.66)
    const need = large ? 3 : 4.5
    checked++
    if (ratio + 0.005 < need) bad.push(`${ratio.toFixed(2)}:1 < ${need} "${t.textContent.trim().slice(0, 24)}" (${el.className || el.tagName})`)
  }
  return { checked, skipped, bad }
}

// 접근 가능한 이름이 없는 조작 요소를 찾는다.
const NAMES_FN = () => {
  const missing = []
  for (const el of document.querySelectorAll('button, [role="button"], a[href], input:not([type="hidden"]), select, textarea, [role="switch"], [role="tab"], [role="radio"]')) {
    if (el.closest('[aria-hidden="true"]')) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const label =
      el.getAttribute('aria-label') ||
      (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join('').trim() ||
      el.textContent.trim() ||
      el.getAttribute('title') ||
      (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent.trim()) ||
      el.closest('label')?.textContent.trim() ||
      el.getAttribute('placeholder')
    if (!label) missing.push(el.outerHTML.slice(0, 90))
  }
  return missing
}

const server = await startServer()
const browser = await launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await ctx.newPage()
  watch(page, 'main')

  // ① 끌어 놓기: 놓은 자리에 8의 배수 좌표로 생긴다
  await page.goto(BASE)
  await page.getByRole('button', { name: '빈 설계로 시작' }).click()
  await page.waitForSelector('.ub-canvas .ub-art')
  const editUrl = page.url()
  const art = await page.locator('.ub-canvas .ub-art').boundingBox()
  const zoom = await page.$eval('.ub-canvas .ub-art', (e) => e.getBoundingClientRect().width / e.offsetWidth)
  await page.locator('[data-block="kpi"]').dragTo(page.locator('.ub-canvas__board'), { targetPosition: { x: Math.round(300 * zoom) + 3, y: Math.round(200 * zoom) + 5 } })
  await page.waitForTimeout(200)
  let list = await items(page)
  const kpi = list.find((i) => i.type === 'kpi')
  check(!!kpi && kpi.x % 8 === 0 && kpi.y % 8 === 0 && Math.abs(kpi.x - 300) <= 16 && Math.abs(kpi.y - 200) <= 16, '① 끌어 놓은 자리에 8의 배수 좌표', JSON.stringify(kpi))

  // ② 크기 조절: w·h가 8의 배수이고 최소 크기 이상
  await page.locator(`.ub-item[data-id="${kpi.id}"]`).click({ position: { x: 20, y: 20 } })
  const se = await page.locator('.ub-handle[data-h="se"]').boundingBox()
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2)
  await page.mouse.down()
  await page.mouse.move(se.x + 61 * zoom, se.y + 37 * zoom, { steps: 6 })
  await page.mouse.up()
  list = await items(page)
  const resized = list.find((i) => i.id === kpi.id)
  check(resized.w % 8 === 0 && resized.h % 8 === 0 && resized.w > kpi.w && resized.h > kpi.h, '② 크기 조절 후 8의 배수', JSON.stringify(resized))
  // 작게 줄여도 최소 크기 이상
  const se2 = await page.locator('.ub-handle[data-h="se"]').boundingBox()
  await page.mouse.move(se2.x + 4, se2.y + 4)
  await page.mouse.down()
  await page.mouse.move(se2.x - 900 * zoom, se2.y - 900 * zoom, { steps: 6 })
  await page.mouse.up()
  list = await items(page)
  const tiny = list.find((i) => i.id === kpi.id)
  check(tiny.w === 160 && tiny.h === 96, '② 최소 크기(160×96) 아래로 줄지 않음', JSON.stringify(tiny))

  // ③ Ctrl+Z는 직전 한 단계만 되돌린다
  await page.locator('.ub-canvas').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)
  list = await items(page)
  const undone = list.find((i) => i.id === kpi.id)
  check(!!undone && undone.w === resized.w && undone.h === resized.h, '③ Ctrl+Z 한 단계(직전 크기로)', JSON.stringify(undone))

  // 8 키보드: 목록에서 Enter로 추가 → 화살표 이동 → Delete
  await page.locator('[data-block="toggle"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)
  list = await items(page)
  const tg = list.find((i) => i.type === 'toggle')
  check(!!tg, '8 키보드 Enter로 블록 추가')
  await page.locator('.ub-canvas').focus().catch(() => {})
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  await page.waitForTimeout(100)
  list = await items(page)
  const tg2 = list.find((i) => i.id === tg.id)
  check(tg2.x === tg.x + 8 && tg2.y === tg.y + 40, '8 화살표 이동(8px, Shift 40px)', `${tg.x},${tg.y} → ${tg2.x},${tg2.y}`)
  // 레이어 패널에서 키보드로 선택
  await page.getByRole('tab', { name: /레이어/ }).click()
  const layerBtn = page.locator('.ub-layers__name').filter({ hasText: 'KPI 카드' })
  await layerBtn.focus()
  await page.keyboard.press('Enter')
  check((await page.locator('.ub-sel').count()) === 1 && (await page.locator(`.ub-item[data-id="${kpi.id}"][data-selected]`).count()) === 1, '8 레이어 패널에서 키보드로 선택')
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.keyboard.press('Delete')
  await page.waitForTimeout(100)
  list = await items(page)
  check(!list.some((i) => i.id === kpi.id), '8 Delete로 삭제')
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(600)

  // ⑤ 새로고침 후 남아 있다
  const before = (await items(page)).length
  await page.reload()
  await page.waitForSelector('.ub-canvas .ub-art')
  const after = (await items(page)).length
  check(before === 2 && after === before, '⑤ 새로고침 후 설계 유지', `${before} → ${after}`)
  check(page.url() === editUrl, '⑤ 같은 주소')

  // 5-6 레이아웃 1440×900: 세 칸 보임, 가로 스크롤 없음
  const layout = await page.evaluate(() => {
    const vis = (s) => {
      const r = document.querySelector(s)?.getBoundingClientRect()
      return !!r && r.width > 100 && r.right <= innerWidth + 1 && r.left >= -1
    }
    return { left: vis('.ub-left'), canvas: vis('.ub-canvas'), right: vis('.ub-right'), hscroll: document.documentElement.scrollWidth > innerWidth }
  })
  check(layout.left && layout.canvas && layout.right && !layout.hscroll, '6 편집기 1440×900 세 칸·가로 스크롤 없음', JSON.stringify(layout))
  await page.screenshot({ path: join(SHOTS, 'e2e-editor-1440.png') })

  // ④ 미리보기 상호작용 / 편집 모드에서는 동작 안 함
  await openFixture(page, 'all-blocks')
  const sw = page.locator('.ub-item[data-type="toggle"] [role="switch"]')
  const swBefore = await sw.getAttribute('aria-checked')
  await sw.click({ force: true })
  check((await sw.getAttribute('aria-checked')) === swBefore, '④ 편집 모드에서 토글이 바뀌지 않음')
  await page.getByRole('radio', { name: '미리보기' }).click()
  await page.waitForTimeout(150)
  await sw.click()
  check((await sw.getAttribute('aria-checked')) !== swBefore, '④ 미리보기 토글 동작')
  const tabs = page.locator('.ub-item[data-type="tabs"]')
  await tabs.getByRole('tab').nth(1).click()
  check((await tabs.locator('[role="tabpanel"]:not([hidden])').textContent()).includes('화요일'), '④ 탭 전환')
  const faq = page.locator('.ub-item[data-type="faq"]')
  await faq.getByRole('button').nth(1).click()
  check((await faq.getByRole('button').nth(1).getAttribute('aria-expanded')) === 'true' && (await faq.getByRole('button').nth(0).getAttribute('aria-expanded')) === 'false', '④ 아코디언(하나만 펼치기)')
  const modal = page.locator('.ub-item[data-type="modal"]')
  await modal.getByRole('button', { name: '취소' }).click()
  check((await modal.getByRole('dialog').count()) === 0, '④ 모달 취소로 닫힘')
  await modal.getByRole('button', { name: '노트 삭제' }).click()
  await page.waitForTimeout(100)
  check((await modal.getByRole('dialog').count()) === 1, '④ 모달 버튼으로 열림')
  await page.keyboard.press('Escape')
  check((await modal.getByRole('dialog').count()) === 0, '④ 모달 Esc로 닫힘')
  const form = page.locator('.ub-item[data-type="signup-form"]')
  await form.getByRole('button', { name: '무료로 시작' }).click()
  const errs1 = await form.locator('.bk-field__err').count()
  await form.getByLabel('이름').fill('김하늘')
  await form.getByLabel('이메일').fill('wrong')
  const errs2 = await form.locator('.bk-field__err').allTextContents()
  await form.getByLabel('이메일').fill('sky@example.com')
  const errs3 = await form.locator('.bk-field__err').count()
  await form.getByRole('button', { name: '무료로 시작' }).click()
  await page.waitForTimeout(1200)
  const done = await form.getByRole('button', { name: '완료' }).count()
  check(errs1 === 2 && errs2.length === 1 && errs2[0].includes('형식') && errs3 === 0 && done === 1, '④ 폼 검증(빈 칸 2 → 형식 1 → 0 → 완료)', `${errs1}/${errs2.length}/${errs3}/${done}`)
  const dd = page.locator('.ub-item[data-type="dropdown"]')
  await dd.locator('.bk-select').click()
  await dd.getByRole('option').nth(1).locator('button').click()
  check((await dd.locator('.bk-select').textContent()).includes('팀 전체'), '④ 드롭다운 선택')
  const car = page.locator('.ub-item[data-type="carousel"]')
  await car.getByRole('button', { name: '다음' }).click()
  check((await car.locator('.bk-carousel__nav span').textContent()).startsWith('2'), '④ 캐러셀 다음')
  const chk = page.locator('.ub-item[data-type="checklist"]')
  await chk.getByRole('checkbox').nth(2).check()
  check((await chk.locator('.bk-card__head span').textContent()).replace(/\s/g, '') === '3/4', '④ 체크리스트 진행 수')
  const chat = page.locator('.ub-item[data-type="chat"]')
  await chat.getByLabel('메시지 입력').fill('안녕하세요')
  await chat.getByLabel('메시지 입력').press('Enter')
  await page.waitForTimeout(1400)
  check((await chat.locator('.bk-bubble').allTextContents()).some((t) => t.includes('확인했습니다')), '④ 채팅 보내기·답장')
  await page.screenshot({ path: join(SHOTS, 'e2e-preview.png') })
  // 처음부터 열린 모달: 포커스가 바깥에 있어도 Esc로 닫힌다
  await openFixture(page, 'all-blocks', 'e2e-modal')
  await page.getByRole('radio', { name: '미리보기' }).click()
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await page.keyboard.press('Escape')
  check((await page.locator('.ub-item[data-type="modal"] [role="dialog"]').count()) === 0, '④ 처음부터 열린 모달도 바깥 Esc로 닫힘')

  // ⑥ 공유 링크 → 새 컨텍스트에서 같은 블록 수·위치
  await openFixture(page, 'dashboard', 'e2e-share')
  const srcItems = await items(page)
  await page.getByRole('button', { name: '공유 링크' }).click()
  const url = await page.locator('.ub-share input').inputValue()
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await ctx2.newPage()
  watch(p2, 'share')
  await p2.goto(url)
  await p2.waitForSelector('.ub-scaled .ub-art')
  const viewItems = await items(p2)
  const same = srcItems.length === viewItems.length && srcItems.every((a) => viewItems.some((b) => b.type === a.type && b.x === a.x && b.y === a.y && b.w === a.w && b.h === a.h))
  check(same, '⑥ 공유 링크 보기 전용 화면이 같은 배치', `${srcItems.length} / ${viewItems.length}, 링크 ${url.length}자`)
  // 내 설계로 복사
  await p2.getByRole('button', { name: '내 설계로 복사' }).click()
  await p2.waitForSelector('.ub-canvas .ub-art')
  check((await items(p2)).length === srcItems.length, '⑥ 보기 화면에서 내 설계로 복사')
  // 깨진 링크
  await p2.goto(`${BASE}#/view?d=broken`)
  await p2.waitForTimeout(400)
  check((await p2.getByText('링크가 깨졌거나').count()) === 1, '⑥ 깨진 링크 안내')
  await ctx2.close()

  // ⑦ PNG: 크기 = 아트보드 × 2, 빈 그림 아님
  await page.locator('.ub-share__close').click()
  await page.locator('.ub-menu summary').click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG 이미지' }).click()])
  const pngPath = join(SHOTS, 'e2e-export.png')
  await dl.saveAs(pngPath)
  const b64 = readFileSync(pngPath).toString('base64')
  const info = await page.evaluate(async (data) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const colors = new Set()
    for (let i = 0; i < d.length; i += 4 * 97) colors.add((d[i] >> 3) * 1024 + (d[i + 1] >> 3) * 32 + (d[i + 2] >> 3))
    return { w: img.naturalWidth, h: img.naturalHeight, colors: colors.size }
  }, b64)
  check(info.w === 1440 * 2 && info.h === 1024 * 2 && info.colors >= 16, '⑦ PNG 크기·내용', JSON.stringify(info))
  // AI 사양서 내려받기
  await page.locator('.ub-menu summary').click().catch(() => {})
  if (!(await page.locator('.ub-menu[open]').count())) await page.locator('.ub-menu summary').click()
  const [md] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /AI용 사양서 내려받기/ }).click()])
  const mdPath = join(SHOTS, 'e2e-spec.md')
  await md.saveAs(mdPath)
  const mdText = readFileSync(mdPath, 'utf8')
  check(mdText.includes('# 팀 대시보드') && mdText.includes('KPI 카드') && mdText.includes('## 만들어 주세요'), 'AI용 사양서 내려받기')

  // 접근 가능한 이름(편집기)
  const missEditor = await page.evaluate(NAMES_FN)
  check(missEditor.length === 0, '8 편집기 조작 요소 이름', missEditor.slice(0, 5).join(' | '))

  // 대비: 편집기(라이트·다크)
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.waitForTimeout(150)
    const r = await page.evaluate(CONTRAST_FN)
    check(r.bad.length === 0, `7 대비 편집기 ${scheme}`, `검사 ${r.checked}, 제외 ${r.skipped}${r.bad.length ? ' / ' + r.bad.slice(0, 6).join(' | ') : ''}`)
  }
  await page.emulateMedia({ colorScheme: 'light' })

  // 내보내기 메뉴는 항목을 고르면 닫힌다(열려 있으면 오른쪽 패널 탭을 가린다)
  check((await page.locator('.ub-menu[open]').count()) === 0, '내보내기 항목을 고르면 메뉴가 닫힘')

  // 테마 조절판: 글꼴 12종 타일·바탕색 견본(대비·이름), 글꼴을 바꾸면 아트보드에 반영
  await page.locator('.ub-right [role="tab"]', { hasText: '테마' }).click()
  await page.locator('.ub-fonts [role="radio"]', { hasText: '고운바탕' }).click()
  await page.getByRole('button', { name: '바탕색 #eef4ff' }).click()
  await page.waitForTimeout(400)
  const themed = await page.$eval('.ub-canvas .ub-art', (e) => ({ font: getComputedStyle(e).fontFamily, bg: getComputedStyle(e).backgroundColor }))
  const fontTiles = await page.locator('.ub-fonts [role="radio"]').count()
  const rTheme = await page.evaluate(CONTRAST_FN)
  const missTheme = await page.evaluate(NAMES_FN)
  check(fontTiles === 12 && themed.font.includes('Gowun Batang') && themed.bg === 'rgb(238, 244, 255)' && rTheme.bad.length === 0 && missTheme.length === 0, '테마 글꼴·바탕색 적용, 조절판 대비·이름', `글꼴 ${fontTiles}종, ${themed.font.slice(0, 20)}, ${themed.bg}, 대비 문제 ${rTheme.bad.length}${rTheme.bad.length ? ' / ' + rTheme.bad.slice(0, 4).join(' | ') : ''}, 이름 없음 ${missTheme.length}`)
  // 블록을 고른 채 글꼴 타일에서 방향키: 글꼴만 바뀌고 블록은 그대로
  await page.locator('.ub-canvas .ub-item[data-type="kpi"]').first().click()
  const kpiBefore = (await items(page)).find((i) => i.type === 'kpi')
  await page.locator('.ub-right [role="tab"]', { hasText: '테마' }).click()
  await page.locator('.ub-fonts [role="radio"][aria-checked="true"]').focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  const kpiAfter = (await items(page)).find((i) => i.id === kpiBefore.id)
  const picked = await page.locator('.ub-fonts [role="radio"][aria-checked="true"]').textContent()
  check(kpiAfter.x === kpiBefore.x && kpiAfter.y === kpiBefore.y && picked.includes('도현'), '8 글꼴 타일 방향키는 블록을 옮기지 않음', `${kpiBefore.x},${kpiBefore.y} → ${kpiAfter.x},${kpiAfter.y}, 고른 글꼴 ${picked}`)
  await page.locator('.ub-right [role="tab"]').first().click()

  // 대비·이름: 블록 견본(라이트·다크 블록 테마)
  for (const t of ['light', 'dark']) {
    await page.goto(`${BASE}#/blocks${t === 'dark' ? '?theme=dark' : ''}`)
    await page.waitForTimeout(1500)
    const r = await page.evaluate(CONTRAST_FN)
    check(r.bad.length === 0, `7 대비 블록 견본 ${t}`, `검사 ${r.checked}, 제외 ${r.skipped}${r.bad.length ? ' / ' + r.bad.slice(0, 8).join(' | ') : ''}`)
  }
  const missBlocks = await page.evaluate(NAMES_FN)
  check(missBlocks.length === 0, '8 블록 견본 조작 요소 이름', missBlocks.slice(0, 5).join(' | '))
  await page.goto(BASE)
  await page.waitForTimeout(300)
  const missHome = await page.evaluate(NAMES_FN)
  check(missHome.length === 0, '8 목록 화면 조작 요소 이름', missHome.slice(0, 5).join(' | '))
  // 대비: 첫 화면(히어로는 남색 면, 아래는 제도 용지)
  await page.waitForTimeout(1200) // 제목 등장 연출이 끝날 때까지
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.waitForTimeout(150)
    const r = await page.evaluate(CONTRAST_FN)
    check(r.bad.length === 0, `7 대비 첫 화면 ${scheme}`, `검사 ${r.checked}, 제외 ${r.skipped}${r.bad.length ? ' / ' + r.bad.slice(0, 6).join(' | ') : ''}`)
  }
  await page.emulateMedia({ colorScheme: 'light' })

  // 12 아트보드 종류 전환: 블록을 새 폭에 다시 배치(겹침 없음, 아트보드 안)
  for (const [fx, kind] of [['dashboard', '휴대폰'], ['landing', '태블릿'], ['app', '데스크톱']]) {
    await openFixture(page, fx, `e2e-reflow-${fx}`)
    await page.locator('.ub-right button[role="radio"]', { hasText: kind }).click()
    await page.waitForTimeout(300)
    const art = await page.$eval('.ub-canvas .ub-art', (e) => ({ w: parseFloat(e.style.width), h: parseFloat(e.style.height) }))
    const list = await items(page)
    const outside = list.filter((i) => i.x < 0 || i.y < 0 || i.x + i.w > art.w || i.y + i.h > art.h).length
    let overlap = 0
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const p = list[a], q = list[b]
      if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) overlap++
    }
    const toast = await page.getByText('폭에 맞춰 블록을 다시 배치했습니다').count()
    check(outside === 0 && overlap === 0 && toast === 1, `12 ${fx} → ${kind} 다시 배치`, `폭 ${art.w}, 블록 ${list.length}, 밖 ${outside}, 겹침 ${overlap}, 안내 ${toast}`)
  }

  // 9 움직임 줄이기: 모션 블록이 멈춘다
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const p3 = await ctx3.newPage()
  watch(p3, 'reduced')
  await p3.goto(`${BASE}#/blocks`)
  await p3.waitForTimeout(1200)
  const motionSel = '[data-type="text-effect"], [data-type="marquee"], [data-type="skeleton"], [data-type="terminal"], [data-type="line-chart"], [data-type="bar-chart"]'
  const running = await p3.$$eval(motionSel, (els) => els.flatMap((e) => e.getAnimations({ subtree: true })).filter((a) => a.playState === 'running').length)
  const snap1 = await p3.$$eval(motionSel, (els) => els.map((e) => e.innerHTML).join('|'))
  await p3.waitForTimeout(1100)
  const snap2 = await p3.$$eval(motionSel, (els) => els.map((e) => e.innerHTML).join('|'))
  check(running === 0 && snap1 === snap2, '9 움직임 줄이기에서 모션 정지', `실행 중 애니메이션 ${running}, 1초 사이 변화 ${snap1 === snap2 ? '없음' : '있음'}`)
  await p3.goto(BASE)
  await p3.waitForTimeout(600)
  const heroRunning = await p3.$eval('.hero', (e) => e.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)
  const titleShown = await p3.$eval('.hero__title', (e) => getComputedStyle(e.querySelector('.wr-word > span')).opacity)
  check(heroRunning === 0 && titleShown === '1', '9 움직임 줄이기에서 첫 화면 연출 정지', `실행 중 애니메이션 ${heroRunning}, 제목 불투명도 ${titleShown}`)
  await ctx3.close()

  // 6 좁은 화면 390×844: 목록·보기 가로 넘침 없음, 편집기는 안내
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p4 = await ctx4.newPage()
  watch(p4, 'mobile')
  await p4.goto(BASE)
  await p4.waitForTimeout(300)
  const homeOver = await p4.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  await p4.screenshot({ path: join(SHOTS, 'e2e-home-390.png'), fullPage: true })
  await p4.goto(url)
  await p4.waitForSelector('.ub-scaled .ub-art')
  await p4.waitForTimeout(300)
  const viewOver = await p4.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  await p4.screenshot({ path: join(SHOTS, 'e2e-view-390.png') })
  await p4.goto(`${BASE}#/edit/m1?fixture=app`)
  await p4.waitForTimeout(500)
  const narrowNote = await p4.getByText('편집은 폭 900px 이상').count()
  const editOver = await p4.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  check(homeOver <= 0 && viewOver <= 0 && narrowNote === 1 && editOver <= 0, '6 390×844 가로 넘침 없음·편집 안내', `목록 ${homeOver}, 보기 ${viewOver}, 편집 ${editOver}, 안내 ${narrowNote}`)
  await ctx4.close()

  // 11 참고 측정: 전체 블록 설계에서 끌기 프레임 간격
  await openFixture(page, 'all-blocks', 'e2e-perf')
  const box = await page.locator('.ub-item[data-type="kpi"]').boundingBox()
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const tick = (t) => {
      window.__frames.push(t - last)
      last = t
      if (window.__frames.length < 400) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  for (let i = 0; i < 60; i++) {
    await page.mouse.move(box.x + 20 + i * 4, box.y + 20 + i * 2)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  await page.mouse.up()
  const frames = await page.evaluate(() => window.__frames.slice(1, 61).sort((a, b) => a - b))
  const median = frames[Math.floor(frames.length / 2)]
  check(median <= 33, '11 (참고) 끌기 프레임 간격 중앙값 ≤ 33ms', `${median.toFixed(1)}ms (헤드리스)`)

  check(consoleErrors.length === 0, '⑧ 콘솔 오류 0', consoleErrors.slice(0, 5).join(' | '))
} catch (e) {
  fail('검사 중단', e.stack)
} finally {
  await browser.close()
  server.kill()
}

for (const r of results) console.log(`${r.ok ? '통과' : '실패'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} 통과`)
process.exitCode = failed ? 1 : 0
