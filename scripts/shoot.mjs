// 화면 확인용 캡처: node scripts/shoot.mjs "<해시>" 이름 [폭 높이] [dark]
import { join } from 'node:path'
import { BASE, SHOTS, launch, startServer } from './lib.mjs'

const [hash = '#/', name = 'shot', w = '1440', h = '900', theme] = process.argv.slice(2)
const server = await startServer()
const browser = await launch()
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, colorScheme: theme === 'dark' ? 'dark' : 'light' })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + hash)
  await page.waitForTimeout(1500)
  const file = join(SHOTS, `${name}.png`)
  await page.screenshot({ path: file, fullPage: theme === 'full' })
  console.log(file)
  if (errors.length) console.log('콘솔 오류:\n' + errors.join('\n'))
} finally {
  await browser.close()
  server.kill()
}
