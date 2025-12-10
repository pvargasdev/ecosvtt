import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { imageDB } from '../../context/db'; // Caminho corrigido
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

const Board = () => {
  const { 
    activeAdventureId, activeAdventure, activeScene, 
    addTokenInstance, updateTokenInstance, 
    createAdventure, adventures, setActiveAdventureId, deleteAdventure, resetAllData
  } = useGame();

  const containerRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [interaction, setInteraction] = useState({ mode: 'IDLE', activeId: null, startX: 0, startY: 0, initialVal: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [newAdvName, setNewAdvName] = useState("");
  
  const [mapParams, setMapParams] = useState({ url: null, id: null });

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
           // Fallback legado
           setMapParams({ url: activeScene.mapImage, id: 'legacy' });
      }

  }, [activeScene, mapParams.id, mapParams.url]);

  useEffect(() => {
    const kd = (e) => { if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true); };
    const ku = (e) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => {
        e.preventDefault(); 
        const scaleAmount = -e.deltaY * 0.001;
        setView(prevView => {
            const newScale = Math.min(Math.max(0.1, prevView.scale * (1 + scaleAmount)), 10);
            const rect = node.getBoundingClientRect();
            const mX = e.clientX - rect.left; const mY = e.clientY - rect.top;
            const ratio = newScale / prevView.scale;
            return { scale: newScale, x: mX - (mX - prevView.x) * ratio, y: mY - (mY - prevView.y) * ratio };
        });
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.vtt-ui-layer')) return;
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ mode: 'PANNING', startX: e.clientX - view.x, startY: e.clientY - view.y });
    }
  };

  const handleTokenDown = (e, id) => {
    e.stopPropagation();
    if (isSpacePressed || e.button !== 0) return; 
    setInteraction({ mode: 'DRAGGING', activeId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleTokenResizeStart = (e, id) => {
      e.stopPropagation();
      if (!activeScene) return;
      const token = activeScene.tokens.find(t => t.id === id);
      if (token) setInteraction({ mode: 'RESIZING', activeId: id, startX: e.clientX, initialVal: token.scale || 1 });
  };

  const handleMouseMove = (e) => {
    if (interaction.mode === 'PANNING') {
        setView({ ...view, x: e.clientX - interaction.startX, y: e.clientY - interaction.startY });
    } else if (interaction.mode === 'DRAGGING' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        const t = activeScene.tokens.find(x => x.id === interaction.activeId);
        if(t) {
            updateTokenInstance(activeScene.id, t.id, { x: t.x + dx, y: t.y + dy });
            setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
        }
    } else if (interaction.mode === 'RESIZING' && activeScene) {
        const deltaX = (e.clientX - interaction.startX);
        const newScale = Math.max(0.5, interaction.initialVal + (deltaX / 100));
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
          }
      } catch(e){ console.error("Drop Error:", e); }
  };

  if (!activeAdventureId || !activeAdventure) {
      return (
        <div className="w-full h-full bg-ecos-bg flex flex-col items-center justify-center p-6 text-white relative z-50">
            <h1 className="text-5xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest">ECOS VTT</h1>
            <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Suas Aventuras</h2>
                <div className="max-h-[200px] overflow-y-auto space-y-2 mb-4 scrollbar-thin">
                    {adventures.map(adv => (
                        <div key={adv.id} onClick={() => setActiveAdventureId(adv.id)} 
                             className="flex justify-between items-center p-3 rounded bg-white/5 hover:bg-neon-green/10 cursor-pointer border border-transparent hover:border-neon-green/30">
                            <span>{adv.name}</span>
                            <button onClick={(e)=>{e.stopPropagation(); deleteAdventure(adv.id)}} className="text-red-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 pt-4 border-t border-glass-border">
                    <input className="flex-1 bg-black/50 border border-glass-border rounded p-2 text-white" placeholder="Nova Aventura..." value={newAdvName} onChange={e=>setNewAdvName(e.target.value)}/>
                    <button onClick={()=>{if(newAdvName) createAdventure(newAdvName)}} className="bg-neon-green text-black font-bold px-4 rounded"><Plus/></button>
                </div>
                <div className="mt-8 pt-4 border-t border-glass-border text-center">
                    <p className="text-xs text-red-400 mb-2 flex items-center justify-center gap-1"><AlertTriangle size={12}/> Problemas de Memória/Crash?</p>
                    <button onClick={() => { if(window.confirm("Isso apagará TODAS as aventuras e tokens para corrigir o erro de memória. Confirmar?")) resetAllData() }} className="text-xs bg-red-900/50 hover:bg-red-700 text-white px-3 py-1 rounded border border-red-800">RESETAR DADOS DO APP</button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#15151a]" ref={containerRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
    >
        <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            <div className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />

            {mapParams.url && (
                <div style={{ transform: `scale(${activeScene.mapScale || 1})`, transformOrigin: '0 0' }}>
                    <img src={mapParams.url} className="max-w-none pointer-events-none select-none opacity-90" alt="Map Layer"/>
                </div>
            )}

            {activeScene?.tokens.map(t => (
                <Token key={t.id} data={t} isSelected={interaction.activeId === t.id} onMouseDown={handleTokenDown} onResizeStart={handleTokenResizeStart}/>
            ))}
        </div>
        <div className="vtt-ui-layer absolute inset-0 pointer-events-none"
            onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <VTTLayout />
        </div>
    </div>
  );
};
export default Board;