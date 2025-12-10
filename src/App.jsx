import React, { useState } from 'react';
import CharacterSidebar from './components/Character/CharacterSidebar';
import Board from './components/VTT/Board';
import SceneManager from './components/VTT/SceneManager'; // Importe o novo arquivo
import { useGame } from './context/GameContext';
import { Save, Map as MapIcon } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function App() {
  const { gameState } = useGame();
  const [showSceneManager, setShowSceneManager] = useState(false);

  // Função Exportar Jogo Completo (Módulo 5 - Implementação simples aqui)
  const handleExportGame = async () => {
    const zip = new JSZip();
    zip.file("gamestate.json", JSON.stringify(gameState, null, 2));
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `ecos_save_full.zip`);
  };

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-inter">
      
      {/* Sidebar (Personagens) */}
      <div className="w-[400px] h-full border-r border-gray-800 z-20 shadow-2xl relative shrink-0 bg-ecos-bg">
        <CharacterSidebar />
      </div>

      {/* VTT Area */}
      <div className="flex-1 h-full relative z-10 bg-gray-900">
        
        <Board />

        {/* --- UI FLUTUANTE (TOP RIGHT) --- */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto z-40">
          
          {/* Botão de Cenas (Toggle SceneManager) */}
          <button 
            onClick={() => setShowSceneManager(!showSceneManager)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-lg backdrop-blur transition-all ${
                showSceneManager 
                ? 'bg-neon-green text-black border-neon-green' 
                : 'bg-gray-800/90 text-white border-gray-600 hover:border-neon-green'
            }`}
          >
             <MapIcon size={18} className={showSceneManager ? "text-black" : "text-neon-green"} />
             <span className="font-rajdhani font-semibold uppercase text-sm">
                {gameState.activeSceneId 
                    ? gameState.scenes.find(s => s.id === gameState.activeSceneId)?.name 
                    : "Criar Cena"}
             </span>
          </button>

          {/* Exportar Jogo */}
          <button onClick={handleExportGame} className="p-2 bg-gray-800/90 hover:bg-gray-700 text-neon-blue border border-gray-600 rounded-lg">
             <Save size={20} />
          </button>
        </div>

        {/* Renderiza o Gerenciador se estiver aberto */}
        {showSceneManager && (
            <SceneManager onClose={() => setShowSceneManager(false)} />
        )}

      </div>
    </div>
  );
}

export default App;