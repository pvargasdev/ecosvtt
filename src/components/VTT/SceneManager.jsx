import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Plus, X, Image as ImageIcon, Trash2, Map } from 'lucide-react';

const SceneManager = ({ onClose }) => {
  const { activeAdventure, activeScene, addScene, setActiveScene, deleteScene } = useGame();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [newMapImage, setNewMapImage] = useState(null);

  if (!activeAdventure) return null;

  const handleCreate = () => {
    if (!newSceneName) return; 
    addScene(newSceneName, newMapImage);
    setNewSceneName("");
    setNewMapImage(null);
    setIsCreating(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewMapImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute top-24 right-4 w-80 bg-ecos-bg border border-glass-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-5 z-50 max-h-[80vh] pointer-events-auto cursor-default">
      
      <div className="p-4 border-b border-glass-border flex justify-between items-center bg-black/40">
        <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
            <Map size={18} className="text-neon-green"/> GERENCIAR CENAS
        </h3>
        <button onClick={() => onClose && onClose()} className="text-text-muted hover:text-white"><X size={18}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {activeAdventure.scenes.length === 0 && !isCreating && (
            <div className="text-center text-text-muted text-sm py-4">
                Nenhuma cena criada.
            </div>
        )}

        {activeAdventure.scenes.map(scene => (
            <div 
                key={scene.id} 
                onClick={() => setActiveScene(scene.id)}
                className={`
                    relative group border rounded-lg p-2 cursor-pointer transition-all flex gap-3 items-center
                    ${activeScene?.id === scene.id ? 'bg-neon-green/10 border-neon-green' : 'bg-glass border-glass-border hover:bg-white/5'}
                `}
            >
                <div className="w-12 h-12 bg-black rounded border border-glass-border shrink-0 overflow-hidden flex items-center justify-center">
                    {scene.mapImage ? (
                        <img src={scene.mapImage} className="w-full h-full object-cover" alt="Map" />
                    ) : (
                        <ImageIcon size={16} className="text-text-muted opacity-50"/>
                    )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <div className={`font-bold text-sm truncate ${activeScene?.id === scene.id ? 'text-neon-green' : 'text-white'}`}>
                        {scene.name}
                    </div>
                    <div className="text-[10px] text-text-muted">{scene.tokens?.length || 0} Tokens</div>
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                    className="p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        ))}
      </div>

      <div className="p-4 border-t border-glass-border bg-black/20">
        {!isCreating ? (
            <button 
                onClick={() => setIsCreating(true)}
                className="w-full py-2 bg-neon-green/10 border border-neon-green/50 text-neon-green rounded font-bold hover:bg-neon-green hover:text-black transition flex items-center justify-center gap-2 text-sm"
            >
                <Plus size={16} /> NOVA CENA
            </button>
        ) : (
            <div className="space-y-3 animate-in fade-in">
                <input 
                    autoFocus
                    placeholder="Nome da Cena..."
                    className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm focus:border-neon-green outline-none"
                    value={newSceneName}
                    onChange={e => setNewSceneName(e.target.value)}
                />
                
                <label className="flex items-center gap-2 w-full p-2 border border-dashed border-glass-border rounded cursor-pointer hover:bg-white/5 text-xs text-text-muted justify-center">
                    <ImageIcon size={14} />
                    {newMapImage ? "Imagem Selecionada" : "Upload Mapa (Img)"}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>

                <div className="flex gap-2">
                    <button onClick={() => setIsCreating(false)} className="flex-1 py-1.5 bg-glass rounded text-xs text-text-muted hover:text-white">Cancelar</button>
                    <button onClick={handleCreate} className="flex-1 py-1.5 bg-neon-green text-black font-bold rounded text-xs hover:bg-white">CRIAR</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SceneManager;