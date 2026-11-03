import type { Design } from '../model/types'

export function safeFileName(name: string): string {
  return (name.replace(/[\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'design').slice(0, 60)
}

export function download(name: string, data: Blob | string, type = 'application/json') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportJson(d: Design) {
  download(`${safeFileName(d.name)}.json`, JSON.stringify(d, null, 2))
}

/** 파일 고르기 창을 열어 JSON을 읽는다. 취소하면 null. */
export function pickJsonFile(): Promise<{ text: string; name: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      if (f.size > 5_000_000) return resolve({ text: '', name: f.name })
      resolve({ text: await f.text(), name: f.name })
    }
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
