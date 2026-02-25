import '@/assets/base.css'
import { ChatPage } from '@/pages/chat'
import 'katex/dist/katex.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('chat-root')!).render(
  <React.StrictMode>
    <ChatPage />
  </React.StrictMode>
)
