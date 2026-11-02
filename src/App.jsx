import React, { useState, useEffect, useCallback } from 'react';
import Board from './components/VTT/Board';
import { useGame } from './context/GameContext';
import SplashScreen from './components/MainMenu/SplashScreen';
import StartScreen from './components/Network/StartScreen';
import PlayerLobby from './components/Network/PlayerLobby';
import { RemoteAudio } from './components/Network/PlayerHUD';
import { useNetwork } from './network';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showUI, setShowUI] = useState(true);
  
  const { isGMWindow } = useGame(); 
  const { mode, status, isPlayer, hasRemoteAdventure } = useNetwork();

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === 'Tab' && !isTyping) { e.preventDefault(); setShowUI((prev) => !prev); }
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  if (showSplash && !isGMWindow) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isGMWindow && mode === null) {
    return <StartScreen />;
  }

  const showLobby = isPlayer && (!hasRemoteAdventure || ['connecting', 'closed', 'error'].includes(status));

  return (
    <>
    {isPlayer && <RemoteAudio />}
    {showLobby ? <PlayerLobby /> : (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter select-none text-white">
      <div className="flex-1 h-full relative z-10 bg-[#0a0a0c]">
        <Board showUI={showUI} />
      </div>
    </div>
    )}
    </>
  );
}

export default App;