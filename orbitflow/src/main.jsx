import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/main.css'
import './css/components.css'
import './css/ui.css'
import './css/auth.css'
import './css/layout.css'
import './css/dashboard.css'
import './css/landing.css'
import './css/social.css'
import './css/team.css'
import './css/chat.css'
import './css/avatar.css'
import './css/settings.css'
import './css/admin.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
