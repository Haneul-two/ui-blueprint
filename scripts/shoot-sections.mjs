// 블록 견본을 분류별로 나눠 찍는다: node scripts/shoot-sections.mjs [dark]
import { join } from 'node:path'
import { BASE, SHOTS, launch, startServer } from './lib.mjs'

const dark = process.argv[2] === 'dark'
const server = await startServer()
const browser = await launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(BASE + (dark ? '#/blocks?theme=dark' : '#/blocks'))
  await page.waitForTimeout(1500)
  const secs = page.locator('.ub-blocks__cat')
  const n = await secs.count()
  for (let i = 0; i < n; i++) {
    await secs.nth(i).scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)
    const file = join(SHOTS, `cat-${dark ? 'dark-' : ''}${i}.png`)
    await secs.nth(i).screenshot({ path: file })
    console.log(file)
  }
  if (errors.length) console.log('오류:\n' + errors.join('\n'))
} finally {
  await browser.close()
  server.kill()
}
