import { TooltipProvider } from '@/components/ui/tooltip'
import { applyTheme, getSystemPrefersDark } from '@/lib/theme'
import App from '@/pages/app'
import React from 'react'
import ReactDOM from 'react-dom/client'

// Apply system preference immediately to avoid theme flash
applyTheme(getSystemPrefersDark() ? 'dark' : 'light')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>
)
