// src/components/VTT/Pins/ContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

const ContextMenu = ({ x, y, onOptionClick, onClose }) => {
    const ref = useRef(null);

    // Fecha ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                onClose();
            }
        };
        // Alterado para 'mousedown' no window para garantir que pegue cliques fora
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={ref}
            // CORREÇÃO: Adicionado 'pointer-events-auto' para permitir clique
            className="absolute z-[55] bg-ecos-bg border border-glass-border rounded-lg shadow-2xl p-1 w-40 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{ left: x, top: y }}
            // Impede que o clique no menu propague e feche o próprio menu (opcional, mas seguro)
            onMouseDown={(e) => e.stopPropagation()} 
        >
            <button 
                onClick={() => onOptionClick('add_pin')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neon-green/20 hover:text-neon-green rounded text-left transition"
            >
                <MapPin size={16} /> Adicionar Pin
            </button>
        </div>
    );
};

export default ContextMenu;