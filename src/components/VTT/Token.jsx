import React, { useState, useEffect } from 'react';
import { Maximize2, Loader2 } from 'lucide-react';
import { imageDB } from '../../context/db'; // Caminho corrigido

const Token = ({ data, isSelected, onMouseDown, onResizeStart }) => {
  const BASE_SIZE = 70;
  const sizePx = BASE_SIZE * (data.scale || 1);
  
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      let isMounted = true;
      const loadImg = async () => {
          if (!data.imageId && !data.imageSrc) {
              setLoading(false);
              return;
          }
          
          // Legado (Base64 antigo)
          if (data.imageSrc && data.imageSrc.startsWith('data:')) {
              if(isMounted) { setImageSrc(data.imageSrc); setLoading(false); }
              return;
          }

          // Novo (IndexedDB)
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

  return (
    <div
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, data.id); }}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
        width: `${sizePx}px`, height: `${sizePx}px`,
        position: 'absolute', top: 0, left: 0,
        zIndex: isSelected ? 20 : 10
      }}
      className="group cursor-grab active:cursor-grabbing select-none"
    >
      <div className={`w-full h-full rounded-full overflow-hidden shadow-black/50 shadow-md transition-all bg-black flex items-center justify-center ${isSelected ? 'ring-2 ring-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.5)]' : ''}`}>
         {loading ? (
             <Loader2 className="animate-spin text-neon-blue" size={20} />
         ) : (
             <img 
                src={imageSrc || 'https://via.placeholder.com/70?text=?'} 
                className="w-full h-full object-cover pointer-events-none block"
                alt=""
             />
         )}
      </div>

      <div 
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, data.id); }}
        className={`absolute -bottom-1 -right-1 w-5 h-5 bg-neon-blue rounded-full flex items-center justify-center cursor-nwse-resize text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 ${isSelected ? 'opacity-100' : ''}`}
      >
        <Maximize2 size={10} strokeWidth={3} />
      </div>
    </div>
  );
};

export default Token;