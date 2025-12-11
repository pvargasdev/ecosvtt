import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { imageDB } from '../../context/db';
import { Plus, Trash2, AlertTriangle, Download, Upload, Copy, Edit2, X, Check, Search } from 'lucide-react';

const MIN_SCALE = 0.3;   // 30%
const MAX_SCALE = 3;    // 300%
const PAN_LIMIT = 2000; 
const CAMERA_SMOOTHING = 0.15; // Suavização unificada (Zoom e Pan)

const Board = () => {
  const { 
    activeAdventureId, activeAdventure, activeScene, 
    activeTool, setActiveTool,
    addTokenInstance, updateTokenInstance, deleteMultipleTokenInstances,
    addFogArea, updateFogArea, deleteMultipleFogAreas,
    importCharacterAsToken, 
    createAdventure, adventures, setActiveAdventureId, deleteAdventure, 
    updateAdventure, duplicateAdventure, 
    resetAllData,
    exportAdventure, importAdventure 
  } = useGame();

  const containerRef = useRef(null);
  const importInputRef = useRef(null);
  
  // Controle de Animação e Alvo
  const animationRef = useRef(null); 
  const targetViewRef = useRef({ x: 0, y: 0, scale: 1 }); // Onde a câmera quer chegar
  
  // Viewport State (Onde a câmera está renderizada)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

  // Slider State
  const [sliderValue, setSliderValue] = useState(100);
  
  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [selectedFogIds, setSelectedFogIds] = useState(new Set());
  const [interaction, setInteraction] = useState({ 
    mode: 'IDLE', 
    startX: 0, 
    startY: 0, 
    initialVal: 0, 
    activeTokenId: null,
    activeFogId: null,
    initialViewX: 0,
    initialViewY: 0,
    fogStartX: 0,
    fogStartY: 0
  });
  
  const [fogDrawing, setFogDrawing] = useState({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [mapParams, setMapParams] = useState({ url: null, id: null });

  // UI State
  const [newAdvName, setNewAdvName] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); 
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // Sincroniza o Slider com o Zoom Real
  useEffect(() => {
    const currentPercent = Math.round(view.scale * 100);
    if (Math.abs(sliderValue - currentPercent) > 1 && !animationRef.current) {
        setSliderValue(currentPercent);
    }
    // Sincroniza o targetRef se a view mudar externamente
    if (!animationRef.current) {
        targetViewRef.current = { ...view };
    }
  }, [view.scale, view.x, view.y]);

  useEffect(() => {
      if (!activeScene) return;
      if (activeScene.mapImageId !== mapParams.id) {
          if (activeScene.mapImageId) {
              imageDB.getImage(activeScene.mapImageId).then(blob => {
                  if (blob) {
                      const url = URL.createObjectURL(blob);
                      setMapParams({ url, id: activeScene.mapImageId });
                  }
              });
          } else {
              setMapParams({ url: null, id: null });
          }
      } else if (activeScene.mapImage && !activeScene.mapImageId && !mapParams.url) {
           setMapParams({ url: activeScene.mapImage, id: 'legacy' });
      }
  }, [activeScene, mapParams.id, mapParams.url]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);
        
        // Atalhos de ferramenta
        if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setActiveTool('select');
            setSelectedFogIds(new Set());
        }
        if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setActiveTool('fogOfWar');
            setSelectedIds(new Set());
        }

        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            
            // Deletar tokens selecionados
            if (selectedIds.size > 0 && activeScene) {
                deleteMultipleTokenInstances(activeScene?.id, Array.from(selectedIds));
                setSelectedIds(new Set());
            }
            
            // Deletar fog areas selecionadas
            if (selectedFogIds.size > 0 && activeScene) {
                deleteMultipleFogAreas(activeScene?.id, Array.from(selectedFogIds));
                setSelectedFogIds(new Set());
            }
        }
    };
    
    const handleKeyUp = (e) => {
        if (e.code === 'Space') setIsSpacePressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown); 
    window.addEventListener('keyup', handleKeyUp);
    
    return () => { 
        window.removeEventListener('keydown', handleKeyDown); 
        window.removeEventListener('keyup', handleKeyUp); 
    };
  }, [selectedIds, selectedFogIds, activeScene, deleteMultipleTokenInstances, deleteMultipleFogAreas, setActiveTool]);

  // ==========================================
  // UNIFIED SMOOTH CAMERA (PAN & ZOOM)
  // ==========================================

  const animateCamera = useCallback(() => {
      setView(prev => {
          const target = targetViewRef.current;
          
          const diffScale = target.scale - prev.scale;
          const diffX = target.x - prev.x;
          const diffY = target.y - prev.y;

          if (Math.abs(diffScale) < 0.001 && Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5) {
              animationRef.current = null;
              return target; 
          }

          const nextScale = prev.scale + (diffScale * CAMERA_SMOOTHING);
          const nextX = prev.x + (diffX * CAMERA_SMOOTHING);
          const nextY = prev.y + (diffY * CAMERA_SMOOTHING);

          return { scale: nextScale, x: nextX, y: nextY };
      });

      if (animationRef.current) {
          animationRef.current = requestAnimationFrame(animateCamera);
      }
  }, []);

  const startAnimation = useCallback(() => {
      if (!animationRef.current) {
          animationRef.current = requestAnimationFrame(animateCamera);
      }
  }, [animateCamera]);

  const handleSliderZoom = (e) => {
      const val = parseFloat(e.target.value);
      setSliderValue(val);
      
      const newScale = val / 100;
      const node = containerRef.current;
      if (node) {
          const rect = node.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const ratio = newScale / targetViewRef.current.scale;
          let newX = centerX - (centerX - targetViewRef.current.x) * ratio;
          let newY = centerY - (centerY - targetViewRef.current.y) * ratio;
          
          const currentLimit = PAN_LIMIT * newScale;
          newX = Math.min(Math.max(newX, -currentLimit), currentLimit);
          newY = Math.min(Math.max(newY, -currentLimit), currentLimit);

          targetViewRef.current = { scale: newScale, x: newX, y: newY };
          startAnimation();
      }
  };

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e) => {
        if (e.target.closest('.overflow-y-auto')) return;
        
        e.preventDefault(); 
        
        const zoomIntensity = 0.1;
        const scaleAmount = -Math.sign(e.deltaY) * zoomIntensity;
        
        const currentTarget = targetViewRef.current;
        const rawNewScale = currentTarget.scale * (1 + scaleAmount);
        
        const clampedScale = Math.min(Math.max(MIN_SCALE, rawNewScale), MAX_SCALE);
        
        if (Math.abs(clampedScale - currentTarget.scale) < 0.001) return;

        const rect = node.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const ratio = clampedScale / currentTarget.scale;
        
        let newX = mouseX - (mouseX - currentTarget.x) * ratio;
        let newY = mouseY - (mouseY - currentTarget.y) * ratio;

        setSliderValue(Math.round(clampedScale * 100));
        targetViewRef.current = { scale: clampedScale, x: newX, y: newY };
        startAnimation();
    };
    
    node.addEventListener('wheel', onWheel, { passive: false });
    
    return () => node.removeEventListener('wheel', onWheel);
  }, [startAnimation]);

  // ==========================================
  // MANIPULAÇÃO DO MOUSE
  // ==========================================
  const handleMouseDown = (e) => {
    if (e.target.closest('.vtt-ui-layer') || e.target.closest('.token') || e.target.closest('.fog-area')) return;
    
    // Limpa seleções baseado na ferramenta ativa
    if (activeTool === 'select' && !e.ctrlKey && !e.metaKey) {
        setSelectedIds(new Set());
        setSelectedFogIds(new Set());
    } else if (activeTool === 'fogOfWar' && !e.ctrlKey && !e.metaKey) {
        setSelectedFogIds(new Set());
        setSelectedIds(new Set());
    }

    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ 
            mode: 'PANNING', 
            startX: e.clientX, 
            startY: e.clientY,
            initialViewX: targetViewRef.current.x,
            initialViewY: targetViewRef.current.y
        });
        return;
    }

    // Modo Fog of War - Iniciar desenho
    if (activeTool === 'fogOfWar' && e.button === 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - view.x) / view.scale;
        const worldY = (e.clientY - rect.top - view.y) / view.scale;
        
        setFogDrawing({
            isDrawing: true,
            startX: worldX,
            startY: worldY,
            currentX: worldX,
            currentY: worldY
        });
        setSelectedFogIds(new Set());
        return;
    }
  };

  const handleTokenDown = (e, id) => {
    e.stopPropagation();
    if (isSpacePressed || e.button !== 0) return; 
    if (activeTool !== 'select') return;

    const isMultiSelect = e.ctrlKey || e.metaKey;

    if (isMultiSelect) {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    } else {
        if (!selectedIds.has(id)) {
            setSelectedIds(new Set([id]));
        }
    }
    
    setSelectedFogIds(new Set());
    setInteraction({ mode: 'DRAGGING', activeTokenId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleFogDown = (e, id) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    
    const isMultiSelect = e.ctrlKey || e.metaKey;
    
    if (isMultiSelect) {
        const newSelection = new Set(selectedFogIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedFogIds(newSelection);
    } else {
        if (!selectedFogIds.has(id)) {
            setSelectedFogIds(new Set([id]));
        }
    }
    
    setSelectedIds(new Set());
    setInteraction({ 
        mode: 'DRAGGING_FOG', 
        activeFogId: id, 
        startX: e.clientX, 
        startY: e.clientY 
    });
  };

  const handleTokenResizeStart = (e, id) => {
      e.stopPropagation();
      if (!activeScene || activeTool !== 'select') return;
      const token = activeScene.tokens.find(t => t.id === id);
      if (token) setInteraction({ mode: 'RESIZING', activeTokenId: id, startX: e.clientX, initialVal: token.scale || 1 });
  };

  const handleMouseMove = (e) => {
    // Desenho de Fog of War em tempo real
    if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
        const rect = containerRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - view.x) / view.scale;
        const worldY = (e.clientY - rect.top - view.y) / view.scale;
        
        setFogDrawing(prev => ({
            ...prev,
            currentX: worldX,
            currentY: worldY
        }));
        return;
    }

    // Outros modos de interação
    if (interaction.mode === 'PANNING') {
        const deltaX = e.clientX - interaction.startX;
        const deltaY = e.clientY - interaction.startY;
        
        let newX = interaction.initialViewX + deltaX;
        let newY = interaction.initialViewY + deltaY;
        
        const currentLimit = PAN_LIMIT * targetViewRef.current.scale;
        newX = Math.min(Math.max(newX, -currentLimit), currentLimit);
        newY = Math.min(Math.max(newY, -currentLimit), currentLimit);
        
        targetViewRef.current = { ...targetViewRef.current, x: newX, y: newY };
        startAnimation();

    } else if (interaction.mode === 'DRAGGING' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        selectedIds.forEach(id => {
            const t = activeScene.tokens.find(x => x.id === id);
            if (t) updateTokenInstance(activeScene.id, id, { x: t.x + dx, y: t.y + dy });
        });
        setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
        
    } else if (interaction.mode === 'DRAGGING_FOG' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        
        selectedFogIds.forEach(fogId => {
            const fog = activeScene.fogOfWar?.find(f => f.id === fogId);
            if (fog) {
                updateFogArea(activeScene.id, fogId, { x: fog.x + dx, y: fog.y + dy });
            }
        });
        setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
        
    } else if (interaction.mode === 'RESIZING' && activeScene) {
        const deltaX = (e.clientX - interaction.startX);
        const newScale = Math.max(0.5, interaction.initialVal + (deltaX / 100));
        updateTokenInstance(activeScene.id, interaction.activeTokenId, { scale: newScale });
    }
  };

  const handleMouseUp = () => {
    // Finalizar desenho de Fog of War
    if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
        const { startX, startY, currentX, currentY } = fogDrawing;
        const width = currentX - startX;
        const height = currentY - startY;
        
        // Só cria se tiver tamanho mínimo
        if (Math.abs(width) > 10 && Math.abs(height) > 10 && activeScene) {
            const fogArea = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(width),
                height: Math.abs(height),
                color: 'rgba(0, 0, 0, 0.85)',
            };
            
            addFogArea(activeScene.id, fogArea);
        }
        
        setFogDrawing({ isDrawing: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
    }
    
    setInteraction({ mode: 'IDLE', activeTokenId: null, activeFogId: null });
  };

  const handleDrop = async (e) => {
      e.preventDefault();
      try {
          const dataString = e.dataTransfer.getData('application/json');
          if (!dataString) return;
          const json = JSON.parse(dataString);
          
          const rect = containerRef.current.getBoundingClientRect();
          const wX = (e.clientX - rect.left - view.x) / view.scale;
          const wY = (e.clientY - rect.top - view.y) / view.scale;

          if (json.type === 'library_token') {
             if(activeScene) {
                 addTokenInstance(activeScene.id, {
                     x: wX - 35, y: wY - 35,
                     imageId: json.imageId,
                     imageSrc: json.imageSrc 
                 });
             }
          } else if (json.type === 'character_drag') {
              if (activeScene && json.characterId) {
                  const imageId = await importCharacterAsToken(json.characterId);
                  if (imageId) {
                      addTokenInstance(activeScene.id, { x: wX - 35, y: wY - 35, imageId: imageId });
                  } else {
                      alert("Este personagem não tem imagem para criar um token.");
                  }
              }
          }
      } catch(e){ console.error("Drop Error:", e); }
  };

  if (!activeAdventureId || !activeAdventure) {
      return (
        <div className="w-full h-full bg-ecos-bg flex flex-col items-center justify-center p-6 text-white relative z-50">
            <h1 className="text-5xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest">O TABULEIRO</h1>
            <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-2xl w-full max-w-lg relative">
                <h2 className="text-xl font-bold mb-4">Suas Aventuras</h2>
                <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4 scrollbar-thin pr-2">
                    {adventures.map(adv => (
                        <div key={adv.id} 
                             onClick={() => { if(renamingId !== adv.id) setActiveAdventureId(adv.id); }} 
                             className={`group flex justify-between items-center p-3 rounded bg-white/5 border border-transparent transition-all ${renamingId === adv.id ? 'bg-white/10' : 'hover:bg-neon-green/10 hover:border-neon-green/30 cursor-pointer'}`}>
                            {renamingId === adv.id ? (
                                <div className="flex flex-1 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input autoFocus className="flex-1 bg-black/50 border border-neon-blue rounded px-2 py-1 text-white text-sm outline-none" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }} />
                                    <button onClick={() => { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); }} className="text-neon-green hover:text-white"><Check size={16}/></button>
                                    <button onClick={() => setRenamingId(null)} className="text-red-400 hover:text-white"><X size={16}/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="truncate font-medium">{adv.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e)=>{e.stopPropagation(); exportAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-neon-blue transition" title="Exportar"><Upload size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); duplicateAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-white transition" title="Duplicar"><Copy size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setRenamingId(adv.id); setRenameValue(adv.name);}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-yellow-400 transition" title="Renomear"><Edit2 size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setDeleteModal(adv.id);}} className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500 transition" title="Excluir"><Trash2 size={14}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {adventures.length === 0 && <p className="text-text-muted text-center text-sm py-4">Nenhuma aventura criada.</p>}
                </div>
                <div className="flex gap-2 pt-4 border-t border-glass-border">
                    <input className="flex-1 bg-black/50 border border-glass-border rounded p-2 text-white" placeholder="Nova Aventura..." value={newAdvName} onChange={e=>setNewAdvName(e.target.value)}/>
                    <button onClick={()=>{if(newAdvName) { createAdventure(newAdvName); setNewAdvName(""); }}} className="bg-neon-green text-black font-bold px-4 rounded hover:bg-white transition"><Plus/></button>
                    <div className="relative">
                        <button onClick={() => importInputRef.current?.click()} className="bg-glass border border-glass-border text-white px-3 py-2 rounded h-full hover:bg-white/10 transition" title="Importar"><Download size={20}/></button>
                        <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const file = e.target.files[0]; if(file) importAdventure(file); e.target.value = null; }}/>
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-glass-border text-center">
                    <button onClick={() => { if(window.confirm("Isso apagará TODAS as aventuras e tokens. Confirmar?")) resetAllData() }} className="text-[10px] text-red-500 hover:text-red-400 flex items-center justify-center gap-1 mx-auto opacity-50 hover:opacity-100 transition"><AlertTriangle size={10}/> Resetar Banco de Dados</button>
                </div>
                {deleteModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl animate-in fade-in">
                        <div className="bg-ecos-bg border border-glass-border p-5 rounded-lg shadow-2xl w-3/4 max-w-sm text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Excluir Aventura?</h3>
                            <p className="text-text-muted text-sm mb-6">Esta ação não pode ser desfeita.</p>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setDeleteModal(null)} className="px-4 py-2 rounded bg-glass border border-glass-border text-white hover:bg-white/10 text-sm">Cancelar</button>
                                <button onClick={() => { deleteAdventure(deleteModal); setDeleteModal(null); }} className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 text-sm">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#15151a]" ref={containerRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
    >
        <div className="absolute top-0 left-0 w-full h-full origin-top-left"
             style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
             <div className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />
            {mapParams.url && (
                <div style={{ transform: `scale(${activeScene.mapScale || 1})`, transformOrigin: '0 0' }}>
                    <img src={mapParams.url} className="max-w-none pointer-events-none select-none opacity-90 shadow-2xl" alt="Map Layer"/>
                </div>
            )}
            
            {/* Tokens (z-index: 10) */}
            {activeScene?.tokens.map(t => (
                <Token key={t.id} data={t} isSelected={selectedIds.has(t.id)} onMouseDown={handleTokenDown} onResizeStart={handleTokenResizeStart}/>
            ))}
            
            {/* Fog of War Preview durante desenho */}
            {fogDrawing.isDrawing && (
                <div
                    className="absolute pointer-events-none fog-area"
                    style={{
                        left: Math.min(fogDrawing.startX, fogDrawing.currentX),
                        top: Math.min(fogDrawing.startY, fogDrawing.currentY),
                        width: Math.abs(fogDrawing.currentX - fogDrawing.startX),
                        height: Math.abs(fogDrawing.currentY - fogDrawing.startY),
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        border: '2px dashed rgba(255, 255, 255, 0.3)',
                        zIndex: 15,
                    }}
                />
            )}
            
            {/* Fog of War Areas (z-index: 15) */}
            {activeScene?.fogOfWar?.map(fog => (
                <div
                    key={fog.id}
                    className={`fog-area absolute ${selectedFogIds.has(fog.id) ? 'ring-2 ring-yellow-400' : ''} ${activeTool === 'select' ? 'cursor-move' : 'cursor-default'}`}
                    style={{
                        left: fog.x,
                        top: fog.y,
                        width: fog.width,
                        height: fog.height,
                        backgroundColor: 'rgba(0, 0, 0, 1)',
                        zIndex: 15,
                    }}
                    onMouseDown={(e) => handleFogDown(e, fog.id)}
                />
            ))}
        </div>
        
        <div className="vtt-ui-layer absolute inset-0 pointer-events-none" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <VTTLayout zoomValue={sliderValue} onZoomChange={handleSliderZoom} activeTool={activeTool} setActiveTool={setActiveTool} />
        </div>
    </div>
  );
};
export default Board;