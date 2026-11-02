import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GameProvider } from './context/GameContext'
import I18nProvider from './i18n/I18nProvider'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </I18nProvider>
  </React.StrictMode>,
)