import React, { useState, useEffect, useCallback } from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';
import { useGame } from './context/GameContext';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const { isGMWindow } = useGame();

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault(); 
        setShowUI((prev) => !prev);
      }
      
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);
  
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter select-none">
      
      <div 
        className={`
          transition-all duration-300 ease-in-out relative z-20 shadow-2xl shrink-0 bg-ecos-bg h-full
          ${isCollapsed ? 'w-[60px]' : 'w-[400px]'}
          ${showUI ? 'translate-x-0' : '-translate-x-full w-0 opacity-0'} 
          /* Quando showUI é false, puxamos a sidebar para fora da tela */
        `}
        style={{ 
          marginRight: showUI ? 0 : (isCollapsed ? '-60px' : '-400px')
        }}
      >
        <CharacterSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <div className="flex-1 h-full relative z-10 bg-gray-900">
        <Board showUI={showUI} />
      </div>
    </div>
  );
}

export default App;