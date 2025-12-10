import React from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';
// Não importe SceneManager aqui. Não use useGame aqui para ler cenas.

function App() {
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter">
      
      {/* Sidebar (Personagens) */}
      <div className="w-[400px] h-full border-r border-gray-800 z-20 shadow-2xl relative shrink-0 bg-ecos-bg">
        <CharacterSidebar />
      </div>

      {/* VTT Area - O Board cuida de tudo agora */}
      <div className="flex-1 h-full relative z-10 bg-gray-900">
        <Board />
      </div>
    </div>
  );
}

export default App;