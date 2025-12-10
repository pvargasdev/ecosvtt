import React from 'react';
import { Maximize2 } from 'lucide-react';

const Token = ({ data, isSelected, onMouseDown, onResizeStart }) => {
  const BASE_SIZE = 70; // 1 Grid
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
      {/* Imagem (Redonda, sem borda branca) */}
      <div className={`w-full h-full rounded-full overflow-hidden shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-neon-blue shadow-neon-blue/50' : ''}`}>
         <img 
            src={data.imageSrc || 'https://via.placeholder.com/70'} 
            className="w-full h-full object-cover pointer-events-none"
            alt=""
         />
      </div>

      {/* Alça de Redimensionamento (Só aparece no Hover/Select) */}
      <div 
        onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, data.id);
        }}
        className={`
            absolute -bottom-1 -right-1 w-6 h-6 bg-neon-blue rounded-full 
            flex items-center justify-center cursor-nwse-resize text-black
            opacity-0 group-hover:opacity-100 transition-opacity
            ${isSelected ? 'opacity-100' : ''}
        `}
      >
        <Maximize2 size={12} />
      </div>
    </div>
  );
};

export default Token;