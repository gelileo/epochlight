import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocaleProvider } from './hooks/useLocale.tsx'
import { TierProvider } from './hooks/TierProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TierProvider>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </TierProvider>
  </StrictMode>,
)
