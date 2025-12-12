import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { imageDB } from '../../context/db';
import { Plus, Trash2, Download, Upload, Copy, Edit2, X, Check, Search } from 'lucide-react';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const PAN_LIMIT = 3000; 
const CAMERA_SMOOTHING = 0.2; 
const ZOOM_SPEED_FACTOR = 0.001; 

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
  const adventuresListRef = useRef(null);
  
  const prevAdventuresLength = useRef(adventures.length);

  // --- CONTROLE DE CÂMERA ---
  const animationRef = useRef(null); 
  const viewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  const targetViewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [sliderValue, setSliderValue] = useState(100);

  // Interações
  const [isCreatingAdventure, setIsCreatingAdventure] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [selectedFogIds, setSelectedFogIds] = useState(new Set());
  const [interaction, setInteraction] = useState({ 
    mode: 'IDLE', startX: 0, startY: 0, initialVal: 0, 
    activeTokenId: null, activeFogId: null, initialViewX: 0, initialViewY: 0, 
    fogStartX: 0, fogStartY: 0
  });
  
  const [fogDrawing, setFogDrawing] = useState({ isDrawing: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [mapParams, setMapParams] = useState({ url: null, id: null });

  // UI
  const [newAdvName, setNewAdvName] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); 
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const zoomKeyRef = useRef(0); 
  const zoomSpeedRef = useRef(0.01); 
  const lastZoomTimeRef = useRef(0); 

  // --- EFFECTS ---

  // Scroll automático lista
  useEffect(() => {
    if (adventures.length > prevAdventuresLength.current) {
        if (adventuresListRef.current) {
            adventuresListRef.current.scrollTop = adventuresListRef.current.scrollHeight;
        }
    }
    prevAdventuresLength.current = adventures.length;
  }, [adventures.length]); 

  // Sincroniza slider e refs
  useEffect(() => {
    const currentPercent = Math.round(view.scale * 100);
    if (Math.abs(sliderValue - currentPercent) > 1 && !animationRef.current) {
        setSliderValue(currentPercent);
    }
    if (!animationRef.current) {
        targetViewRef.current = { ...view };
        viewRef.current = { ...view };
    }
  }, [view.scale, view.x, view.y]);

  // Carrega Mapa
  useEffect(() => {
      if (!activeScene) return;
      const loadMap = async () => {
          if (activeScene.mapImageId !== mapParams.id) {
              if (activeScene.mapImageId) {
                  const blob = await imageDB.getImage(activeScene.mapImageId);
                  if (blob) {
                      const url = URL.createObjectURL(blob);
                      setMapParams({ url, id: activeScene.mapImageId });
                  }
              } else {
                  setMapParams({ url: null, id: null });
              }
          } else if (activeScene.mapImage && !activeScene.mapImageId && !mapParams.url) {
               setMapParams({ url: activeScene.mapImage, id: 'legacy' });
          }
      };
      loadMap();
  }, [activeScene, mapParams.id, mapParams.url]);

  // Cleanup de Animação ao desmontar
  useEffect(() => {
      return () => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
  }, []);

  // Atalhos (CORREÇÃO AQUI)
  useEffect(() => {
    const handleKeyDown = (e) => {
        // --- FIX CRÍTICO: Bloqueia atalhos se o foco estiver em um input ---
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

        if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);

        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            if (selectedIds.size > 0 && activeScene) {
                deleteMultipleTokenInstances(activeScene?.id, Array.from(selectedIds));
                setSelectedIds(new Set());
            }
            if (selectedFogIds.size > 0 && activeScene) {
                deleteMultipleFogAreas(activeScene?.id, Array.from(selectedFogIds));
                setSelectedFogIds(new Set());
            }
        }
        if ((e.key === 'ArrowUp') && !e.repeat) {
            e.preventDefault();
            zoomKeyRef.current = 1;
            zoomSpeedRef.current = 0.01;
            lastZoomTimeRef.current = Date.now();
        }
        if ((e.key === 'ArrowDown') && !e.repeat) {
            e.preventDefault();
            zoomKeyRef.current = -1;
            zoomSpeedRef.current = 0.01;
            lastZoomTimeRef.current = Date.now();
        }
    };
    
    const handleKeyUp = (e) => {
        // Também bloqueia no KeyUp para evitar inconsistência de estado
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

        if (e.code === 'Space') setIsSpacePressed(false);
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            zoomKeyRef.current = 0;
            zoomSpeedRef.current = 0.01;
        }
    };
    
    window.addEventListener('keydown', handleKeyDown); 
    window.addEventListener('keyup', handleKeyUp);
    
    return () => { 
        window.removeEventListener('keydown', handleKeyDown); 
        window.removeEventListener('keyup', handleKeyUp); 
    };
  }, [selectedIds, selectedFogIds, activeScene, deleteMultipleTokenInstances, deleteMultipleFogAreas, setActiveTool]);

  // ==========================================
  // LOOP DE ANIMAÇÃO
  // ==========================================

  const animateCamera = useCallback(() => {
      const target = targetViewRef.current;
      const current = viewRef.current;

      const diffScale = target.scale - current.scale;
      const diffX = target.x - current.x;
      const diffY = target.y - current.y;

      if (Math.abs(diffScale) < 0.0001 && Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1) {
          animationRef.current = null;
          viewRef.current = target;
          setView(target);
          return;
      }

      const nextScale = current.scale + (diffScale * CAMERA_SMOOTHING);
      const nextX = current.x + (diffX * CAMERA_SMOOTHING);
      const nextY = current.y + (diffY * CAMERA_SMOOTHING);

      const nextState = { scale: nextScale, x: nextX, y: nextY };
      viewRef.current = nextState;
      setView(nextState);

      animationRef.current = requestAnimationFrame(animateCamera);
  }, []);

  const startAnimation = useCallback(() => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animateCamera);
  }, [animateCamera]);

  // Zoom Teclado
  const applyKeyboardZoom = useCallback(() => {
    if (zoomKeyRef.current === 0) return;
    const now = Date.now();
    if (now - lastZoomTimeRef.current > 100) { 
        zoomSpeedRef.current = Math.min(zoomSpeedRef.current * 1.1, 0.05);
    }
    const zoomAmount = zoomKeyRef.current * zoomSpeedRef.current;
    const currentTarget = targetViewRef.current;
    const rawNewScale = currentTarget.scale * (1 + zoomAmount);
    const clampedScale = Math.min(Math.max(MIN_SCALE, rawNewScale), MAX_SCALE);
    
    if (Math.abs(clampedScale - currentTarget.scale) < 0.001) return;
    
    const node = containerRef.current;
    if (node) {
        const rect = node.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const ratio = clampedScale / currentTarget.scale;
        
        let newX = centerX - (centerX - currentTarget.x) * ratio;
        let newY = centerY - (centerY - currentTarget.y) * ratio;
        
        const limit = PAN_LIMIT * clampedScale;
        newX = Math.min(Math.max(newX, -limit), limit);
        newY = Math.min(Math.max(newY, -limit), limit);
        
        setSliderValue(Math.round(clampedScale * 100));
        targetViewRef.current = { scale: clampedScale, x: newX, y: newY };
        startAnimation();
    }
    lastZoomTimeRef.current = now;
  }, [startAnimation]);

  useEffect(() => {
    let frameId;
    const loop = () => {
        if (zoomKeyRef.current !== 0) applyKeyboardZoom();
        frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [applyKeyboardZoom]);

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
          
          targetViewRef.current = { scale: newScale, x: newX, y: newY };
          startAnimation();
      }
  };

  // ==========================================
  // HANDLER DE SCROLL
  // ==========================================
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e) => {
        if (e.target.closest('.overflow-y-auto')) return;
        
        e.preventDefault(); 
        
        const delta = -e.deltaY; 
        const scaleAmount = delta * ZOOM_SPEED_FACTOR; 

        const currentTarget = targetViewRef.current;
        let rawNewScale = currentTarget.scale * (1 + scaleAmount);
        rawNewScale = Math.min(Math.max(MIN_SCALE, rawNewScale), MAX_SCALE);
        
        if (Math.abs(rawNewScale - currentTarget.scale) < 0.0001) return;

        const rect = node.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const ratio = rawNewScale / currentTarget.scale;
        
        let newX = mouseX - (mouseX - currentTarget.x) * ratio;
        let newY = mouseY - (mouseY - currentTarget.y) * ratio;

        const limit = PAN_LIMIT * rawNewScale;
        newX = Math.min(Math.max(newX, -limit), limit);
        newY = Math.min(Math.max(newY, -limit), limit);

        setSliderValue(Math.round(rawNewScale * 100));
        targetViewRef.current = { scale: rawNewScale, x: newX, y: newY };
        startAnimation();
    };
    
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [startAnimation, activeAdventureId]);

  // ==========================================
  // MANIPULAÇÃO DO MOUSE
  // ==========================================
  const handleAuxClick = (e) => { if (e.button === 1) e.preventDefault(); };

  const handleMouseDown = (e) => {
    if (e.target.closest('.vtt-ui-layer')) return;
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ mode: 'PANNING', startX: e.clientX, startY: e.clientY, initialViewX: targetViewRef.current.x, initialViewY: targetViewRef.current.y });
        return;
    }
    const isClickingElement = e.target.closest('.token') || e.target.closest('.fog-area');
    if (!isClickingElement && (!e.ctrlKey && !e.metaKey)) {
        if (activeTool === 'select') { setSelectedIds(new Set()); setSelectedFogIds(new Set()); }
        else if (activeTool === 'fogOfWar') { setSelectedFogIds(new Set()); setSelectedIds(new Set()); }
    }
    if (activeTool === 'fogOfWar' && e.button === 0 && !isClickingElement) {
        const rect = containerRef.current.getBoundingClientRect();
        const wX = (e.clientX - rect.left - view.x) / view.scale;
        const wY = (e.clientY - rect.top - view.y) / view.scale;
        setFogDrawing({ isDrawing: true, startX: wX, startY: wY, currentX: wX, currentY: wY });
    }
  };

  const handleTokenDown = (e, id) => {
    if (e.button === 1 || e.button === 2) return;
    if (isSpacePressed) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    if (activeTool !== 'select') return;
    const isMultiSelect = e.ctrlKey || e.metaKey;
    if (isMultiSelect) {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
        setSelectedIds(newSelection);
    } else { if (!selectedIds.has(id)) setSelectedIds(new Set([id])); }
    setSelectedFogIds(new Set());
    setInteraction({ mode: 'DRAGGING', activeTokenId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleFogDown = (e, id) => {
    if (e.button === 1 || e.button === 2) return;
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const isMultiSelect = e.ctrlKey || e.metaKey;
    if (isMultiSelect) {
        const newSelection = new Set(selectedFogIds);
        if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
        setSelectedFogIds(newSelection);
    } else { if (!selectedFogIds.has(id)) setSelectedFogIds(new Set([id])); }
    setSelectedIds(new Set());
    setInteraction({ mode: 'DRAGGING_FOG', activeFogId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleTokenResizeStart = (e, id) => {
      e.stopPropagation();
      if (!activeScene || activeTool !== 'select') return;
      const token = activeScene.tokens.find(t => t.id === id);
      if (token) setInteraction({ mode: 'RESIZING', activeTokenId: id, startX: e.clientX, initialVal: token.scale || 1 });
  };

  const handleMouseMove = (e) => {
    if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
        const rect = containerRef.current.getBoundingClientRect();
        const wX = (e.clientX - rect.left - view.x) / view.scale;
        const wY = (e.clientY - rect.top - view.y) / view.scale;
        setFogDrawing(prev => ({ ...prev, currentX: wX, currentY: wY }));
        return;
    }
    if (interaction.mode === 'PANNING') {
        const dX = e.clientX - interaction.startX;
        const dY = e.clientY - interaction.startY;
        let nX = interaction.initialViewX + dX;
        let nY = interaction.initialViewY + dY;
        const limit = PAN_LIMIT * targetViewRef.current.scale;
        nX = Math.min(Math.max(nX, -limit), limit);
        nY = Math.min(Math.max(nY, -limit), limit);
        targetViewRef.current = { ...targetViewRef.current, x: nX, y: nY };
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
            if (fog) updateFogArea(activeScene.id, fogId, { x: fog.x + dx, y: fog.y + dy });
        });
        setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
    } else if (interaction.mode === 'RESIZING' && activeScene) {
        const deltaX = (e.clientX - interaction.startX);
        const newScale = Math.max(0.5, interaction.initialVal + (deltaX / 100));
        updateTokenInstance(activeScene.id, interaction.activeTokenId, { scale: newScale });
    }
  };

  const handleMouseUp = () => {
      if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
          const { startX, startY, currentX, currentY } = fogDrawing;
          const w = currentX - startX;
          const h = currentY - startY;
          if (Math.abs(w) > 10 && Math.abs(h) > 10 && activeScene) {
              addFogArea(activeScene.id, { x: Math.min(startX, currentX), y: Math.min(startY, currentY), width: Math.abs(w), height: Math.abs(h), color: 'rgba(0, 0, 0, 0.85)' });
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
          if (json.type === 'library_token' && activeScene) {
             addTokenInstance(activeScene.id, { x: wX - 35, y: wY - 35, imageId: json.imageId, imageSrc: json.imageSrc });
          } else if (json.type === 'character_drag' && activeScene) {
              const imageId = await importCharacterAsToken(json.characterId);
              if (imageId) addTokenInstance(activeScene.id, { x: wX - 35, y: wY - 35, imageId: imageId });
          }
      } catch(e){ console.error("Drop Error:", e); }
  };

  if (!activeAdventureId || !activeAdventure) {
      // ... Menu Principal (Preservado) ...
      return (
        <div className="w-full h-full bg-ecos-bg flex flex-col items-center justify-center p-6 text-white relative z-50">
            <style>{`
                @keyframes enter-slide {
                    0% { opacity: 0; transform: translateY(-15px) scale(0.95); max-height: 0; margin-bottom: 0; }
                    40% { max-height: 60px; margin-bottom: 0.5rem; }
                    100% { opacity: 1; transform: translateY(0) scale(1); max-height: 60px; margin-bottom: 0.5rem; }
                }
                .animate-enter {
                    animation: enter-slide 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>
            <h1 className="text-5xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest">TABULEIRO</h1>
            <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-2xl w-full max-w-lg relative">
                <h2 className="text-xl font-bold mb-4">Suas Aventuras</h2>
                <div ref={adventuresListRef} className="relative min-h-[120px] max-h-[300px] overflow-y-auto space-y-2 mb-4 scrollbar-thin pr-2 scroll-smooth">
                    {adventures.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-text-muted text-sm animate-pulse">Nenhuma aventura criada.</p>
                        </div>
                    )}
                    {adventures.map(adv => (
                        <div key={adv.id} onClick={() => { if(renamingId !== adv.id) setActiveAdventureId(adv.id); }} className={`animate-enter group flex justify-between items-center p-3 rounded bg-white/5 border border-transparent transition-all ${renamingId === adv.id ? 'bg-white/10' : 'hover:bg-neon-green/10 hover:border-neon-green/30 cursor-pointer'}`}>
                            {renamingId === adv.id ? (
                                <div className="flex flex-1 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input autoFocus className="flex-1 bg-black/50 border border-white/50 rounded px-2 py-1 text-white text-sm outline-none" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }} />
                                    <button onClick={() => { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); }} className="text-neon-green hover:text-white"><Check size={16}/></button>
                                    <button onClick={() => setRenamingId(null)} className="text-red-400 hover:text-white"><X size={16}/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="truncate font-medium">{adv.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e)=>{e.stopPropagation(); exportAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-neon-blue transition"><Upload size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); duplicateAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-white transition"><Copy size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setRenamingId(adv.id); setRenameValue(adv.name);}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-yellow-400 transition"><Edit2 size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setDeleteModal(adv.id);}} className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500 transition"><Trash2 size={14}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-glass-border">
                    {!isCreatingAdventure ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreatingAdventure(true)} className="flex-1 py-3 bg-neon-green/10 border border-neon-green/40 text-neon-green font-bold rounded-lg hover:bg-neon-green hover:text-black hover:shadow-[0_0_15px_rgba(0,255,0,0.4)] transition-all flex items-center justify-center gap-2 group"><Plus size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform"/> NOVA AVENTURA</button>
                            <div className="relative">
                                <button onClick={() => importInputRef.current?.click()} className="h-full px-4 bg-glass border border-glass-border text-text-muted hover:text-white rounded-lg hover:bg-white/10 transition flex items-center justify-center"><Download size={20}/></button>
                                <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const file = e.target.files[0]; if(file) importAdventure(file); e.target.value = null; }}/>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <input autoFocus placeholder="Nome da Aventura..." className="w-full bg-[#15151a] border border-neon-green text-white placeholder-white/20 rounded-lg p-3 outline-none" value={newAdvName} onChange={e => setNewAdvName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const finalName = newAdvName.trim() === "" ? "Nova Aventura" : newAdvName; createAdventure(finalName); setNewAdvName(""); setIsCreatingAdventure(false); } if (e.key === 'Escape') setIsCreatingAdventure(false); }} />
                            <div className="flex items-center justify-end gap-3 px-1">
                                <button onClick={() => setIsCreatingAdventure(false)} className="text-xs font-medium text-zinc-500 hover:text-white transition-colors px-2 py-1">CANCELAR</button>
                                <button onClick={() => { const finalName = newAdvName.trim() === "" ? "Nova Aventura" : newAdvName; createAdventure(finalName); setNewAdvName(""); setIsCreatingAdventure(false); }} className="flex items-center gap-2 px-5 py-1.5 bg-neon-green text-black font-bold rounded-md text-xs hover:bg-white hover:scale-105 active:scale-95 transition-all"><Check size={14} strokeWidth={3}/> CRIAR</button>
                            </div>
                        </div>
                    )}
                </div>
                {deleteModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl animate-in fade-in">
                        <div className="bg-ecos-bg border border-glass-border p-5 rounded-lg shadow-2xl w-3/4 max-w-sm text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Excluir Aventura?</h3>
                            <div className="flex gap-2 justify-center mt-4">
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
    <div 
        className={`w-full h-full relative overflow-hidden bg-[#15151a] transition-colors duration-300 ${activeTool === 'fogOfWar' ? 'cursor-crosshair' : 'cursor-default'}`} 
        ref={containerRef}
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop} 
        onDragOver={e => e.preventDefault()}
        onAuxClick={handleAuxClick} 
    >
        <div className="absolute top-0 left-0 w-full h-full origin-top-left"
             style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
             <div className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />
            {mapParams.url && (
                <div style={{ transform: `scale(${activeScene.mapScale || 1})`, transformOrigin: '0 0' }}>
                    <img src={mapParams.url} className="max-w-none pointer-events-none select-none opacity-90 shadow-2xl" alt="Map Layer"/>
                </div>
            )}
            
            {activeScene?.tokens.map(t => (
                <Token key={t.id} data={t} isSelected={selectedIds.has(t.id)} onMouseDown={handleTokenDown} onResizeStart={handleTokenResizeStart}/>
            ))}
            
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