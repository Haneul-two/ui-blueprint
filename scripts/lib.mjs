// e2e·캡처 공용: vite preview를 띄우고 설치된 Chrome으로 연다.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

export const PORT = 5190
export const BASE = `http://localhost:${PORT}/`
export const SHOTS = join(process.cwd(), 'shots')

function chromePath() {
  const cands = [
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  return cands.find((p) => existsSync(p))
}

export async function startServer() {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return proc
    } catch {
      /* 아직 안 떴다 */
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  proc.kill()
  throw new Error('미리보기 서버가 뜨지 않았습니다. npm run build를 먼저 했는지 확인하세요.')
}

export async function launch() {
  const executablePath = chromePath()
  if (!executablePath) throw new Error('Chrome을 찾지 못했습니다. CHROME_PATH 환경변수로 경로를 알려 주세요.')
  mkdirSync(SHOTS, { recursive: true })
  return chromium.launch({ executablePath, headless: true })
}
