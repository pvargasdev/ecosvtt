import React, { useState, useEffect } from 'react';
import { Maximize2, Loader2 } from 'lucide-react';
import { imageDB } from '../../context/db';

// CONFIGURAÇÕES
const ANIMATION_SPEED_ROTATION = '0.4s';
const ANIMATION_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

const Token = ({ data, isSelected, isDragging, onMouseDown, onResizeStart }) => {
  const BASE_SIZE = 70;
  const widthPx = BASE_SIZE * (data.scale || 1);
  const rotation = data.rotation || 0;
  const isFlipped = data.mirrorX || false;

  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      let isMounted = true;
      const loadImg = async () => {
          if (!data.imageId && !data.imageSrc) { setLoading(false); return; }
          if (data.imageSrc && data.imageSrc.startsWith('data:')) {
              if(isMounted) { setImageSrc(data.imageSrc); setLoading(false); }
              return;
          }
          if (data.imageId) {
              const blob = await imageDB.getImage(data.imageId);
              if (isMounted && blob) {
                  const url = URL.createObjectURL(blob);
                  setImageSrc(url);
              }
          }
          if (isMounted) setLoading(false);
      };
      loadImg();
      return () => { isMounted = false; if (imageSrc && !imageSrc.startsWith('data:')) URL.revokeObjectURL(imageSrc); };
  }, [data.imageId, data.imageSrc]);

  const selectionStyle = isSelected 
    ? { filter: 'drop-shadow(0 0 0.25px #ffffffff) drop-shadow(0 0 0.5px #ffffffff)' } 
    : { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' };

  // --- LÓGICA CRÍTICA DE MOVIMENTO ---
  // 1. Se isDragging (Tela Ativa): 'none' -> Resposta imediata, zero delay.
  // 2. Se !isDragging (Tela Passiva): 'transform 0.15s' -> Suaviza os "pulos" da rede.
  const positionTransition = isDragging ? 'none' : 'transform 0.07s linear';

  return (
    <div
      onMouseDown={(e) => { 
          if (e.button === 1) return;
          e.stopPropagation(); 
          onMouseDown(e, data.id); 
      }}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
        width: `${widthPx}px`, 
        height: 'auto',
        position: 'absolute', top: 0, left: 0,
        zIndex: isSelected ? 20 : 10,
        
        // APLICAÇÃO DA TRANSIÇÃO CONDICIONAL
        transition: positionTransition,
        
        willChange: 'transform' // Otimização de GPU
      }}
      className="group select-none relative"
    >
      {/* Container de Rotação (Mantém animação suave sempre) */}
      <div
        className="cursor-grab active:cursor-grabbing w-full h-full flex flex-col relative"
        style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: `transform ${ANIMATION_SPEED_ROTATION} ${ANIMATION_EASING}, filter 0.2s ease-in-out`,
            ...selectionStyle
        }}
      >
          {loading ? (
              <div className="w-full aspect-square bg-black/50 rounded-lg flex items-center justify-center border border-white/20">
                 <Loader2 className="animate-spin text-neon-blue" size={24} />
              </div>
          ) : (
              <img 
                src={imageSrc || 'https://via.placeholder.com/70?text=?'} 
                className="w-full h-auto object-contain pointer-events-none block select-none"
                style={{
                    transform: `scaleX(${isFlipped ? -1 : 1})`,
                    transition: `transform 0.3s ${ANIMATION_EASING}`
                }}
                alt="token"
                draggable={false}
              />
          )}
          {!loading && !imageSrc && (
              <div className="absolute inset-0 border-2 border-red-500 bg-red-500/20 flex items-center justify-center">?</div>
          )}
      </div>

      {/* Alça de Redimensionamento */}
      <div 
        onMouseDown={(e) => { 
            if (e.button === 1) return;
            e.stopPropagation(); 
            onResizeStart(e, data.id); 
        }}
        className={`absolute -bottom-2 -right-2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center cursor-nwse-resize text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 ${isSelected ? 'opacity-100' : ''}`}
      >
        <Maximize2 size={8} strokeWidth={3} color='white' className="rotate-90" />
      </div>
    </div>
  );
};

export default Token;