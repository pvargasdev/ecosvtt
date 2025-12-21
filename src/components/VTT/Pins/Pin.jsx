import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import * as Icons from 'lucide-react';

const Pin = ({ data, viewScale, onMouseDown, onDoubleClick, isPlayerView }) => {
    const { setActiveScene } = useGame();
    const [isHovered, setIsHovered] = useState(false);

    const IconComponent = Icons[data.icon] || Icons.MapPin;
    const inverseScale = Math.max(0.5, 1 / (viewScale || 1)); 

    // [CORREÇÃO 3] Z-Index Dinâmico
    // Se for Visão do Jogador (isPlayerView=true): Z=10 (Abaixo do Fog 15)
    // Se for Visão do Mestre (isPlayerView=false): Z=25 (Acima do Fog 15)
    const zIndex = isPlayerView ? 10 : 25;

    const handleLinkClick = (e) => {
        e.stopPropagation();
        if (data.linkedSceneId) {
            setActiveScene(data.linkedSceneId);
        }
    };

    return (
        <div
            className="absolute flex flex-col items-center group"
            style={{
                left: data.x,
                top: data.y,
                transform: `translate(-50%, -100%) scale(${inverseScale})`,
                cursor: 'pointer',
                zIndex: zIndex
            }}
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, data.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(data); }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Ícone */}
            <div 
                className={`p-2 rounded-full shadow-lg border-2 transition-transform hover:scale-110 ${!data.visibleToPlayers ? 'opacity-50 border-dashed' : 'opacity-100'}`}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    borderColor: data.color || '#fff',
                    color: data.color || '#fff'
                }}
            >
                <IconComponent size={24} />
            </div>

            {/* Tooltip */}
            {isHovered && (
                <div 
                    // [CORREÇÃO 4] Padding-bottom para fechar o gap entre o pin e a caixa
                    // mb-2 removido, pb-2 adicionado
                    className="absolute bottom-full pb-2 w-48 animate-in fade-in slide-in-from-bottom-2 cursor-default"
                    style={{ zIndex: 100 }} // Sempre acima
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="bg-black/90 border border-glass-border p-3 rounded-lg shadow-2xl text-left">
                        <h4 className="font-rajdhani font-bold text-white text-sm border-b border-white/10 pb-1 mb-1">{data.title}</h4>
                        {data.description && (
                            <p className="text-xs text-text-muted mb-2 leading-relaxed">{data.description}</p>
                        )}
                        
                        {data.linkedSceneId && (
                            <button 
                                onClick={handleLinkClick}
                                className="w-full py-1.5 bg-neon-blue/20 border border-neon-blue text-neon-blue text-xs font-bold rounded hover:bg-neon-blue hover:text-black transition flex items-center justify-center gap-1 mt-1"
                            >
                                <Icons.ArrowRightCircle size={12} /> Ir para Cena
                            </button>
                        )}

                        {!isPlayerView && !data.visibleToPlayers && (
                            <div className="mt-1 text-[10px] text-yellow-500 flex items-center gap-1">
                                <Icons.EyeOff size={10} /> Visível apenas para GM
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pin;