import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import * as Icons from 'lucide-react';

const Pin = ({ data, viewScale, onMouseDown, onDoubleClick, isGM, isSelected, isGhost = false }) => {
    const { setActiveScene } = useGame();
    const [isHovered, setIsHovered] = useState(false);

    const IconComponent = Icons[data.icon] || Icons.MapPin;
    const inverseScale = Math.max(0.5, 1 / (viewScale || 1)); 

    let baseZ;
    if (isGM) { 
        baseZ = 18;
    } else {    
        baseZ = 12;
    }
    
    const zIndex = isSelected ? baseZ + 10 : baseZ;

    const handleLinkClick = (e) => {
        e.stopPropagation();
        if (data.linkedSceneId) {
            setActiveScene(data.linkedSceneId);
        }
    };

    const showTooltip = isHovered && !isSelected && !isGhost;

    const ghostStyles = isGhost ? {
        animation: 'ghost-fade-simple 1.5s ease-out forwards',
        pointerEvents: 'none',
    } : {};

    return (
        <>
            {isGhost && (
                <style>{`
                    @keyframes ghost-fade-simple {
                        from { 
                            opacity: 0.7; 
                        }
                        to { 
                            opacity: 0; 
                        }
                    }
                `}</style>
            )}

            <div
                className="absolute flex flex-col items-center group"
                style={{
                    left: data.x,
                    top: data.y,
                    transform: `translate(-50%, -100%) scale(${inverseScale})`,
                    cursor: isGhost ? 'default' : 'pointer',
                    zIndex: zIndex,
                    ...ghostStyles
                }}
                onMouseDown={(e) => { 
                    if (isGhost) return;
                    if (e.button === 1) return;
                    e.stopPropagation();
                    onMouseDown(e, data.id);
                }}
                onDoubleClick={(e) => { 
                    if (isGhost) return;
                    e.stopPropagation();
                    onDoubleClick(data);
                }}
                onMouseEnter={() => !isGhost && setIsHovered(true)}
                onMouseLeave={() => !isGhost && setIsHovered(false)}
            >
                <div 
                    className={`p-2 rounded-full shadow-lg border-2 transition-transform hover:scale-110 ${
                        isSelected 
                        ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-110' 
                        : ''
                    } ${isGhost ? '' : 'opacity-90'}`}
                    style={{
                        backgroundColor: isGhost ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0,0,0,1)',
                        borderColor: isGhost ? 'rgba(255, 255, 255, 0.3)' : (data.color || '#fff'),
                        color: isGhost ? 'white' : (data.color || '#fff'),
                        boxShadow: isGhost ? '0 0 15px rgba(255,255,255,0.2)' : undefined,
                        backdropFilter: isGhost ? 'blur(2px)' : undefined
                    }}
                >
                    <IconComponent size={24} />
                </div>

                {showTooltip && (
                    <div 
                        className="absolute bottom-full pb-2 w-48 animate-in fade-in slide-in-from-bottom-2 cursor-default"
                        style={{ zIndex: 100 }}
                        onMouseDown={(e) => {
                            if (e.button === 1) return;
                            e.stopPropagation();
                        }}
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
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Pin;