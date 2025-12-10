import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, Image as ImageIcon, Box, Map, Plus, Trash2, X, ChevronDown, LogOut } from 'lucide-react';

export const VTTLayout = () => {
  const { 
    activeAdventure, activeScene, 
    addScene, setActiveScene, updateScene, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary,
    setActiveAdventureId // Necessário para sair
  } = useGame();

  const [uiState, setUiState] = useState({
      menuOpen: false,    
      libraryOpen: false, 
      mapConfigOpen: false 
  });

  // Função auxiliar para fechar outros menus ao abrir um
  const toggle = (key) => {
    setUiState(prev => ({
        menuOpen: key === 'menuOpen' ? !prev.menuOpen : false,
        libraryOpen: key === 'libraryOpen' ? !prev.libraryOpen : false,
        mapConfigOpen: key === 'mapConfigOpen' ? !prev.mapConfigOpen : false,
    }));
  };

  // --- MODAL: CONFIGURAÇÃO DE MAPA ---
  const MapConfigModal = () => {
      if (!uiState.mapConfigOpen) return null;
      return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-ecos-bg border border-glass-border p-4 rounded-xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 pointer-events-auto">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-rajdhani font-bold text-white">Configurar Mapa</h3>
                  <button onClick={() => toggle('mapConfigOpen')}><X size={16} className="text-text-muted hover:text-white"/></button>
              </div>
              
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-text-muted mb-1 block">Imagem de Fundo</label>
                      <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-glass-border rounded hover:bg-white/5 cursor-pointer text-sm text-neon-blue transition">
                          <ImageIcon size={16}/> {activeScene?.mapImage ? "Trocar Imagem" : "Upload Imagem"}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              const f = e.target.files[0];
                              if(f){ 
                                  const r = new FileReader(); 
                                  r.onloadend = () => updateScene(activeScene.id, { mapImage: r.result }); 
                                  r.readAsDataURL(f); 
                              }
                          }}/>
                      </label>
                  </div>

                  {activeScene?.mapImage && (
                      <div>
                          <div className="flex justify-between text-xs text-text-muted mb-1">
                              <span>Escala (Zoom do Mapa)</span>
                              <span>{activeScene.mapScale || 1}x</span>
                          </div>
                          <input 
                            type="range" min="0.1" max="5" step="0.1" 
                            className="w-full accent-neon-green h-2 bg-glass rounded-lg appearance-none cursor-pointer"
                            value={activeScene.mapScale || 1}
                            onChange={(e) => updateScene(activeScene.id, { mapScale: parseFloat(e.target.value) })}
                          />
                      </div>
                  )}
              </div>
          </div>
      );
  };

  // --- DOCK: BIBLIOTECA DE TOKENS (Centralizado) ---
  const AssetDock = () => {
      if (!uiState.libraryOpen) return null;
      return (
          // Alterado para ficar centralizado (left-1/2 -translate-x-1/2) e pointer-events-auto
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[400px] bg-black/90 border border-glass-border rounded-xl flex flex-col max-h-[60vh] z-40 animate-in fade-in slide-in-from-top-2 backdrop-blur-md pointer-events-auto shadow-2xl shadow-black/50">
              <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl">
                  <h3 className="font-bold text-white flex gap-2 items-center text-sm">
                    <Box size={16} className="text-neon-blue"/> Biblioteca de Tokens
                  </h3>
                  <button onClick={() => toggle('libraryOpen')}><X size={16} className="text-text-muted hover:text-white"/></button>
              </div>
              
              <div className="p-3 grid grid-cols-4 gap-3 overflow-y-auto scrollbar-thin flex-1 min-h-[150px]">
                  {/* Botão de Upload */}
                  <label className="aspect-square border border-dashed border-glass-border rounded hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-neon-blue transition group">
                      <Plus size={24} className="group-hover:scale-110 transition-transform"/>
                      <span className="text-[10px] mt-1">Add</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                          const f = e.target.files[0];
                          if(f){ 
                              const r = new FileReader(); 
                              r.onloadend = () => addTokenToLibrary(r.result); 
                              r.readAsDataURL(f); 
                          }
                      }}/>
                  </label>

                  {/* Lista de Tokens */}
                  {activeAdventure?.tokenLibrary.map(t => (
                      <div 
                           key={t.id} 
                           draggable 
                           onDragStart={(e) => {
                               // Importante: Define o JSON para o Board.jsx ler no onDrop
                               e.dataTransfer.setData('application/json', JSON.stringify({ type: 'library_token', imageSrc: t.imageSrc }));
                               e.dataTransfer.effectAllowed = "copy";
                           }}
                           className="aspect-square bg-black rounded border border-glass-border overflow-hidden cursor-grab active:cursor-grabbing hover:border-neon-blue relative group shadow-lg transition-all hover:scale-105"
                      >
                          <img src={t.imageSrc} className="w-full h-full object-cover pointer-events-none" alt="token"/>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeTokenFromLibrary(t.id); }} 
                            className="absolute top-0 right-0 bg-red-600 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500 text-white transition-opacity"
                          >
                              <Trash2 size={10}/>
                          </button>
                      </div>
                  ))}
              </div>
              <div className="p-2 text-[10px] text-center text-text-muted bg-black/50 rounded-b-xl border-t border-glass-border">
                  Arraste os tokens para o mapa
              </div>
          </div>
      );
  };

  // --- MENU DE CENAS ---
  const SceneSelector = () => {
      if (!uiState.menuOpen) return null;
      return (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-64 bg-ecos-bg border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 pointer-events-auto">
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                  {activeAdventure?.scenes.map(s => (
                      <div key={s.id} onClick={() => { setActiveScene(s.id); toggle('menuOpen'); }}
                           className={`p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 border-l-2 ${activeScene?.id === s.id ? 'border-neon-green bg-white/5' : 'border-transparent'}`}>
                          <span className={`text-sm font-bold ${activeScene?.id === s.id ? 'text-white' : 'text-text-muted'}`}>{s.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir cena?')) deleteScene(s.id); }} className="text-text-muted hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                  ))}
              </div>
              <button onClick={() => { const n = prompt("Nome da nova cena:"); if(n) addScene(n); }} 
                      className="w-full p-3 bg-black/40 hover:bg-neon-green/20 text-neon-green text-xs font-bold flex items-center justify-center gap-2 border-t border-glass-border transition">
                  <Plus size={14}/> NOVA CENA
              </button>
          </div>
      );
  };

  // --- HUD PRINCIPAL ---
  // A div pai tem pointer-events-none para deixar o mouse passar para o Board
  return (
      <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
          
          {/* Top Bar (Pointer events auto para clicar nos botões) */}
          <div className="absolute top-4 flex items-center gap-2 bg-black/80 p-1.5 rounded-lg border border-glass-border shadow-lg backdrop-blur-sm pointer-events-auto">
              
              {/* Scene Dropdown */}
              <button onClick={() => toggle('menuOpen')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-white transition border border-transparent hover:border-glass-border">
                  <Map size={16} className="text-neon-green"/>
                  <span className="font-rajdhani font-bold uppercase text-sm max-w-[150px] truncate">{activeScene?.name || "Sem Cena"}</span>
                  <ChevronDown size={14} className="text-text-muted"/>
              </button>

              <div className="w-px h-6 bg-glass-border mx-1"></div>

              {/* Map Config Button */}
              <button 
                onClick={() => toggle('mapConfigOpen')} 
                title="Configurar Mapa (Imagem/Grid)" 
                className={`p-2 rounded hover:bg-white/10 transition ${uiState.mapConfigOpen ? 'text-neon-blue bg-white/10' : 'text-text-muted hover:text-white'}`}
              >
                  <Settings size={18}/>
              </button>

              {/* Assets Button */}
              <button 
                onClick={() => toggle('libraryOpen')} 
                title="Biblioteca de Tokens" 
                className={`p-2 rounded hover:bg-white/10 transition ${uiState.libraryOpen ? 'text-neon-blue bg-white/10' : 'text-text-muted hover:text-white'}`}
              >
                  <Box size={18}/>
              </button>

              <div className="w-px h-6 bg-glass-border mx-1"></div>

              {/* Exit Button */}
              <button 
                onClick={() => {
                    if(confirm("Sair da aventura atual?")) setActiveAdventureId(null);
                }} 
                title="Sair da Aventura" 
                className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500 transition"
              >
                  <LogOut size={18}/>
              </button>
          </div>

          {/* Overlays (Renderizados condicionalmente) */}
          <MapConfigModal />
          <AssetDock />
          <SceneSelector />
      </div>
  );
};