import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, Image as ImageIcon, Box, Map, Plus, Trash2, X, ChevronDown, LogOut, Edit2, RotateCcw, Check, Search } from 'lucide-react';
import { imageDB } from '../../context/db';

const LibraryThumb = ({ token }) => {
    const [src, setSrc] = useState(null);
    useEffect(() => {
        let isMounted = true;
        if(token.imageId) {
            imageDB.getImage(token.imageId).then(blob => { 
                if(blob && isMounted) setSrc(URL.createObjectURL(blob)); 
            });
        } else if (token.imageSrc) { setSrc(token.imageSrc); }
        return () => { isMounted = false; if(src && !src.startsWith('data:')) URL.revokeObjectURL(src); }
    }, [token]);

    return (
        <div draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify({ type: 'library_token', imageId: token.imageId, imageSrc: token.imageSrc })); }}
             className="aspect-square bg-black rounded border border-glass-border overflow-hidden cursor-grab active:cursor-grabbing hover:border-neon-blue relative group">
            {src && <img src={src} className="w-full h-full object-cover pointer-events-none" alt="token"/>}
        </div>
    );
};

export const VTTLayout = ({ zoomValue, onZoomChange }) => {
  const { 
    activeAdventure, activeScene, 
    addScene, setActiveScene, updateScene, updateSceneMap, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary, setActiveAdventureId 
  } = useGame();

  const [uiState, setUiState] = useState({ menuOpen: false, libraryOpen: false, mapConfigOpen: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [inputModal, setInputModal] = useState({ open: false, title: '', value: '', onConfirm: null });

  const mapInputRef = useRef(null);
  const tokenInputRef = useRef(null);

  const toggle = (key, e) => {
    if (e) e.stopPropagation();
    setUiState(prev => ({
        menuOpen: key === 'menuOpen' ? !prev.menuOpen : false,
        libraryOpen: key === 'libraryOpen' ? !prev.libraryOpen : false,
        mapConfigOpen: key === 'mapConfigOpen' ? !prev.mapConfigOpen : false,
    }));
  };

  const WindowWrapper = ({ children, className }) => (
      <div 
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

      // POSIÇÃO: Right-4 (Ajustado para ficar abaixo da caixa expandida)
      return (
          <WindowWrapper className="absolute top-28 right-4 bg-ecos-bg border border-glass-border p-4 rounded-xl shadow-2xl z-50 w-72 animate-in fade-in slide-in-from-top-2 origin-top-right">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-rajdhani font-bold text-white">Configurar Mapa</h3>
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
      // POSIÇÃO: Right-4 (Ajustado)
      return (
          <WindowWrapper className="absolute top-28 right-4 w-[400px] bg-black/90 border border-glass-border rounded-xl flex flex-col max-h-[60vh] z-40 animate-in fade-in slide-in-from-top-2 shadow-2xl origin-top-right">
              <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl">
                  <h3 className="font-bold text-white flex gap-2 items-center text-sm"><Box size={16} className="text-neon-blue"/> Biblioteca</h3>
                  <button onClick={(e) => toggle('libraryOpen', e)}><X size={16} className="text-text-muted hover:text-white"/></button>
              </div>
              <div className="p-3 grid grid-cols-4 gap-3 overflow-y-auto scrollbar-thin flex-1 min-h-[150px]">
                  <div onClick={() => tokenInputRef.current?.click()} className="aspect-square border border-dashed border-glass-border rounded hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-neon-blue transition">
                      <Plus size={24}/><span className="text-[10px] mt-1">Add</span>
                  </div>
                  <input ref={tokenInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f) addTokenToLibrary(f); e.target.value = ''; }} />
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

  const SceneSelector = () => {
      if (!uiState.menuOpen) return null;
      // POSIÇÃO: Right-4 (Ajustado)
      return (
          <WindowWrapper className="absolute top-28 right-4 w-72 bg-ecos-bg border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                  {activeAdventure?.scenes.map(s => (
                      <div key={s.id} onClick={(e) => { e.stopPropagation(); setActiveScene(s.id); toggle('menuOpen', e); }}
                           className={`p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 border-l-2 group ${activeScene?.id === s.id ? 'border-neon-green bg-white/5' : 'border-transparent'}`}>
                          <span className="text-sm font-bold text-white truncate max-w-[150px]">{s.name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setInputModal({ open: true, title: "Renomear Cena", value: s.name, onConfirm: (val) => updateScene(s.id, { name: val }) }); }} className="text-text-muted hover:text-white p-1"><Edit2 size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ open: true, message: `Excluir "${s.name}"?`, onConfirm: () => deleteScene(s.id) }); }} className="text-text-muted hover:text-red-500 p-1"><Trash2 size={14}/></button>
                          </div>
                      </div>
                  ))}
              </div>
              <button onClick={(e) => { e.stopPropagation(); setInputModal({ open: true, title: "Nome da Cena", value: "", onConfirm: (name) => addScene(name) }); }} 
                      className="w-full p-3 bg-black/40 hover:bg-neon-green/20 text-neon-green text-xs font-bold flex items-center justify-center gap-2 border-t border-glass-border"><Plus size={14}/> NOVA CENA</button>
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

  const InputModal = () => { 
      if (!inputModal.open) return null; 
      return ( 
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onMouseDown={e=>e.stopPropagation()}>
              <div className="bg-ecos-bg border border-glass-border p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-4">{inputModal.title}</h3>
                  <input autoFocus className="w-full bg-black/50 border border-glass-border rounded p-3 text-white mb-6 outline-none focus:border-neon-green" value={inputModal.value} onChange={(e)=>setInputModal(prev=>({...prev,value:e.target.value}))} onKeyDown={(e)=>{if(e.key==='Enter'&&inputModal.value){inputModal.onConfirm(inputModal.value);setInputModal({open:false,title:'',value:'',onConfirm:null});}}} />
                  <div className="flex gap-3">
                      <button onClick={()=>setInputModal({open:false,title:'',value:'',onConfirm:null})} className="flex-1 py-2 bg-glass rounded text-white hover:bg-white/10">Cancelar</button>
                      <button onClick={()=>{if(inputModal.value){inputModal.onConfirm(inputModal.value);setInputModal({open:false,title:'',value:'',onConfirm:null});}}} className="flex-1 py-2 bg-neon-green rounded text-black font-bold hover:bg-white">Salvar</button>
                  </div>
              </div>
          </div> 
      ); 
  };

  return (
      <div className="absolute inset-0 pointer-events-none z-50">
          
          {/* HEADER ALINHADO À DIREITA COM SLIDER INTEGRADO */}
          {/* Mudança: Flex-col para empilhar slider e botões na mesma caixa */}
          <div className="absolute top-4 right-4 flex flex-col bg-black/80 rounded-lg border border-glass-border shadow-lg backdrop-blur-sm pointer-events-auto z-40 w-max overflow-hidden"
               onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              
              {/* SLIDER DE ZOOM (Linha superior) */}
              {onZoomChange && (
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 justify-center bg-black/20">
                    <Search size={12} className="text-text-muted"/>
                    <input 
                        type="range" 
                        min="10" 
                        max="400" 
                        value={zoomValue || 100} 
                        onChange={onZoomChange}
                        className="w-32 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-neon-green hover:accent-white transition-all"
                    />
                    <span className="text-[10px] font-mono text-neon-green w-8 text-right">{zoomValue}%</span>
                </div>
              )}

              {/* BOTÕES DE MENU (Linha inferior) */}
              <div className="flex items-center gap-2 p-1.5">
                <button onClick={(e) => toggle('menuOpen', e)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-white transition border border-transparent hover:border-glass-border">
                    <Map size={16} className="text-neon-green"/>
                    <span className="font-rajdhani font-bold uppercase text-sm max-w-[150px] truncate">{activeScene?.name || "Sem Cena"}</span>
                    <ChevronDown size={14} className="text-text-muted"/>
                </button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => toggle('mapConfigOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.mapConfigOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Configurar Mapa"><Settings size={18}/></button>
                <button onClick={(e) => toggle('libraryOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.libraryOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Biblioteca"><Box size={18}/></button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ open: true, message: "Sair da aventura?", onConfirm: () => setActiveAdventureId(null) }); }} className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title="Sair"><LogOut size={18}/></button>
              </div>
          </div>

          <MapConfigModal />
          <AssetDock />
          <SceneSelector />
          <ConfirmationModal />
          <InputModal />
      </div>
  );
};