import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import SceneManager from './SceneManager'; // (O arquivo do post anterior)
import { TokenLibrary, AdventureEntry } from './AdventureManager';
import { Settings, Image as ImageIcon, Box } from 'lucide-react';

const Board = () => {
  const { 
    activeAdventureId, activeScene, activeAdventure,
    addTokenInstance, updateTokenInstance, updateScene 
  } = useGame();

  const containerRef = useRef(null);
  
  // Viewport
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  
  // Interaction State
  const [interaction, setInteraction] = useState({ 
      mode: 'IDLE', // IDLE, PANNING, DRAGGING, RESIZING
      activeId: null, 
      startX: 0, startY: 0, 
      initialVal: 0 // Usado para guardar escala inicial ou posição inicial
  });
  
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // UI States
  const [showSceneManager, setShowSceneManager] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showMapSettings, setShowMapSettings] = useState(false);

  // --- LOGIC ---

  useEffect(() => {
    const kd = (e) => { if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true); };
    const ku = (e) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, view.scale * (1 + scaleAmount)), 10);
    const rect = containerRef.current.getBoundingClientRect();
    const mX = e.clientX - rect.left; const mY = e.clientY - rect.top;
    const ratio = newScale / view.scale;
    setView({ scale: newScale, x: mX - (mX - view.x) * ratio, y: mY - (mY - view.y) * ratio });
  };

  // Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ mode: 'PANNING', startX: e.clientX - view.x, startY: e.clientY - view.y });
    }
  };

  const handleTokenDown = (e, id) => {
    if (isSpacePressed || e.button !== 0) return;
    setInteraction({ mode: 'DRAGGING', activeId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleTokenResizeStart = (e, id) => {
      const token = activeScene.tokens.find(t => t.id === id);
      setInteraction({ 
          mode: 'RESIZING', activeId: id, 
          startX: e.clientX, 
          initialVal: token.scale || 1 
      });
  };

  const handleMouseMove = (e) => {
    if (interaction.mode === 'PANNING') {
        setView({ ...view, x: e.clientX - interaction.startX, y: e.clientY - interaction.startY });
    } 
    else if (interaction.mode === 'DRAGGING') {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        const t = activeScene.tokens.find(x => x.id === interaction.activeId);
        if(t) {
            updateTokenInstance(activeScene.id, t.id, { x: t.x + dx, y: t.y + dy });
            setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
        }
    }
    else if (interaction.mode === 'RESIZING') {
        // Lógica de resize baseada na distância percorrida pelo mouse
        const deltaX = (e.clientX - interaction.startX);
        // Sensibilidade: 100px de movimento = +1.0 de escala
        const scaleDelta = deltaX / 100;
        const newScale = Math.max(0.5, interaction.initialVal + scaleDelta);
        
        updateTokenInstance(activeScene.id, interaction.activeId, { scale: newScale });
    }
  };

  const handleMouseUp = () => setInteraction({ mode: 'IDLE', activeId: null });

  // Drag & Drop
  const handleDrop = (e) => {
      e.preventDefault();
      try {
          const json = JSON.parse(e.dataTransfer.getData('application/json'));
          const rect = containerRef.current.getBoundingClientRect();
          const wX = (e.clientX - rect.left - view.x) / view.scale;
          const wY = (e.clientY - rect.top - view.y) / view.scale;

          // Se for personagem (Sidebar) ou Token (Library), ambos criam uma instância
          if (json.type === 'character' || json.type === 'library_token') {
             if(activeScene) {
                 addTokenInstance(activeScene.id, {
                     x: wX - 35, y: wY - 35,
                     imageSrc: json.imageSrc,
                     linkedCharId: json.type === 'character' ? json.id : null // Linka só se for char
                 });
             }
          }
      } catch(e){}
  };

  // Upload de Mapa (Cena Atual)
  const handleMapUpload = (e) => {
      const f = e.target.files[0];
      if(f){
          const r = new FileReader();
          r.onloadend = () => updateScene(activeScene.id, { mapImage: r.result });
          r.readAsDataURL(f);
      }
  };

  // Se não tem aventura selecionada, mostra entrada
  if (!activeAdventureId) return <AdventureEntry />;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#15151a]"
        ref={containerRef}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
    >
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 z-40 flex gap-2">
             <button onClick={() => setShowSceneManager(!showSceneManager)} className="bg-black/80 text-white px-3 py-2 rounded border border-glass-border hover:border-neon-green font-rajdhani font-bold text-sm">
                 {activeScene ? activeScene.name : "Cenas"}
             </button>
             <button onClick={() => setShowLibrary(!showLibrary)} className={`p-2 rounded border ${showLibrary ? 'bg-neon-blue text-black border-neon-blue' : 'bg-black/80 text-white border-glass-border'}`}>
                 <Box size={20}/>
             </button>
        </div>

        {/* Gerenciadores Flutuantes */}
        {showSceneManager && <SceneManager onClose={() => setShowSceneManager(false)} />}
        {showLibrary && <TokenLibrary onClose={() => setShowLibrary(false)} />}
        
        {/* Configurações do Mapa (Aberto se tiver mapa) */}
        {activeScene && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-black/80 p-2 rounded-lg border border-glass-border">
                <label className="cursor-pointer hover:text-neon-green text-white flex items-center gap-2 text-xs font-bold uppercase">
                    <ImageIcon size={16}/> {activeScene.mapImage ? "Trocar Mapa" : "Add Mapa"}
                    <input type="file" className="hidden" onChange={handleMapUpload} accept="image/*"/>
                </label>
                
                {activeScene.mapImage && (
                    <div className="flex items-center gap-2 border-l border-white/20 pl-2">
                        <span className="text-[10px] text-text-muted uppercase">Escala</span>
                        <input 
                            type="range" min="0.1" max="5" step="0.1" 
                            value={activeScene.mapScale || 1}
                            onMouseDown={e => e.stopPropagation()} // Importante para não arrastar mapa
                            onChange={(e) => updateScene(activeScene.id, { mapScale: parseFloat(e.target.value) })}
                            className="w-24 accent-neon-green"
                        />
                    </div>
                )}
            </div>
        )}

        {/* MUNDO */}
        <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            {/* Grid */}
            <div className="absolute -top-[5000px] -left-[5000px] w-[10000px] h-[10000px] opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />

            {/* Mapa de Fundo (Escalável) */}
            {activeScene?.mapImage && (
                <div style={{ transform: `scale(${activeScene.mapScale || 1})`, transformOrigin: '0 0' }}>
                    <img src={activeScene.mapImage} className="max-w-none pointer-events-none select-none opacity-90"/>
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
    </div>
  );
};

export default Board;