import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Music, Trash2, Plus, Loader2, Search, X, GripVertical, ArrowLeft } from 'lucide-react';

// DND-KIT IMPORTS
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import AudioLibraryModal from './AudioLibraryModal';

// --- COMPONENTE DE LINHA SORTABLE (Inalterado) ---
const SortableTrackRow = ({ track, index, isCurrent, isPlaying, isDeleting, onDeleteClick, onPlayClick, onCancelDelete, onConfirmDelete, playlistId }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: track.id });

    const style = {
        transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : undefined),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
        touchAction: 'none' 
    };

    if (isDeleting) {
        return (
            <tr className="h-10 border-black bg-red-900/40 animate-in fade-in duration-150">
                <td colSpan={5} className="p-0 align-middle">
                    <div className="w-full h-full flex justify-between items-center px-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-white text-xs font-bold pl-2 flex items-center gap-2 drop-shadow-md">
                            Excluir faixa?
                        </span>
                        <div className="flex gap-1 shrink-0">
                            <button onClick={onCancelDelete} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition border border-white/10">
                                <ArrowLeft size={14}/>
                            </button>
                            <button onClick={onConfirmDelete} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white transition shadow-lg shadow-red-900/30 scale-95">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr 
            ref={setNodeRef}
            style={style}
            onClick={() => onPlayClick({ ...track, isPlaying: true }, playlistId)}
            className={`
                h-10 group border-black last:border-0 transition-colors cursor-pointer
                ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}
                ${isDragging ? 'opacity-50 bg-black/50 shadow-inner' : ''}
            `}
        >
            <td className="w-6 pl-2 align-middle">
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab active:cursor-grabbing p-1 text-white/10 hover:text-white/60 transition-colors flex justify-center"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <GripVertical size={14} />
                </div>
            </td>
            <td className="p-2 text-xs text-center text-text-muted group-hover:text-white w-8">
                <div className="w-4 flex justify-center">
                    {isPlaying ? (
                        <div className="flex gap-[2px] h-3 items-end">
                            <div className="w-[2px] bg-pink-400 animate-[bounce_1s_infinite] h-2"></div>
                            <div className="w-[2px] bg-pink-400 animate-[bounce_1.2s_infinite] h-3"></div>
                            <div className="w-[2px] bg-pink-400 animate-[bounce_0.8s_infinite] h-1"></div>
                        </div>
                    ) : (
                        <span className="">{index + 1}</span>
                    )}
                </div>
            </td>
            <td className={`p-2 text-sm font-medium truncate max-w-[160px] ${isCurrent ? 'text-pink-400' : 'text-gray-300'}`}>
                {track.title}
            </td>
            <td className="p-2 text-xs text-right text-text-muted font-mono w-16">
                {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
            </td>
            <td className="p-2 text-right w-8">
                <button 
                    onClick={onDeleteClick}
                    className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Excluir Faixa"
                >
                    <Trash2 size={12} />
                </button>
            </td>
        </tr>
    );
};

// --- COMPONENTE PRINCIPAL ---
const PlaylistView = () => {
    const { soundboard, addTrackToPlaylist, playTrack, removeTrack, reorderPlaylist } = useGame();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null); 
    const [searchQuery, setSearchQuery] = useState(""); 
    
    const activePlaylist = soundboard.playlists[0] || { id: 'default', name: 'Geral', tracks: [] };
    const playlistId = activePlaylist.id;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const getAudioDuration = (file) => {
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const audio = new Audio(objectUrl);
            audio.onloadedmetadata = () => { URL.revokeObjectURL(objectUrl); resolve(audio.duration); };
            audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(0); };
        });
    };

    const handleAddAudio = async (items) => {
        setIsUploading(true);
        try {
            for (const item of items) {
                if (item instanceof File) {
                    const duration = await getAudioDuration(item);
                    // Passamos 'music' explicitamente para o Context, se suportado, ou o Context deduz
                    await addTrackToPlaylist(playlistId, item, duration); 
                } 
                else if (typeof item === 'string') {
                    await addTrackToPlaylist(playlistId, item);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragEnd = (event) => { const { active, over } = event; if (active.id !== over.id) { const oldIndex = activePlaylist.tracks.findIndex((track) => track.id === active.id); const newIndex = activePlaylist.tracks.findIndex((track) => track.id === over.id); if (reorderPlaylist) { const newOrder = arrayMove(activePlaylist.tracks, oldIndex, newIndex); reorderPlaylist(playlistId, newOrder); } } };
    const normalizeText = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filteredTracks = activePlaylist.tracks.filter(track => normalizeText(track.title).includes(normalizeText(searchQuery)));
    const isDragEnabled = searchQuery === "";

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden" onClick={() => setDeletingId(null)}>
                {/* Header da Playlist + Busca */}
                <div className="flex flex-col border-b border-white/5 bg-white/5 shrink-0">
                    <div className="p-4 pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500/50 to-black rounded flex items-center justify-center shadow-lg">
                                <Music size={20} className="text-white/50" />
                            </div>
                            <div>
                                <h3 className="font-rajdhani font-bold text-lg text-white leading-none">Trilha Sonora</h3>
                                <p className="text-[10px] text-text-muted mt-0.5">{activePlaylist.tracks.length} faixas</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsLibraryOpen(true); }}
                            disabled={isUploading}
                            className={`px-3 py-1.5 bg-pink-500/10 text-pink-300 border border-pink-500 rounded hover:bg-pink-500 hover:text-black transition flex items-center gap-2 text-xs font-bold ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isUploading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14} />} 
                            {isUploading ? 'IMPORTANDO...' : 'ADICIONAR'}
                        </button>
                    </div>

                    <div className="px-4 pb-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={14} className="text-text-muted group-focus-within:text-white transition-colors"/>
                            </div>
                            <input 
                                type="text"
                                placeholder="Pesquisar faixa..."
                                className="block w-full pl-9 pr-8 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-text-muted focus:border-pink-400/50 focus:bg-black/60 focus:ring-1 focus:ring-pink-400/20 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute inset-y-0 right-0 pr-2 flex items-center text-text-muted hover:text-white">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lista de Faixas */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {activePlaylist.tracks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-text-muted opacity-50">
                            <Music size={48} className="mb-2 stroke-1"/>
                            <p className="text-sm">Nenhuma música adicionada.</p>
                        </div>
                    ) : filteredTracks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-text-muted opacity-50">
                            <p className="text-xs">Nenhuma faixa encontrada para "{searchQuery}".</p>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} disabled={!isDragEnabled}>
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    <SortableContext items={filteredTracks.map(t => t.id)} strategy={verticalListSortingStrategy} disabled={!isDragEnabled}>
                                        {filteredTracks.map((track, index) => {
                                            const isCurrent = soundboard.activeTrack?.id === track.id;
                                            const isPlaying = isCurrent && soundboard.activeTrack?.isPlaying;
                                            const isDeleting = deletingId === track.id;
                                            if (!isDragEnabled) return ( <tr key={track.id} onClick={() => playTrack({ ...track, isPlaying: true }, playlistId)} className={`h-10 group border-black hover:bg-white/5 cursor-pointer ${isCurrent ? 'bg-white/10' : ''}`} > <td className="w-2"></td> <td className="p-2 text-xs text-center text-text-muted w-8">{index + 1}</td> <td className={`p-2 text-sm font-medium truncate max-w-[180px] ${isCurrent ? 'text-pink-400' : 'text-gray-300'}`}>{track.title}</td> <td className="p-2 text-xs text-right text-text-muted font-mono w-16">{Math.floor(track.duration/60)}:{(Math.floor(track.duration%60)).toString().padStart(2,'0')}</td> <td className="p-2 text-right w-8"></td> </tr> );
                                            return <SortableTrackRow key={track.id} track={track} index={index} isCurrent={isCurrent} isPlaying={isPlaying} isDeleting={isDeleting} playlistId={playlistId} onPlayClick={playTrack} onDeleteClick={(e) => { e.stopPropagation(); setDeletingId(track.id); }} onCancelDelete={(e) => { e.stopPropagation(); setDeletingId(null); }} onConfirmDelete={(e) => { e.stopPropagation(); removeTrack(playlistId, track.id); setDeletingId(null); }} />
                                        })}
                                    </SortableContext>
                                </tbody>
                            </table>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* MODAL DE IMPORTAÇÃO CONFIGURADO PARA MUSICA */}
            <AudioLibraryModal 
                isOpen={isLibraryOpen}
                category="music" // <--- CONFIGURAÇÃO EXPLICITA
                onClose={() => setIsLibraryOpen(false)}
                onSelect={handleAddAudio}
                acceptMultiple={true}
            />
        </>
    );
};

export default PlaylistView;