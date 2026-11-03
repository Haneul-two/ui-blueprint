import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './vendor/stageshow/stage.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/editor.css'
import './styles/blocks.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
