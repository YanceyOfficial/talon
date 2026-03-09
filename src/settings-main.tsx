import '@/assets/base.css'
import { applyTheme, getSystemPrefersDark } from '@/lib/theme'
import { SettingsPage } from '@/pages/settings'
import React from 'react'
import ReactDOM from 'react-dom/client'

// Apply system preference immediately to avoid theme flash
applyTheme(getSystemPrefersDark() ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('settings-root')!).render(
  <React.StrictMode>
    <SettingsPage />
  </React.StrictMode>
)
