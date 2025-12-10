import React from 'react';
import { Maximize2 } from 'lucide-react';

const Token = ({ data, isSelected, onMouseDown, onResizeStart }) => {
  const BASE_SIZE = 70; // Tamanho base em pixels
  const sizePx = BASE_SIZE * (data.scale || 1);

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, data.id);
      }}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        position: 'absolute',
        top: 0, left: 0,
        zIndex: isSelected ? 20 : 10
      }}
      className="group cursor-grab active:cursor-grabbing select-none"
    >
      {/* Imagem Pura (Sem Borda Branca) */}
      <div className={`w-full h-full rounded-full overflow-hidden shadow-black/50 shadow-md transition-all ${isSelected ? 'ring-2 ring-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.5)]' : ''}`}>
         <img 
            src={data.imageSrc || 'https://via.placeholder.com/70'} 
            className="w-full h-full object-cover pointer-events-none block"
            alt=""
         />
      </div>

      {/* Alça de Redimensionamento (Bottom-Right) */}
      <div 
        onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, data.id);
        }}
        className={`
            absolute -bottom-1 -right-1 w-5 h-5 bg-neon-blue rounded-full 
            flex items-center justify-center cursor-nwse-resize text-black shadow-lg
            opacity-0 group-hover:opacity-100 transition-opacity z-30
            ${isSelected ? 'opacity-100' : ''}
        `}
      >
        <Maximize2 size={10} strokeWidth={3} />
      </div>
    </div>
  );
};

export default Token;