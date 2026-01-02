import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Music, Trash2, Plus, Clock, Loader2, ArrowLeft, Check, X } from 'lucide-react';

const PlaylistView = () => {
    const { soundboard, addTrackToPlaylist, playTrack, removeTrack } = useGame();
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null); 
    
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

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setIsUploading(true);
        try {
            for (const file of files) {
                const duration = await getAudioDuration(file);
                await addTrackToPlaylist(playlistId, file, duration);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = null; 
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden" onClick={() => setDeletingId(null)}>
            {/* Header da Playlist */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-900 to-black rounded flex items-center justify-center shadow-lg">
                        <Music className="text-white/50" />
                    </div>
                    <div>
                        <h3 className="font-rajdhani font-bold text-xl text-white">Trilha Sonora</h3>
                        <p className="text-xs text-text-muted">{activePlaylist.tracks.length} faixas</p>
                    </div>
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); !isUploading && fileInputRef.current.click(); }}
                    disabled={isUploading}
                    className={`px-3 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded hover:bg-neon-green hover:text-black transition flex items-center gap-2 text-xs font-bold ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                    {isUploading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14} />} 
                    {isUploading ? 'PROCESSANDO...' : 'ADICIONAR'}
                </button>
                <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden" onChange={handleUpload}/>
            </div>

            {/* Lista de Faixas */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {activePlaylist.tracks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-text-muted opacity-50">
                        <Music size={48} className="mb-2 stroke-1"/>
                        <p className="text-sm">Nenhuma música adicionada.</p>
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead className="text-xs text-text-muted uppercase border-b border-white/5 sticky top-0 bg-[#121216] z-10">
                    </thead>
                    <tbody>
                        {activePlaylist.tracks.map((track, index) => {
                            const isCurrent = soundboard.activeTrack?.id === track.id;
                            const isPlaying = isCurrent && soundboard.activeTrack?.isPlaying;
                            const isDeleting = deletingId === track.id;

                            // RENDERIZAÇÃO DO MODO DE EXCLUSÃO (Fundo Vermelho Reforçado)
                            if (isDeleting) {
                                return (
                                    <tr key={track.id} className="h-10 border-b border-red-500/30 bg-red-900/40 animate-in fade-in duration-150">
                                        <td colSpan={4} className="p-0 align-middle">
                                            <div 
                                                className="w-full h-full flex justify-between items-center px-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="text-white text-xs font-bold pl-2 flex items-center gap-2">
                                                    Excluir faixa?
                                                </span>
                                                <div className="flex gap-1 shrink-0">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setDeletingId(null); }} 
                                                        className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition border border-white/10"
                                                        title="Cancelar"
                                                    >
                                                        <ArrowLeft size={14}/>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            removeTrack(playlistId, track.id); 
                                                            setDeletingId(null); 
                                                        }} 
                                                        className="p-1 rounded bg-red-600 hover:bg-red-500 text-white transition shadow-lg shadow-red-900/30 border border-white/10"
                                                        title="Confirmar Exclusão"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            // RENDERIZAÇÃO NORMAL DA LINHA
                            return (
                                <tr 
                                    key={track.id} 
                                    onClick={() => playTrack(track, playlistId)}
                                    className={`
                                        h-10 group border-b border-white/5 last:border-0 transition-colors cursor-pointer
                                        ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <td className="p-2 text-xs text-center text-text-muted group-hover:text-white w-8">
                                        <div className="w-4 flex justify-center">
                                            {isPlaying ? (
                                                <div className="flex gap-[2px] h-3 items-end">
                                                    <div className="w-[2px] bg-neon-green animate-[bounce_1s_infinite] h-2"></div>
                                                    <div className="w-[2px] bg-neon-green animate-[bounce_1.2s_infinite] h-3"></div>
                                                    <div className="w-[2px] bg-neon-green animate-[bounce_0.8s_infinite] h-1"></div>
                                                </div>
                                            ) : (
                                                <span className="group-hover:hidden">{index + 1}</span>
                                            )}
                                            <Play size={12} className={`hidden group-hover:block ${isCurrent ? 'text-neon-green' : 'text-white'}`} fill="currentColor"/>
                                        </div>
                                    </td>
                                    <td className={`p-2 text-sm font-medium truncate max-w-[180px] ${isCurrent ? 'text-neon-green' : 'text-gray-300'}`}>
                                        {track.title}
                                    </td>
                                    <td className="p-2 text-xs text-right text-text-muted font-mono w-16">
                                        {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
                                    </td>
                                    <td className="p-2 text-right w-8">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setDeletingId(track.id);
                                            }}
                                            className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="Excluir Faixa"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlaylistView;