import '@/assets/base.css'
import { SettingsPage } from '@/pages/settings'
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('settings-root')!).render(
  <React.StrictMode>
    <SettingsPage />
  </React.StrictMode>
)
