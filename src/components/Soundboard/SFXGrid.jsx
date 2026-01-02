import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Volume2, Plus, Zap, Upload } from 'lucide-react';
import SFXButton from './SFXButton';

const SFXGrid = () => {
    const { soundboard, addSfx, setSfxMasterVolume } = useGame();
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => addSfx(file));
        e.target.value = null;
    };

    // --- Handlers de Drag & Drop ---
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        // Evita flicker quando passa por cima de filhos
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        const audioFiles = files.filter(f => f.type.startsWith('audio/'));
        
        if (audioFiles.length > 0) {
            audioFiles.forEach(file => addSfx(file));
        }
    };

    return (
        <div 
            className="flex flex-col h-full bg-[#0a0a0a] relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Overlay de Drag & Drop */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-neon-green/10 border-2 border-dashed border-neon-green flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
                    <Upload size={48} className="text-neon-green mb-2 animate-bounce"/>
                    <h3 className="text-neon-green font-bold text-xl font-rajdhani">SOLTE PARA ADICIONAR SFX</h3>
                </div>
            )}

            {/* Master Volume Bar */}
            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400"/> Master SFX
                </span>
                <div className="flex-1 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <Volume2 size={14} className="text-text-muted"/>
                    <input 
                        type="range" min="0" max="100" 
                        value={(soundboard.masterVolume.sfx || 1) * 100} 
                        onChange={(e) => setSfxMasterVolume(e.target.value / 100)}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-400"
                    />
                    <span className="text-[10px] font-mono text-white w-6 text-right">
                        {Math.round((soundboard.masterVolume.sfx || 1) * 100)}%
                    </span>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <div className="grid grid-cols-3 gap-3">
                    {/* Botão de Adicionar */}
                    <div 
                        onClick={() => fileInputRef.current.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/30 transition-all text-text-muted hover:text-white group"
                    >
                        <Plus size={24} className="mb-1 group-hover:scale-110 transition-transform"/>
                        <span className="text-[10px] font-bold uppercase">Adicionar</span>
                        <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden" onChange={handleUpload}/>
                    </div>

                    {/* Botões SFX */}
                    {soundboard.sfxGrid.map(sfx => (
                        <SFXButton key={sfx.id} data={sfx} />
                    ))}
                </div>
                
                {soundboard.sfxGrid.length === 0 && !isDragging && (
                    <div className="text-center text-text-muted text-xs mt-8 opacity-50">
                        Clique em Adicionar ou arraste arquivos de áudio para cá.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SFXGrid;