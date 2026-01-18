import React, { useState, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { Music, Trash2, Plus, Loader2, Search, X, ArrowLeft, Link2Off, Folder, FolderPlus, CornerLeftUp, Check } from 'lucide-react';
import AudioLibraryModal from './AudioLibraryModal';

// Componente individual da faixa/pasta (Baseado no SceneItem do VTTLayout)
const TrackItem = ({ track, isCurrent, isPlaying, isDeleting, onDeleteClick, onPlayClick, onCancelDelete, onConfirmDelete, playlistId, isMissing, onEnterFolder, onMove }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const isFolder = track.type === 'folder';

    const handleDragStart = (e) => {
        if (isDeleting) {
            e.preventDefault();
            return;
        }
        // Configura os dados do arraste (igual ao VTTLayout)
        e.dataTransfer.setData('application/json', JSON.stringify({ 
            type: 'playlist_item', 
            id: track.id,
            isFolder: isFolder 
        }));
        e.dataTransfer.effectAllowed = 'move';
        
        // Imagem fantasma padrão do navegador
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFolder) setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        if (!isFolder) return;

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            // Só move se for um item de playlist e não for ele mesmo
            if (data.type === 'playlist_item' && data.id !== track.id) {
                onMove(playlistId, data.id, track.id);
            }
        } catch (err) {
            console.error("Erro no drop:", err);
        }
    };

    if (isDeleting) {
        return (
            <div className="h-10 px-2 mb-1 rounded bg-red-900/30 border border-red-500/50 flex justify-between items-center animate-in fade-in select-none">
                <span className="text-white text-xs font-bold pl-1 truncate">
                    Excluir {isFolder ? 'Pasta' : 'Faixa'}?
                </span>
                <div className="flex gap-1 shrink-0 items-center">
                    <button onClick={(e)=>{e.stopPropagation(); onCancelDelete(e);}} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white flex items-center"><ArrowLeft size={14}/></button>
                    <button onClick={(e)=>{e.stopPropagation(); onConfirmDelete(e);}} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white flex items-center"><Check size={14}/></button>
                </div>
            </div>
        );
    }

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
                e.stopPropagation();
                if (isFolder) onEnterFolder(track.id);
                else if (!isMissing) onPlayClick({ ...track, isPlaying: true }, playlistId);
            }}
            className={`
                flex items-center px-2 py-2 mb-1 cursor-pointer border-l-2 group rounded select-none relative gap-3 min-h-[40px] transition-all
                ${isDragOver 
                    ? 'bg-pink-500/20 border-pink-500 scale-[1.01] z-10 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                    : isCurrent 
                        ? 'border-pink-500 bg-white/5' 
                        : 'border-transparent hover:bg-white/5 hover:border-white/20'
                }
                ${isMissing ? 'opacity-60 bg-red-900/10' : ''}
            `}
        >
            {/* Ícone / Status */}
            <div className="w-5 flex justify-center shrink-0">
                {isFolder ? (
                    <Folder size={18} className={`${isDragOver ? 'text-pink-300 scale-110' : 'text-pink-500'}`} fill={isDragOver ? "currentColor" : "none"}/>
                ) : isMissing ? (
                    <Link2Off size={16} className="text-red-500" />
                ) : isPlaying ? (
                    <div className="flex gap-[2px] h-3 items-end">
                        <div className="w-[2px] bg-pink-400 animate-[bounce_1s_infinite] h-2"></div>
                        <div className="w-[2px] bg-pink-400 animate-[bounce_1.2s_infinite] h-3"></div>
                        <div className="w-[2px] bg-pink-400 animate-[bounce_0.8s_infinite] h-1"></div>
                    </div>
                ) : (
                    <Music size={14} className="text-text-muted group-hover:text-white"/>
                )}
            </div>

            {/* Nome */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className={`text-sm font-medium truncate leading-tight ${isCurrent && !isFolder ? 'text-pink-400' : 'text-gray-300 group-hover:text-white'} ${isFolder ? 'font-bold text-white' : ''}`}>
                    {track.title}
                </span>
            </div>

            {/* Duração (se não for pasta) */}
            {!isFolder && (
                <div className="text-xs text-text-muted font-mono shrink-0 w-10 text-right">
                     {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
                </div>
            )}

            {/* Botão Deletar (Hover) */}
            <div className="absolute right-2 bg-black/80 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                <button 
                    onClick={onDeleteClick}
                    className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                    title={isFolder ? "Excluir Pasta" : "Excluir Faixa"}
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

const PlaylistView = () => {
    const { soundboard, addTrackToPlaylist, addTrackFolder, moveTrackItem, playTrack, removeTrack, availableFiles } = useGame();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null); 
    const [searchQuery, setSearchQuery] = useState(""); 
    
    // NAVEGAÇÃO DE PASTAS
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isBreadcrumbActive, setIsBreadcrumbActive] = useState(false);
    
    const activePlaylist = soundboard.playlists[0] || { id: 'default', name: 'Geral', tracks: [] };
    const playlistId = activePlaylist.id;

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
                    await addTrackToPlaylist(playlistId, item, duration, currentFolderId); 
                } 
                else if (typeof item === 'string') {
                    await addTrackToPlaylist(playlistId, item, 0, currentFolderId);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateFolder = () => {
        addTrackFolder(playlistId, "Nova Pasta", currentFolderId);
    };

    // Lógica do Drop no Breadcrumb (Voltar nível)
    const handleDropOnBreadcrumb = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBreadcrumbActive(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'playlist_item') {
                const currentFolder = activePlaylist.tracks.find(t => t.id === currentFolderId);
                const targetId = currentFolder ? (currentFolder.parentId || null) : null;
                
                // Só move se o destino for diferente da pasta atual do item
                // (O item já está na pasta 'currentFolderId', queremos movê-lo para 'targetId')
                if (data.id !== targetId) {
                    moveTrackItem(playlistId, data.id, targetId);
                }
            }
        } catch (err) {
            console.error("Erro drop breadcrumb:", err);
        }
    };

    const normalizeText = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    // FILTRAGEM E ORDENAÇÃO
    let displayTracks = [];
    if (searchQuery) {
        displayTracks = activePlaylist.tracks.filter(track => normalizeText(track.title).includes(normalizeText(searchQuery)));
    } else {
        displayTracks = activePlaylist.tracks.filter(track => {
            const pId = track.parentId || null;
            return pId === currentFolderId;
        });
    }

    // ORDENAÇÃO IGUAL AO SCENESELECTOR (Pastas > Arquivos, Alfabética)
    displayTracks.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    });

    const currentFolderName = currentFolderId 
        ? activePlaylist.tracks.find(t => t.id === currentFolderId)?.title || "Pasta"
        : "";

    const showBreadcrumb = currentFolderId !== null && !searchQuery;

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden" onClick={() => setDeletingId(null)}>
                <div className="flex flex-col border-b border-white/5 bg-white/5 shrink-0">
                    <div className="p-4 pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500/50 to-black rounded flex items-center justify-center shadow-lg">
                                <Music size={20} className="text-white/50" />
                            </div>
                            <div>
                                <h3 className="font-rajdhani font-bold text-lg text-white leading-none">Trilha Sonora</h3>
                                <p className="text-[10px] text-text-muted mt-0.5">{activePlaylist.tracks.length} itens</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCreateFolder(); }}
                                className="px-2 py-1.5 bg-white/5 text-pink-300 border border-white/10 rounded hover:bg-white/10 hover:text-white transition flex items-center gap-2 text-xs font-bold"
                                title="Nova Pasta"
                            >
                                <FolderPlus size={14} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsLibraryOpen(true); }}
                                disabled={isUploading}
                                className={`px-3 py-1.5 bg-pink-500/10 text-pink-300 border border-pink-500 rounded hover:bg-pink-500 hover:text-black transition flex items-center gap-2 text-xs font-bold ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isUploading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14} />} 
                                {isUploading ? '...' : 'ADICIONAR'}
                            </button>
                        </div>
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

                {/* Breadcrumb Navigation (Igual ao SceneSelector) */}
                <div 
                    className={`
                        border-b transition-all duration-200 ease-in-out shrink-0 z-10 flex items-center px-2 gap-2 text-xs relative overflow-hidden
                        ${showBreadcrumb ? 'max-h-12 opacity-100 py-2 translate-y-0' : 'max-h-0 opacity-0 py-0 -translate-y-2 pointer-events-none'}
                        ${isBreadcrumbActive 
                            ? 'bg-pink-500/20 border-pink-500 shadow-[inset_0_0_10px_rgba(236,72,153,0.3)]' 
                            : 'bg-black/40 border-glass-border'
                        }
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsBreadcrumbActive(true); }}
                    onDragLeave={() => setIsBreadcrumbActive(false)}
                    onDrop={handleDropOnBreadcrumb}
                >
                    <button 
                        onClick={() => {
                                const curr = activePlaylist.tracks.find(t => t.id === currentFolderId);
                                setCurrentFolderId(curr?.parentId || null);
                        }}
                        className="p-1.5 bg-white/10 rounded hover:bg-white/20 text-white flex items-center gap-1 transition-colors shrink-0 z-10"
                        title="Voltar"
                    >
                        <CornerLeftUp size={14}/>
                    </button>
                    <div className="flex-1 min-w-0 z-10">
                        <div className="text-[10px] text-pink-500 uppercase font-bold leading-none mb-0.5">Pasta Atual</div>
                        <div className="font-mono text-white truncate leading-none font-bold">{currentFolderName}</div>
                    </div>
                    {isBreadcrumbActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-pink-500 text-[10px] uppercase pointer-events-none backdrop-blur-[1px]">
                            Mover para Pasta Acima
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {activePlaylist.tracks.length === 0 && !searchQuery ? (
                        <div className="flex flex-col items-center justify-center h-40 text-text-muted opacity-50">
                            <Music size={48} className="mb-2 stroke-1"/>
                            <p className="text-sm">Nenhuma música adicionada.</p>
                        </div>
                    ) : displayTracks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-text-muted opacity-50">
                            <p className="text-xs">{searchQuery ? `Nada encontrado para "${searchQuery}"` : "Pasta vazia."}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {displayTracks.map((track) => {
                                const isCurrent = soundboard.activeTrack?.id === track.id;
                                const isPlaying = isCurrent && soundboard.activeTrack?.isPlaying;
                                const isDeleting = deletingId === track.id;
                                const isMissing = track.type !== 'folder' && track.fileId && availableFiles && !availableFiles.has(track.fileId);

                                return (
                                    <TrackItem 
                                        key={track.id} 
                                        track={track} 
                                        isCurrent={isCurrent} 
                                        isPlaying={isPlaying} 
                                        isDeleting={isDeleting} 
                                        playlistId={playlistId} 
                                        isMissing={isMissing} 
                                        onPlayClick={playTrack} 
                                        onEnterFolder={setCurrentFolderId}
                                        onMove={moveTrackItem}
                                        onDeleteClick={(e) => { e.stopPropagation(); setDeletingId(track.id); }} 
                                        onCancelDelete={(e) => { e.stopPropagation(); setDeletingId(null); }} 
                                        onConfirmDelete={(e) => { e.stopPropagation(); removeTrack(playlistId, track.id); setDeletingId(null); }} 
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <AudioLibraryModal 
                isOpen={isLibraryOpen}
                category="music"
                onClose={() => setIsLibraryOpen(false)}
                onSelect={handleAddAudio}
                acceptMultiple={true}
            />
        </>
    );
};

export default PlaylistView;