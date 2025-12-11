import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, Image as ImageIcon, Box, ArrowLeft, Map, Plus, Trash2, X, ChevronDown, LogOut, Edit2, RotateCcw, Check, Search, Square, MousePointer, AlertTriangle } from 'lucide-react';
import { imageDB } from '../../context/db';

// --- COMPONENTES AUXILIARES ---

const LibraryThumb = React.memo(({ token }) => {
    const [src, setSrc] = useState(null);
    
    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        if(token.imageId) {
            imageDB.getImage(token.imageId).then(blob => { 
                if(blob && isMounted) {
                    objectUrl = URL.createObjectURL(blob);
                    setSrc(objectUrl); 
                }
            });
        } else if (token.imageSrc) { 
            setSrc(token.imageSrc); 
        }

        return () => { 
            isMounted = false; 
            if(objectUrl) URL.revokeObjectURL(objectUrl); 
        }
    }, [token.imageId, token.imageSrc]);

    return (
        <div draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify({ type: 'library_token', imageId: token.imageId, imageSrc: token.imageSrc })); }}
             className="aspect-square bg-black rounded-full border-2 border-glass-border overflow-hidden cursor-grab active:cursor-grabbing hover:border-white transition-all group-hover:scale-110 relative group">
            {src && <img src={src} className="w-full h-full object-cover pointer-events-none" alt="token"/>}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.token.id === nextProps.token.id &&
           prevProps.token.imageId === nextProps.token.imageId &&
           prevProps.token.imageSrc === nextProps.token.imageSrc;
});

const InternalAlert = ({ message, clearAlert }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                clearAlert();
            }, 5000); 
            return () => clearTimeout(timer);
        }
    }, [message, clearAlert]);

    if (!message) return null;

    return (
        <div 
            className="absolute top-4 left-1/2 transform -translate-x-1/2 p-3 bg-red-900/90 border border-red-700 rounded-lg shadow-xl backdrop-blur-sm z-[100] pointer-events-auto flex items-center gap-3 text-sm text-white"
            style={{ animation: 'fadeInDown 0.3s ease-out forwards' }}
        >
            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
            <AlertTriangle size={18} className="text-yellow-400 shrink-0"/>
            <span className='font-semibold'>{message}</span>
            <button onClick={clearAlert} className="text-red-300 hover:text-white shrink-0"><X size={16}/></button>
        </div>
    );
};

