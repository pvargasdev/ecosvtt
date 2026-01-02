import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Volume2, Trash2, Edit2, Zap, Skull, Bell, CloudRain, Sword, Shield, Music, Check } from 'lucide-react';
import * as Icons from 'lucide-react'; // Para renderizar ícones dinamicamente

const SFXButton = ({ data }) => {
    const { triggerSfxRemote, updateSfx, removeSfx } = useGame();
    const [isPressed, setIsPressed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [localName, setLocalName] = useState(data.name);

    const handlePress = () => {
        setIsPressed(true);
        triggerSfxRemote(data);
        setTimeout(() => setIsPressed(false), 200); // Animação de "click"
    };

    const handleRightClick = (e) => {
        e.preventDefault();
        setShowSettings(!showSettings);
    };

    // Ícone Dinâmico
    const IconComponent = Icons[data.icon] || Zap;

    return (
        <div className="relative group select-none">
            {/* O Botão Principal */}
            <div 
                onMouseDown={handlePress}
                onContextMenu={handleRightClick}
                className={`
                    aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-100 shadow-lg relative overflow-hidden
                    ${isPressed ? 'scale-95 brightness-150 border-white' : 'hover:scale-105 hover:brightness-110'}
                `}
                style={{
                    backgroundColor: `${data.color}20`, // 20% opacidade
                    borderColor: isPressed ? '#fff' : data.color,
                    boxShadow: isPressed ? `0 0 20px ${data.color}` : 'none'
                }}
            >
                {/* Brilho de Fundo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                
                <IconComponent size={32} style={{ color: data.color }} className={`z-10 mb-2 transition-transform ${isPressed ? 'scale-110' : ''}`} />
                
                <span className="z-10 text-[10px] font-bold uppercase tracking-wider text-white text-center px-1 truncate w-full shadow-black drop-shadow-md">
                    {data.name}
                </span>
            </div>

            {/* Painel de Configurações (Overlay) */}
            {showSettings && (
                <div className="absolute inset-0 z-20 bg-black/95 rounded-xl border border-white/20 flex flex-col p-2 animate-in fade-in zoom-in-95">
                    {/* Input Nome */}
                    <input 
                        className="w-full bg-transparent border-b border-white/20 text-xs text-center text-white outline-none mb-2 pb-1 focus:border-neon-green"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={() => updateSfx(data.id, { name: localName })}
                        autoFocus
                    />
                    
                    {/* Slider Volume Individual */}
                    <div className="flex items-center gap-1 mb-2">
                        <Volume2 size={10} className="text-text-muted"/>
                        <input 
                            type="range" min="0" max="150" 
                            value={(data.volume || 1) * 100}
                            onChange={(e) => updateSfx(data.id, { volume: e.target.value / 100 })}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex justify-between mt-auto">
                        <button 
                            onClick={() => {
                                // Troca de cor aleatória simples para exemplo
                                const colors = ['#d084ff', '#00ff9d', '#ff0055', '#00eaff', '#ffcc00'];
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
                            <Check size={12}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SFXButton;