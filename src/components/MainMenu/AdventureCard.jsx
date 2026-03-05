import React, { useState, useEffect } from 'react';
import { MoreVertical, Trash2, Copy, Edit2, Image as ImageIcon, Clock, Upload } from 'lucide-react';
import { imageDB } from '../../context/db';

const NEON_COLOR = "#39ff14";

const AdventureCard = ({ adventure, onPlay, onEdit, onDuplicate, onDelete, onExport }) => {
    const [coverUrl, setCoverUrl] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    const advId = adventure?.id || "unknown";
    const advName = adventure?.name || "Sem Nome";

    useEffect(() => {
        if (!adventure?.coverImageId) return;
        
        let objectUrl = null;
        let isMounted = true;
        const loadCover = async () => {
            try {
                const blob = await imageDB.getImage(adventure.coverImageId);
                if (blob && isMounted) {
                    objectUrl = URL.createObjectURL(blob);
                    setCoverUrl(objectUrl);
                }
            } catch (e) {}
        };
        loadCover();
        return () => { 
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl); 
        };
    }, [adventure?.coverImageId]);

    const getPlaceholderGradient = (id) => {
        const colors = [
            'from-green-900/20 to-black',
            'from-zinc-900/20 to-black',
            'from-emerald-900/20 to-black',
        ];
        const code = (typeof id === 'string' ? id : String(id)).charCodeAt(0) || 0;
        const index = code % colors.length;
        return colors[index];
    };

    return (
        <div 
            className="group relative aspect-[3/4] bg-white/5 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col border border-white/5 hover:border-white/10 hover:-translate-y-1 hover:shadow-neon-green/10"
            onClick={onPlay}
            onMouseLeave={() => setShowMenu(false)}
        >
            <div className="flex-1 relative overflow-hidden bg-[#0a0a0c]">
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt={advName} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient(advId)} flex items-center justify-center`}>
                        <span className="text-5xl font-rajdhani font-bold text-white/5 uppercase select-none tracking-widest group-hover:text-white/20 transition-colors">
                            {advName.substring(0, 2)}
                        </span>
                    </div>
                )}
                
                <div className="absolute -inset-px bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-80 pointer-events-none" />
            </div>

            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    className={`p-2 rounded-full text-white transition-all backdrop-blur-md ${showMenu ? 'bg-white text-black' : 'bg-black/50 hover:bg-white hover:text-black'}`}
                >
                    <MoreVertical size={16} />
                </button>
                
                {showMenu && (
                    <div className="absolute right-0 top-10 w-48 bg-[#18181b] border border-white/10 rounded-lg shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                            <Edit2 size={14}/> Configurações
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                            <Copy size={14}/> Duplicar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onExport(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                            <Upload size={14}/> Exportar (.zip)
                        </button>
                        <div className="h-px bg-white/5 my-1.5"></div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                            <Trash2 size={14}/> Excluir
                        </button>
                    </div>
                )}
            </div>

            <div className="relative p-5 z-10 shrink-0">
                <h3 className="font-rajdhani font-bold text-gray-200 text-lg leading-tight truncate mb-1.5 transition-colors group-hover:text-neon-green">
                    {advName}
                </h3>
                
                <div className="flex items-center justify-between text-[11px] text-gray-600 font-bold uppercase tracking-wider group-hover:text-gray-400 transition-colors">
                    <span className="flex items-center gap-1.5">
                        <ImageIcon size={12} /> {adventure?.scenes?.length || 0} Cenas
                    </span>
                    {adventure?.updatedAt && (
                        <span className="flex items-center gap-1.5" title="Última modificação">
                            <Clock size={12} /> {new Date(adventure.updatedAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdventureCard;