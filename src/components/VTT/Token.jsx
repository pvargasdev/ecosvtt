import React, { useState, useEffect } from 'react';
import { Maximize2, Loader2 } from 'lucide-react';
import { imageDB } from '../../context/db';

const Token = ({ data, isSelected, onMouseDown, onResizeStart }) => {
  // A BASE_SIZE agora controla a LARGURA de referência.
  // A altura será proporcional à imagem.
  const BASE_SIZE = 70;
  const widthPx = BASE_SIZE * (data.scale || 1);
  
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

  // Estilo de Seleção:
  // Se selecionado, aplica um Drop Shadow Neon que segue o contorno da imagem (transparência).
  // Se não, aplica um drop shadow suave padrão para destacar do fundo.
  const selectionStyle = isSelected 
    ? { filter: 'drop-shadow(0 0 1px #ffffffff) drop-shadow(0 0 2px #ffffffff)' } 
    : { filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' };

  return (
    <div
      onMouseDown={(e) => { 
          // [CORREÇÃO] Permite Pan (botão do meio) através do Token
          if (e.button === 1) return;
          e.stopPropagation(); 
          onMouseDown(e, data.id); 
      }}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
        width: `${widthPx}px`, 
        // Height auto permite que a imagem dite a altura (aspect ratio correto)
        height: 'auto',
        position: 'absolute', top: 0, left: 0,
        zIndex: isSelected ? 20 : 10,
        // Aplica o filtro no container para afetar a imagem dentro (mantendo transparência)
        ...selectionStyle,
        transition: 'filter 0.2s ease-in-out'
      }}
      className="group cursor-grab active:cursor-grabbing select-none flex flex-col relative"
    >
      {loading ? (
          // Placeholder enquanto carrega (mantém quadrado para não colapsar)
          <div className="w-full aspect-square bg-black/50 rounded-lg flex items-center justify-center border border-white/20">
             <Loader2 className="animate-spin text-neon-blue" size={24} />
          </div>
      ) : (
          <img 
            src={imageSrc || 'https://via.placeholder.com/70?text=?'} 
            className="w-full h-auto object-contain pointer-events-none block select-none"
            alt="token"
            draggable={false}
          />
      )}

      {/* Alça de redimensionamento.
         Posicionada no canto inferior direito da imagem.
         O translate ajuda a centralizar a bolinha no vértice.
      */}
      <div 
        onMouseDown={(e) => { 
            // Permite pan também ao clicar na alça
            if (e.button === 1) return;
            e.stopPropagation(); 
            onResizeStart(e, data.id); 
        }}
        className={`absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center cursor-nwse-resize text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 ${isSelected ? 'opacity-100' : ''}`}
      >
        <Maximize2 size={12} strokeWidth={3} />
      </div>
      
      {/* Indicador visual simples se a imagem falhar ou for nula */}
      {!loading && !imageSrc && (
          <div className="absolute inset-0 border-2 border-red-500 bg-red-500/20 flex items-center justify-center">
              ?
          </div>
      )}
    </div>
  );
};

export default Token;