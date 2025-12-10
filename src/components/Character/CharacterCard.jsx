import React from 'react';
import { Trash2 } from 'lucide-react';

const CharacterCard = ({ char, onClick, onDelete }) => {
  
  // Configura o arrasto para o VTT
  const handleDragStart = (e) => {
    // Envia o ID e a Imagem para quem estiver ouvindo (o Mapa)
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'character',
      id: char.id,
      imageSrc: char.photo
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      draggable 
      onDragStart={handleDragStart}
      onClick={onClick}
      className="group relative flex flex-col items-center cursor-pointer transition-transform active:scale-95"
    >
      {/* Avatar Circular */}
      <div className={`w-20 h-20 rounded-full border-2 border-gray-600 p-1 bg-gray-800 group-hover:border-neon-blue group-hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all overflow-hidden`}>
        <img 
          src={char.photo || 'https://via.placeholder.com/150?text=?'} 
          alt={char.name} 
          className="w-full h-full rounded-full object-cover pointer-events-none"
        />
      </div>
      
      {/* Nome */}
      <span className="mt-2 text-sm font-rajdhani font-bold text-gray-300 group-hover:text-white uppercase tracking-wider text-center line-clamp-1 w-full">
        {char.name}
      </span>

      {/* Botão Deletar (Só aparece no hover) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
        className="absolute top-0 right-2 bg-red-600/80 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        title="Excluir"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export default CharacterCard;