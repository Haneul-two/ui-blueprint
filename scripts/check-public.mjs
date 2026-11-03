// 공개물 금지어 검사: node scripts/check-public.mjs
// 금지어 목록은 git에 넣지 않는 scripts/forbidden.local.txt(한 줄에 하나)에 둔다. 목록 자체가 공개되면 안 되기 때문이다.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const listFile = join(root, 'scripts/forbidden.local.txt')
const words = [String.raw`C:\Users`, 'C:/Users', '/c/Users']
if (existsSync(listFile)) words.push(...readFileSync(listFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')))
else console.log('알림: scripts/forbidden.local.txt가 없어 경로 패턴만 검사합니다.')

const TARGETS = ['src', 'docs', 'scripts', 'tests', 'index.html', 'README.md', 'CLAUDE.md', 'package.json', 'dist']
const SKIP = new Set(['forbidden.local.txt', 'check-public.mjs'])
const hits = []
function walk(p) {
  if (!existsSync(p)) return
  const st = statSync(p)
  if (st.isDirectory()) return readdirSync(p).forEach((n) => walk(join(p, n)))
  if (SKIP.has(p.split(/[\\/]/).pop()) || /\.(png|jpe?g|webp|ico)$/i.test(p)) return
  const text = readFileSync(p, 'utf8')
  for (const w of words) if (text.toLowerCase().includes(w.toLowerCase())) hits.push(`${relative(root, p)}: "${w}"`)
}
TARGETS.forEach((t) => walk(join(root, t)))
if (hits.length) {
  console.log(`금지어 ${hits.length}건:\n` + hits.join('\n'))
  process.exitCode = 1
} else console.log(`금지어 0건 (${words.length}개 낱말 검사)`)
