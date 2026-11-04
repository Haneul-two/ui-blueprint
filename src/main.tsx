import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 글꼴은 사이트 안에 함께 싣는다(외부 글꼴 서버에 접속하지 않게).
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './vendor/stageshow/stage.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/home.css'
import './styles/editor.css'
import './styles/blocks.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
