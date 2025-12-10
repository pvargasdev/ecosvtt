import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { Plus, Trash2 } from 'lucide-react';

const Board = () => {
  const { 
    activeAdventureId, activeAdventure, activeScene, 
    addTokenInstance, updateTokenInstance, 
    createAdventure, adventures, setActiveAdventureId, deleteAdventure
  } = useGame();

  const containerRef = useRef(null);
  
  // Viewport State
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction State
  const [interaction, setInteraction] = useState({ mode: 'IDLE', activeId: null, startX: 0, startY: 0, initialVal: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [newAdvName, setNewAdvName] = useState("");

  useEffect(() => {
    const kd = (e) => { if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true); };
    const ku = (e) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // --- ENTRY SCREEN ---
  if (!activeAdventureId || !activeAdventure) {
      return (
        <div className="w-full h-full bg-ecos-bg flex flex-col items-center justify-center p-6 text-white relative z-50">
            <h1 className="text-5xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest drop-shadow-[0_0_15px_rgba(0,255,157,0.5)]">ECOS VTT</h1>
            <div className="w-full max-w-md space-y-6">
                <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-2xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Suas Aventuras</h2>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 mb-4 scrollbar-thin">
                        {adventures.length === 0 && <div className="text-text-muted text-sm italic">Nenhuma aventura encontrada.</div>}
                        {adventures.map(adv => (
                            <div key={adv.id} onClick={() => setActiveAdventureId(adv.id)} 
                                 className="flex justify-between items-center p-3 rounded bg-white/5 hover:bg-neon-green/10 cursor-pointer border border-transparent hover:border-neon-green/30 transition group">
                                <span className="font-rajdhani font-bold">{adv.name}</span>
                                <button onClick={(e)=>{e.stopPropagation(); deleteAdventure(adv.id)}} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 border-t border-glass-border pt-4">
                        <input className="flex-1 bg-black/50 border border-glass-border rounded p-2 text-sm outline-none focus:border-neon-green text-white" 
                               placeholder="Nova Aventura..." value={newAdvName} onChange={e=>setNewAdvName(e.target.value)} 
                               onKeyDown={e => e.key === 'Enter' && newAdvName && createAdventure(newAdvName)}/>
                        <button onClick={()=>{if(newAdvName) createAdventure(newAdvName)}} className="bg-neon-green text-black font-bold px-4 rounded hover:bg-white transition"><Plus/></button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- LOGIC ---

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, view.scale * (1 + scaleAmount)), 10);
    const rect = containerRef.current.getBoundingClientRect();
    const mX = e.clientX - rect.left; const mY = e.clientY - rect.top;
    const ratio = newScale / view.scale;
    setView({ scale: newScale, x: mX - (mX - view.x) * ratio, y: mY - (mY - view.y) * ratio });
  };

  const handleMouseDown = (e) => {
    // Middle Click (Button 1) ou Space+Click
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ mode: 'PANNING', startX: e.clientX - view.x, startY: e.clientY - view.y });
    }
  };

  const handleTokenDown = (e, id) => {
    if (isSpacePressed || e.button !== 0) return; // Se segurar espaço, não arrasta token
    setInteraction({ mode: 'DRAGGING', activeId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleTokenResizeStart = (e, id) => {
      if (!activeScene) return;
      const token = activeScene.tokens.find(t => t.id === id);
      if (token) {
        setInteraction({ mode: 'RESIZING', activeId: id, startX: e.clientX, initialVal: token.scale || 1 });
      }
  };

  const handleMouseMove = (e) => {
    if (interaction.mode === 'PANNING') {
        setView({ ...view, x: e.clientX - interaction.startX, y: e.clientY - interaction.startY });
    } 
    else if (interaction.mode === 'DRAGGING' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        const t = activeScene.tokens.find(x => x.id === interaction.activeId);
        if(t) {
            updateTokenInstance(activeScene.id, t.id, { x: t.x + dx, y: t.y + dy });
            setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
        }
    }
    else if (interaction.mode === 'RESIZING' && activeScene) {
        const deltaX = (e.clientX - interaction.startX);
        const scaleDelta = deltaX / 100;
        const newScale = Math.max(0.5, interaction.initialVal + scaleDelta);
        updateTokenInstance(activeScene.id, interaction.activeId, { scale: newScale });
    }
  };

  const handleMouseUp = () => setInteraction({ mode: 'IDLE', activeId: null });

  const handleDrop = (e) => {
      e.preventDefault();
      try {
          const dataString = e.dataTransfer.getData('application/json');
          if (!dataString) return;
          
          const json = JSON.parse(dataString);
          const rect = containerRef.current.getBoundingClientRect();
          
          // Converte coordenada da tela para coordenada do mundo (com zoom e pan)
          const wX = (e.clientX - rect.left - view.x) / view.scale;
          const wY = (e.clientY - rect.top - view.y) / view.scale;

          if (json.type === 'character' || json.type === 'library_token') {
             if(activeScene) {
                 addTokenInstance(activeScene.id, {
                     x: wX - 35, // Centraliza (assumindo token ~70px)
                     y: wY - 35,
                     imageSrc: json.imageSrc,
                     linkedCharId: json.type === 'character' ? json.id : null
                 });
             }
          }
      } catch(e){
          console.error("Drop Error:", e);
      }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#15151a]"
        ref={containerRef}
        onWheel={handleWheel} 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
        onDrop={handleDrop} 
        onDragOver={e => e.preventDefault()}
    >
        {/* MUNDO (Z-Index baixo) */}
        <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            {/* Grid Infinito */}
            <div className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />

            {/* Mapa de Fundo */}
            {activeScene?.mapImage && (
                <div style={{ transform: `scale(${activeScene.mapScale || 1})`, transformOrigin: '0 0' }}>
                    <img src={activeScene.mapImage} className="max-w-none pointer-events-none select-none opacity-90" alt="Map Layer"/>
                </div>
            )}

            {/* Tokens */}
            {activeScene?.tokens.map(t => (
                <Token 
                    key={t.id} data={t} 
                    isSelected={interaction.activeId === t.id}
                    onMouseDown={handleTokenDown}
                    onResizeStart={handleTokenResizeStart}
                />
            ))}
        </div>

        {/* UI Flutuante (Por cima de tudo, mas transparente aos cliques) */}
        <VTTLayout />
    </div>
  );
};

export default Board;