import React, { useState } from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';
import { useGame } from './context/GameContext'; // Importe o contexto

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isGMWindow } = useGame(); // Verifica se é janela do mestre

  // LAYOUT DA JANELA DO MESTRE (Sem Sidebar)
  if (isGMWindow) {
    return (
      <div className="flex h-screen w-screen bg-gray-900 overflow-hidden font-inter">
        <div className="flex-1 h-full relative z-10">
          <Board />
        </div>
      </div>
    );
  }

  // LAYOUT PADRÃO (Com Sidebar)
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter">
      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[60px]' : 'w-[400px]'} h-full  z-20 shadow-2xl relative shrink-0 bg-ecos-bg`}>
        <CharacterSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <div className="flex-1 h-full relative z-10 bg-gray-900">
        <Board />
      </div>
    </div>
  );
}

export default App;