import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Plus, Trash2, X, Image as ImageIcon, Box } from 'lucide-react';

// --- TELA DE BOAS VINDAS (ENTRADA) ---
export const AdventureEntry = () => {
    const { adventures, createAdventure, setActiveAdventureId, deleteAdventure } = useGame();
    const [name, setName] = useState("");

    return (
        <div className="fixed inset-0 bg-ecos-bg z-[60] flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest">ECOS VTT</h1>
            
            <div className="w-full max-w-md bg-glass border border-glass-border rounded-xl p-6 shadow-2xl">
                <h2 className="text-xl text-white font-bold mb-4">Escolha sua Aventura</h2>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto mb-6 scrollbar-thin">
                    {adventures.length === 0 && <div className="text-text-muted text-sm text-center">Nenhuma aventura encontrada.</div>}
                    {adventures.map(adv => (
                        <div key={adv.id} onClick={() => setActiveAdventureId(adv.id)} className="flex justify-between items-center p-3 rounded bg-white/5 hover:bg-neon-green/10 cursor-pointer border border-transparent hover:border-neon-green/50 transition">
                            <span className="text-white font-rajdhani font-bold">{adv.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteAdventure(adv.id); }} className="text-text-muted hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input className="flex-1 bg-black/50 border border-glass-border rounded p-2 text-white outline-none" placeholder="Nome da Nova Aventura..." value={name} onChange={e => setName(e.target.value)} />
                    <button onClick={() => { if(name) createAdventure(name); }} className="bg-neon-green text-black font-bold px-4 rounded hover:bg-white transition"><Plus/></button>
                </div>
            </div>
        </div>
    );
};

// --- BIBLIOTECA DE TOKENS (ASSETS) ---
export const TokenLibrary = ({ onClose }) => {
    const { activeAdventure, addTokenToLibrary } = useGame();

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const r = new FileReader();
            r.onloadend = () => addTokenToLibrary(r.result);
            r.readAsDataURL(file);
        }
    };

    const handleDragStart = (e, src) => {
        // Formato unificado para o Board aceitar
        e.dataTransfer.setData('application/json', JSON.stringify({ 
            type: 'library_token', 
            imageSrc: src 
        }));
    };

    return (
        <div className="absolute top-16 left-4 w-64 bg-black/90 border border-glass-border rounded-xl flex flex-col max-h-[70vh] animate-in slide-in-from-left-5 z-40">
            <div className="p-3 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold text-white flex gap-2 items-center"><Box size={16} className="text-neon-blue"/> Biblioteca</h3>
                <button onClick={onClose}><X size={16} className="text-text-muted hover:text-white"/></button>
            </div>
            
            <div className="p-3 grid grid-cols-3 gap-2 overflow-y-auto scrollbar-thin">
                {/* Upload Button */}
                <label className="aspect-square border border-dashed border-glass-border rounded hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-neon-blue">
                    <Plus size={20}/>
                    <span className="text-[9px] mt-1">Add</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload}/>
                </label>

                {/* Tokens */}
                {activeAdventure?.tokenLibrary.map(t => (
                    <div 
                        key={t.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, t.imageSrc)}
                        className="aspect-square bg-black rounded border border-glass-border overflow-hidden cursor-grab active:cursor-grabbing hover:border-neon-blue"
                    >
                        <img src={t.imageSrc} className="w-full h-full object-cover pointer-events-none"/>
                    </div>
                ))}
            </div>
            <div className="p-2 text-[10px] text-center text-text-muted bg-black/50">
                Arraste para o mapa
            </div>
        </div>
    );
};