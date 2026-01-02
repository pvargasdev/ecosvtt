import React, { useState, useEffect, useCallback } from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';
import { useGame } from './context/GameContext';

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUI, setShowUI] = useState(true); // Estado para controlar visibilidade da UI
  const { isGMWindow } = useGame();

  // --- FUNÇÃO DE TELA CHEIA ---
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // --- LISTENER DE TECLADO (TAB e F11) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // TAB: Alterna modo "Sem UI"
      if (e.key === 'Tab') {
        e.preventDefault(); // Impede o foco de pular para elementos do navegador
        setShowUI((prev) => !prev);
      }
      
      // F11: Alterna Tela Cheia (Opcional, pois F11 já é nativo, mas isso força o comportamento)
      // Você pode mudar para outra tecla se quiser, ex: 'Enter' + e.altKey
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // --- LAYOUT UNIFICADO ---
  // Agora tanto Mestre quanto Jogador usam a mesma estrutura base.
  // A Sidebar é escondida visualmente (margin negativa) se showUI for false.
  
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter select-none">
      
      {/* SIDEBAR - Controlada por showUI */}
      <div 
        className={`
          transition-all duration-300 ease-in-out relative z-20 shadow-2xl shrink-0 bg-ecos-bg h-full
          ${isCollapsed ? 'w-[60px]' : 'w-[400px]'}
          ${showUI ? 'translate-x-0' : '-translate-x-full w-0 opacity-0'} 
          /* Quando showUI é false, puxamos a sidebar para fora da tela */
        `}
        style={{ 
          marginRight: showUI ? 0 : (isCollapsed ? '-60px' : '-400px') // Ajuste fino para remover o espaço
        }}
      >
        <CharacterSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* ÁREA DO TABULEIRO */}
      <div className="flex-1 h-full relative z-10 bg-gray-900">
        {/* Passamos showUI para o Board para ele esconder a UI interna dele */}
        <Board showUI={showUI} />
      </div>
    </div>
  );
}

export default App;