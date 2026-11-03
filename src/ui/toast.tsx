import { useCallback, useRef, useState } from 'react'

export interface ToastMsg {
  id: number
  text: string
  tone: 'info' | 'error'
}

/** 화면 아래에 잠깐 뜨는 알림. 4초 뒤 사라진다. */
export function useToasts() {
  const [list, setList] = useState<ToastMsg[]>([])
  const seq = useRef(0)
  const notify = useCallback((text: string, tone: ToastMsg['tone'] = 'info') => {
    const id = ++seq.current
    setList((l) => [...l.slice(-2), { id, text, tone }])
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4000)
  }, [])
  return { list, notify }
}

export function Toaster({ list }: { list: ToastMsg[] }) {
  return (
    <div className="ub-toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <p key={t.id} className="ub-toast" data-tone={t.tone}>
          {t.text}
        </p>
      ))}
    </div>
  )
}
