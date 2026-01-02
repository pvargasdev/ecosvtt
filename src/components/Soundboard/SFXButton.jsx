import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { Volume2, Trash2, Edit2, Zap } from 'lucide-react';
import * as Icons from 'lucide-react';

const SFXButton = ({ data }) => {
    const { triggerSfxRemote, updateSfx, removeSfx } = useGame();
    const [isPressed, setIsPressed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [localName, setLocalName] = useState(data.name);

    // --- NOVO: Listener para Sincronia Visual Remota ---
    useEffect(() => {
        const handleRemoteTrigger = (e) => {
            // Se o evento recebido for para este botão, ativa a animação
            if (e.detail && e.detail.id === data.id) {
                animatePress();
            }
        };

        window.addEventListener('ecos-sfx-trigger', handleRemoteTrigger);
        return () => window.removeEventListener('ecos-sfx-trigger', handleRemoteTrigger);
    }, [data.id]);

    const animatePress = () => {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 200);
    };

    const handlePress = () => {
        animatePress(); // Feedback local imediato
        triggerSfxRemote(data); // Envia sinal para tocar áudio (e acender botões remotos)
    };

    const handleRightClick = (e) => {
        e.preventDefault();
        setShowSettings(!showSettings);
    };

    const IconComponent = Icons[data.icon] || Zap;

    return (
        <div className="relative group select-none">
            <div 
                onMouseDown={handlePress}
                onContextMenu={handleRightClick}
                className={`
                    aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 shadow-lg relative overflow-hidden
                    ${isPressed ? 'scale-95 brightness-150 border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'hover:scale-105 hover:brightness-110'}
                `}
                style={{
                    backgroundColor: `${data.color}20`, 
                    borderColor: isPressed ? '#fff' : data.color,
                    // Se estiver pressionado (remota ou localmente), aumenta o brilho da cor
                    boxShadow: isPressed ? `0 0 30px ${data.color}` : 'none'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                
                <IconComponent 
                    size={32} 
                    style={{ color: data.color }} 
                    className={`z-10 mb-2 transition-transform duration-75 ${isPressed ? 'scale-125 text-white' : ''}`} 
                />
                
                <span className="z-10 text-[10px] font-bold uppercase tracking-wider text-white text-center px-1 truncate w-full shadow-black drop-shadow-md">
                    {data.name}
                </span>
            </div>

            {/* Menu de Configurações (Mantido igual) */}
            {showSettings && (
                <div className="absolute inset-0 z-20 bg-black/95 rounded-xl border border-white/20 flex flex-col p-2 animate-in fade-in zoom-in-95">
                    <input 
                        className="w-full bg-transparent border-b border-white/20 text-xs text-center text-white outline-none mb-2 pb-1 focus:border-neon-green"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={() => updateSfx(data.id, { name: localName })}
                        autoFocus
                    />
                    <div className="flex items-center gap-1 mb-2">
                        <Volume2 size={10} className="text-text-muted"/>
                        <input 
                            type="range" min="0" max="150" 
                            value={(data.volume || 1) * 100}
                            onChange={(e) => updateSfx(data.id, { volume: e.target.value / 100 })}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                    <div className="flex justify-between mt-auto">
                        <button 
                            onClick={() => {
                                const colors = ['#d084ff', '#00ff9d', '#ff0055', '#00eaff', '#ffcc00', '#ff8800'];
                                const nextColor = colors[Math.floor(Math.random() * colors.length)];
                                updateSfx(data.id, { color: nextColor });
                            }} 
                            className="p-1 text-text-muted hover:text-white" title="Mudar Cor"
                        >
                            <Edit2 size={12}/>
                        </button>
                        <button onClick={() => removeSfx(data.id)} className="p-1 text-red-500 hover:text-red-300" title="Excluir">
                            <Trash2 size={12}/>
                        </button>
                        <button onClick={() => setShowSettings(false)} className="p-1 text-neon-green hover:text-white">
                            <Zap size={12}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SFXButton;