import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

const ContextMenu = ({ x, y, onOptionClick, onClose }) => {
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                onClose();
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={ref}
            className="absolute z-[200] bg-ecos-bg border border-glass-border rounded-lg shadow-2xl p-1 w-40 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{ left: x, top: y }}
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