import { useEffect } from 'react'
import { useRoute } from './router'
import { Home } from '../pages/Home'
import { EditPage } from '../pages/EditPage'
import { View } from '../pages/View'
import { Blocks } from '../pages/Blocks'

export function App() {
  const r = useRoute()
  useEffect(() => {
    document.title = r.name === 'blocks' ? '블록 둘러보기 | UI 설계도' : r.name === 'view' ? '공유된 설계 | UI 설계도' : 'UI 설계도'
  }, [r.name])
  if (r.name === 'edit') return <EditPage id={r.id} fixture={r.fixture} />
  if (r.name === 'view') return <View data={r.data} />
  if (r.name === 'blocks') return <Blocks theme={r.theme} />
  return <Home />
}