export const VTTLayout = ({ zoomValue, onZoomChange, activeTool, setActiveTool }) => {
  const { 
    activeAdventure, activeScene, 
    addScene, setActiveScene, updateScene, updateSceneMap, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary, setActiveAdventureId 
  } = useGame();

  const [uiState, setUiState] = useState({ menuOpen: false, libraryOpen: false, mapConfigOpen: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [alertMessage, setAlertMessage] = useState(null); 
  const clearAlert = useCallback(() => setAlertMessage(null), []);

  const mapInputRef = useRef(null);
  const tokenInputRef = useRef(null);
  
  const headerRef = useRef(null);      
  const mapConfigRef = useRef(null);   
  const libraryRef = useRef(null);     
  const sceneRef = useRef(null);       

  // Helper para fechar todos os menus
  const closeAllMenus = useCallback(() => {
      setUiState(prev => {
          if (prev.menuOpen || prev.libraryOpen || prev.mapConfigOpen) {
              return { menuOpen: false, libraryOpen: false, mapConfigOpen: false };
          }
          return prev;
      });
  }, []);

  const handleMultiTokenUpload = async (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          addTokenToLibrary(file);
      }
      
      event.target.value = ''; 
  };
  
  // ==========================================
  // CLICK OUTSIDE & INTERACTION LOGIC
  // ==========================================
  useEffect(() => {
      const handleOutsideInteraction = (event) => {
          if (headerRef.current && headerRef.current.contains(event.target)) {
              return;
          }

          let shouldClose = false;

          if (uiState.menuOpen && sceneRef.current && !sceneRef.current.contains(event.target)) {
              shouldClose = true;
          }
          if (uiState.libraryOpen && libraryRef.current && !libraryRef.current.contains(event.target)) {
              shouldClose = true;
          }
          if (uiState.mapConfigOpen && mapConfigRef.current && !mapConfigRef.current.contains(event.target)) {
              shouldClose = true;
          }

          if (shouldClose || (!uiState.menuOpen && !uiState.libraryOpen && !uiState.mapConfigOpen)) {
               if (uiState.menuOpen || uiState.libraryOpen || uiState.mapConfigOpen) {
                   closeAllMenus();
               }
          }
      };
      
      const handleKeyDown = (e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              closeAllMenus();
          }
      };

      document.addEventListener("mousedown", handleOutsideInteraction, { capture: true });
      document.addEventListener("wheel", handleOutsideInteraction, { capture: true });
      window.addEventListener("keydown", handleKeyDown);
      
      return () => {
          document.removeEventListener("mousedown", handleOutsideInteraction, { capture: true });
          document.removeEventListener("wheel", handleOutsideInteraction, { capture: true });
          window.removeEventListener("keydown", handleKeyDown);
      };
  }, [uiState, closeAllMenus]);


  const toggle = (key, e) => {
    if (e) e.stopPropagation();
    setUiState(prev => ({
        menuOpen: key === 'menuOpen' ? !prev.menuOpen : false,
        libraryOpen: key === 'libraryOpen' ? !prev.libraryOpen : false,
        mapConfigOpen: key === 'mapConfigOpen' ? !prev.mapConfigOpen : false,
    }));
  };

  const WindowWrapper = ({ children, className, containerRef }) => (
      <div 
        ref={containerRef}
        className={`pointer-events-auto ${className}`} 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()} 
      >
        {children}
      </div>
  );

  const MapConfigModal = () => {
      const [localScale, setLocalScale] = useState(100);

      useEffect(() => {
          if (activeScene?.mapScale) {
              setLocalScale(Math.round(activeScene.mapScale * 100));
          }
      }, [activeScene?.id, uiState.mapConfigOpen]);

      const handleApplyScale = () => {
          let val = parseInt(localScale);
          if (isNaN(val) || val < 10) val = 10; 
          if (val > 1000) val = 1000; 
          updateScene(activeScene.id, { mapScale: val / 100 });
          setLocalScale(val); 
      };

      if (!uiState.mapConfigOpen) return null;

      return (
          <WindowWrapper containerRef={mapConfigRef} className="absolute top-24 right-4 bg-black/85 border border-glass-border backdrop-blur-sm p-4 rounded-xl shadow-2xl z-50 w-72 scale-90 origin-top-right">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-rajdhani font-bold text-white">Configurar Fundo</h3>
                  <button onClick={(e) => toggle('mapConfigOpen', e)}><X size={16} className="text-text-muted hover:text-white"/></button>
              </div>
              <div className="space-y-4">
                  <div onClick={() => mapInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 border border-dashed border-glass-border rounded hover:bg-white/5 cursor-pointer text-sm text-neon-blue transition">
                      <ImageIcon size={16}/> {activeScene?.mapImageId ? "Trocar Imagem" : "Upload Imagem"}
                  </div>
                  <input ref={mapInputRef} type="file" className="hidden" accept="image/*" 
                      onChange={(e) => {
                          const f = e.target.files[0];
                          if(f) updateSceneMap(activeScene.id, f);
                          e.target.value = '';
                      }}
                  />
                  {(activeScene?.mapImageId || activeScene?.mapImage) && (
                      <div className="bg-black/20 p-3 rounded border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs text-text-muted uppercase font-bold">Escala (%)</label>
                              <button onClick={() => { setLocalScale(100); updateScene(activeScene.id, { mapScale: 1 }); }} title="Resetar para 100%" className="text-[10px] flex items-center gap-1 text-neon-blue hover:text-white transition">
                                <RotateCcw size={10} /> Resetar
                              </button>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                  <input type="number" className="w-full bg-black/50 border border-glass-border rounded-l p-2 text-white text-sm focus:border-neon-green outline-none pr-8 font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={localScale} onChange={(e) => setLocalScale(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleApplyScale(); }} placeholder="100"/>
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold pointer-events-none">%</span>
                              </div>
                              <button onClick={handleApplyScale} className="bg-neon-green text-black p-2 rounded-r font-bold hover:bg-white transition flex items-center justify-center"><Check size={16} /></button>
                          </div>
                      </div>
                  )}
              </div>
          </WindowWrapper>
      );
  };

  const AssetDock = () => {
      if (!uiState.libraryOpen) return null;
      return (
          <WindowWrapper containerRef={libraryRef} className="absolute top-24 right-4 w-[288px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col max-h-[60vh] z-40 shadow-2xl scale-90 origin-top-right">
              <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl">
                  <h3 className="font-rajdhani font-bold text-white">Biblioteca de Tokens</h3>
                  <button onClick={(e) => toggle('libraryOpen', e)}><X size={16} className="text-text-muted hover:text-white"/></button>
              </div>
              <div className="p-3 grid grid-cols-4 gap-3 overflow-y-auto scrollbar-thin flex-1 min-h-[150px]">
                  <div onClick={() => tokenInputRef.current?.click()} className="aspect-square border border-dashed border-glass-border rounded-full hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-neon-blue transition">
                      <Plus size={24}/>
                  </div>
                  <input 
                      ref={tokenInputRef} 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleMultiTokenUpload}
                  />
                  {activeAdventure?.tokenLibrary?.map(t => (
                      <div key={t.id} className="relative group">
                          <LibraryThumb token={t} />
                          <button onClick={(e) => { e.stopPropagation(); removeTokenFromLibrary(t.id); }} className="absolute top-0 right-0 bg-red-600 p-1 opacity-0 group-hover:opacity-100 text-white z-10"><Trash2 size={10}/></button>
                      </div>
                  ))}
              </div>
          </WindowWrapper>
      );
  };

  // --- SELETOR DE CENAS POLIDO E INLINE ---
  const SceneSelector = () => {
      if (!uiState.menuOpen) return null;

      const scenesListRef = useRef(null);
      const prevScenesLength = useRef(activeAdventure?.scenes.length || 0);

      // Estados locais para edição inline
      const [isCreating, setIsCreating] = useState(false);
      const [newSceneName, setNewSceneName] = useState("");
      
      const [renamingId, setRenamingId] = useState(null);
      const [renameValue, setRenameValue] = useState("");
      
      const [deletingId, setDeletingId] = useState(null);
      
      // VERIFICA SE É A ÚLTIMA CENA
      const isLastScene = activeAdventure?.scenes.length <= 1;

      // Scroll inteligente
      useEffect(() => {
        if (activeAdventure?.scenes.length > prevScenesLength.current) {
            if (scenesListRef.current) {
                scenesListRef.current.scrollTop = scenesListRef.current.scrollHeight;
            }
        }
        prevScenesLength.current = activeAdventure?.scenes.length || 0;
      }, [activeAdventure?.scenes.length]);

      const handleCreate = () => {
          const name = newSceneName.trim() || "Nova Cena";
          addScene(name);
          setNewSceneName("");
          setIsCreating(false);
      };

      const handleRename = (id) => {
          if (!renameValue.trim()) return setRenamingId(null);
          updateScene(id, { name: renameValue });
          setRenamingId(null);
      };

      return (
          <WindowWrapper containerRef={sceneRef} className="absolute top-24 right-4 w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 overflow-hidden scale-90 origin-top-right flex flex-col max-h-[60vh]">
              <div className="p-3 border-b border-glass-border bg-white/5">
                  <h3 className="font-rajdhani font-bold text-white text-sm">Cenas da Aventura</h3>
              </div>

              <div ref={scenesListRef} className="overflow-y-auto scrollbar-thin flex-1 relative min-h-[60px] space-y-1 p-2">
                  
                  {activeAdventure?.scenes.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-text-muted italic text-xs opacity-50">Nenhuma cena.</p>
                      </div>
                  )}

                  {activeAdventure?.scenes.map(s => {
                      // 1. MODO DELETAR
                      if (deletingId === s.id) {
                          return (
                              <div key={s.id} className="p-3 rounded bg-red-900/30 border border-red-500/50 flex justify-between items-center animate-in fade-in duration-200">
                                  <span className="text-white text-xs font-bold pl-1">Excluir cena?</span>
                                  <div className="flex gap-1 shrink-0">
                                      <button onClick={(e)=>{e.stopPropagation(); setDeletingId(null);}} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition"><ArrowLeft size={14}/></button>
                                      <button onClick={(e)=>{e.stopPropagation(); deleteScene(s.id); setDeletingId(null);}} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white transition"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          );
                      }

                      // 2. MODO RENOMEAR
                      if (renamingId === s.id) {
                          return (
                              <div key={s.id} className="p-3 rounded bg-white/10 border border-white/30 flex items-center gap-1 animate-in fade-in duration-200">
                                  <input 
                                      autoFocus
                                      onFocus={(e) => e.target.select()}
                                      className="flex-1 bg-black/50 border border-glass-border rounded px-2 text-white text-sm outline-none focus:border-white min-w-0"
                                      value={renameValue}
                                      onChange={e => setRenameValue(e.target.value)}
                                      onKeyDown={e => {
                                          if (e.key === 'Enter') handleRename(s.id);
                                          if (e.key === 'Escape') setRenamingId(null);
                                      }}
                                  />
                                  <div className="flex gap-1 shrink-0">
                                      <button onClick={() => setRenamingId(null)} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition"><ArrowLeft size={14}/></button>
                                      <button onClick={() => handleRename(s.id)} className="p-1 rounded bg-neon-green hover:bg-white text-black transition"><Check size={14}/></button>
                                  </div>
                              </div>
                          );
                      }

                      // 3. MODO VISUALIZAÇÃO
                      return (
                          <div key={s.id} onClick={(e) => { e.stopPropagation(); setActiveScene(s.id); /* Menu não fecha */ }}
                               className={`p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 border-l-2 group transition-colors rounded ${activeScene?.id === s.id ? 'border-neon-green bg-white/5' : 'border-transparent'}`}>
                              <span className={`text-sm font-bold truncate max-w-[150px] ${activeScene?.id === s.id ? 'text-neon-green' : 'text-white'}`}>{s.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.name); setDeletingId(null); }} className="text-text-muted hover:text-yellow-400 p-1 transition"><Edit2 size={14}/></button>
                                  
                                  {/* Botão de Excluir com Proteção de Última Cena */}
                                  <button 
                                      disabled={isLastScene}
                                      onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); setRenamingId(null); }} 
                                      className={`p-1 transition ${isLastScene ? 'text-text-muted opacity-30 cursor-not-allowed' : 'text-text-muted hover:text-red-500'}`}
                                  >
                                      <Trash2 size={14}/>
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>

              {/* ÁREA DE CRIAÇÃO (Footer) */}
              <div className="p-3 border-t border-glass-border bg-black/40">
                  {!isCreating ? (
                      <button 
                          onClick={(e) => { e.stopPropagation(); setIsCreating(true); }}
                          className="w-full py-2 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded text-xs font-bold hover:bg-neon-green hover:text-black hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] transition flex items-center justify-center gap-2"
                      >
                          <Plus size={14} strokeWidth={3}/> NOVA CENA
                      </button>
                  ) : (
                      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <input 
                              autoFocus
                              placeholder="Nome da Cena..."
                              className="w-full bg-[#15151a] border border-neon-green text-white placeholder-white/20 rounded p-2 text-sm outline-none focus:shadow-[0_0_10px_rgba(0,255,0,0.2)] transition-all"
                              value={newSceneName}
                              onChange={e => setNewSceneName(e.target.value)}
                              onKeyDown={e => {
                                  if (e.key === 'Enter') handleCreate();
                                  if (e.key === 'Escape') setIsCreating(false);
                              }}
                          />
                          <div className="flex gap-2">
                              <button onClick={() => setIsCreating(false)} className="flex-1 py-1.5 text-xs text-text-muted hover:text-white transition">Cancelar</button>
                              <button onClick={handleCreate} className="flex-1 py-1.5 bg-neon-green text-black font-bold rounded text-xs hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-900/20">CRIAR</button>
                          </div>
                      </div>
                  )}
              </div>
          </WindowWrapper>
      );
  };
  
  const ConfirmationModal = () => { 
      if (!confirmModal.open) return null; 
      return ( 
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onMouseDown={e=>e.stopPropagation()}>
              <div className="bg-ecos-bg border border-glass-border p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-2">Confirmação</h3>
                  <p className="text-text-muted mb-6">{confirmModal.message}</p>
                  <div className="flex gap-3">
                      <button onClick={()=>setConfirmModal({open:false,message:'',onConfirm:null})} className="flex-1 py-2 bg-glass rounded text-white hover:bg-white/10">Cancelar</button>
                      <button onClick={()=>{confirmModal.onConfirm();setConfirmModal({open:false,message:'',onConfirm:null})}} className="flex-1 py-2 bg-red-600 rounded text-white font-bold hover:bg-red-500">Confirmar</button>
                  </div>
              </div>
          </div> 
      ); 
  };

  return (
      <div className="absolute inset-0 pointer-events-none z-50">
          
          <InternalAlert message={alertMessage} clearAlert={clearAlert} />

          <div 
             ref={headerRef}
             className="absolute top-4 right-4 flex flex-col bg-black/80 rounded-lg border border-glass-border shadow-lg backdrop-blur-sm pointer-events-auto z-40 w-max overflow-hidden scale-90 origin-top-right"
             onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
          >
              
              {/* SLIDER DE ZOOM */}
              {onZoomChange && (
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 justify-left bg-black/20">
                    <Search size={15} className="text-text-muted"/>
                    <input 
                        type="range" 
                        min="30" 
                        max="300" 
                        value={zoomValue || 100} 
                        onChange={onZoomChange}
                        onMouseDown={closeAllMenus}
                        className="
                            flex-1 min-w-[150px] h-2 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:w-3 
                            [&::-webkit-slider-thumb]:h-3 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-white 
                            [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]
                            [&::-moz-range-thumb]:w-3 
                            [&::-moz-range-thumb]:h-3 
                            [&::-moz-range-thumb]:rounded-full 
                            [&::-moz-range-thumb]:bg-white
                            [&::-moz-range-thumb]:border-none
                        "
                    />
                </div>
              )}

              <div className="flex items-center gap-2 p-1.5">
                
                <button 
                  onClick={() => { setActiveTool('select'); closeAllMenus(); }}
                  className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'select' ? 'bg-white/20 text-neon-green' : 'text-text-muted'}`}
                  title="Modo Seleção"
                >
                  <MousePointer size={18}/>
                </button>
                
                <button 
                  onClick={() => { setActiveTool('fogOfWar'); closeAllMenus(); }}
                  className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'fogOfWar' ? 'bg-white/20 text-neon-purple' : 'text-text-muted'}`}
                  title="Fog of War"
                >
                  <Square size={18}/>
                </button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => toggle('menuOpen', e)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-white transition border border-transparent hover:border-glass-border">
                    <Map size={16} className="text-neon-green"/>
                    {/* TRUNCAMENTO DE TEXTO (10 CHARS) */}
                    <span className="font-rajdhani font-bold uppercase text-sm">
                        {activeScene?.name ? (activeScene.name.length > 10 ? activeScene.name.substring(0, 10) + '...' : activeScene.name) : "Sem Cena"}
                    </span>
                    <ChevronDown size={14} className="text-text-muted"/>
                </button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => toggle('mapConfigOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.mapConfigOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Configurar Fundo"><ImageIcon size={18}/></button>
                <button onClick={(e) => toggle('libraryOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.libraryOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Biblioteca"><Box size={18}/></button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => { 
                    e.stopPropagation(); 
                    closeAllMenus();
                    setConfirmModal({ open: true, message: "Sair da aventura?", onConfirm: () => setActiveAdventureId(null) }); 
                }} className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title="Sair"><LogOut size={18}/></button>
              </div>
          </div>

          <MapConfigModal />
          <AssetDock />
          <SceneSelector />
          <ConfirmationModal />
      </div>
  );
};