import React, { useState, useEffect } from 'react';
import { Maximize2, Loader2 } from 'lucide-react';
import { imageDB } from '../../context/db';

// CONFIGURAÇÕES DE ANIMAÇÃO
const ANIMATION_SPEED_ROTATION = '0.4s'; // Tempo da rotação (suave)
const ANIMATION_SPEED_FLIP = '0.3s';     // Tempo do flip (rápido)
const ANIMATION_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Curva suave

const Token = ({ data, isSelected, onMouseDown, onResizeStart }) => {
  const BASE_SIZE = 70;
  const widthPx = BASE_SIZE * (data.scale || 1);
  
  const rotation = data.rotation || 0;
  const isFlipped = data.mirrorX || false;

  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      let isMounted = true;
      const loadImg = async () => {
          if (!data.imageId && !data.imageSrc) {
              setLoading(false);
              return;
          }
          
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

      return () => {
          isMounted = false;
          if (imageSrc && !imageSrc.startsWith('data:')) {
              URL.revokeObjectURL(imageSrc);
          }
      };
  }, [data.imageId, data.imageSrc]);

  const selectionStyle = isSelected 
    ? { filter: 'drop-shadow(0 0 0.25px #ffffffff) drop-shadow(0 0 0.5px #ffffffff)' } 
    : { filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' };

  return (
    // 1. CONTAINER EXTERNO: POSIÇÃO E INTERAÇÃO GERAL
    // Contém a classe 'group' para controlar o hover da alça
    <div
      onMouseDown={(e) => { 
          if (e.button === 1) return;
          e.stopPropagation(); 
          onMouseDown(e, data.id); 
      }}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`, // Apenas Posição
        width: `${widthPx}px`, 
        height: 'auto',
        position: 'absolute', top: 0, left: 0,
        zIndex: isSelected ? 20 : 10,
      }}
      className="group select-none relative"
    >
      {/* 2. CONTAINER INTERNO: ROTAÇÃO (COM TRANSIÇÃO) 
          Apenas a imagem e o loader giram. */}
      <div
        className="cursor-grab active:cursor-grabbing w-full h-full flex flex-col relative"
        style={{
            transform: `rotate(${rotation}deg)`, // Apenas Rotação
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
                    // 3. IMAGEM: FLIP
                    transform: `scaleX(${isFlipped ? -1 : 1})`,
                    transition: `transform ${ANIMATION_SPEED_FLIP} ${ANIMATION_EASING}`
                }}
                alt="token"
                draggable={false}
              />
          )}
          
          {/* Indicador de erro gira junto com o token */}
          {!loading && !imageSrc && (
              <div className="absolute inset-0 border-2 border-red-500 bg-red-500/20 flex items-center justify-center">?</div>
          )}
      </div>

      {/* 3. ALÇA DE REDIMENSIONAMENTO (FORA DA ROTAÇÃO) 
          Agora ela é filha direta do container de posição, então não gira. */}
      <div 
        onMouseDown={(e) => { 
            if (e.button === 1) return;
            e.stopPropagation(); 
            onResizeStart(e, data.id); 
        }}
        className={`absolute -bottom-2 -right-2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center cursor-nwse-resize text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 ${isSelected ? 'opacity-100' : ''}`}
      >
        {/* Adicionei o className="rotate-90" aqui */}
        <Maximize2 size={8} strokeWidth={3} color='white' className="rotate-90" />
      </div>
    </div>
  );
};

export default Token;