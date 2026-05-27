import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx'
import { DesignProvider } from './design/DesignContext.jsx'
import DesignPanel from './design/DesignPanel.jsx'

const isAdmin = window.location.pathname.startsWith('/admin');
// Design panel is only shown in dev mode (Vite sets import.meta.env.DEV = true)
const isDev = import.meta.env.DEV;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DesignProvider>
      {isAdmin ? <Admin onExit={() => { window.location.href = '/'; }} /> : <App />}
      {isDev && !isAdmin && <DesignPanel />}
    </DesignProvider>
  </StrictMode>,
)
