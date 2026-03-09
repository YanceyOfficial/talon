import '@/assets/base.css'
import { applyTheme, getSystemPrefersDark } from '@/lib/theme'
import { ChatPage } from '@/pages/chat'
import 'katex/dist/katex.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

// Apply system preference immediately to avoid theme flash
applyTheme(getSystemPrefersDark() ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('chat-root')!).render(
  <React.StrictMode>
    <ChatPage />
  </React.StrictMode>
)
