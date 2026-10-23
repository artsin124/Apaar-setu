import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppStateProvider } from './state/AppState.jsx'
import { PrefsProvider } from './state/Prefs.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrefsProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </PrefsProvider>
  </StrictMode>,
)
