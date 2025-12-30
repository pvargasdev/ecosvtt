import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GameProvider } from './context/GameContext'
// ADICIONE ESTA LINHA ABAIXO:
import { AudioProvider } from './context/AudioContext' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameProvider>
      <AudioProvider>
            <App />
      </AudioProvider>
    </GameProvider>
  </React.StrictMode>,
)