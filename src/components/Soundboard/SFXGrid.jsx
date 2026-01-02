import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Plus, Upload } from 'lucide-react';
import SFXButton from './SFXButton';

const SFXGrid = () => {
    const { soundboard, addSfx } = useGame();
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
                <div className="absolute inset-0 z-50 bg-neon-green/10 border-2 border-dashed border-neon-green flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in pointer-events-none">
                    <Upload size={48} className="text-neon-green mb-2 animate-bounce"/>
                    <h3 className="text-neon-green font-bold text-xl font-rajdhani">SOLTE PARA ADICIONAR SFX</h3>
                </div>
            )}

            {/* Grid Area - Removido o Header de Volume */}
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