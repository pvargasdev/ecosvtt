import React, { useState } from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';

function App() {
  // Estado para controlar se a sidebar está recolhida ou expandida
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter">
      
      {/* Sidebar (Personagens) 
          - Adicionado transition-all para animação suave de largura (Push Content)
          - Alterna entre w-[60px] e w-[400px] baseado no estado
      */}
      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[60px]' : 'w-[400px]'} h-full border-r border-gray-800 z-20 shadow-2xl relative shrink-0 bg-ecos-bg`}>
        <CharacterSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* VTT Area - O Board usa flex-1, então ele se ajustará automaticamente ao novo espaço */}
      <div className="flex-1 h-full relative z-10 bg-gray-900">
        <Board />
      </div>
    </div>
  );
}

export default App;