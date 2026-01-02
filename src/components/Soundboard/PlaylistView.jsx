import React, { useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Play, Music, Trash2, Plus, Clock, Loader2 } from 'lucide-react';

const PlaylistView = () => {
    const { soundboard, addTrackToPlaylist, playTrack, removeTrack } = useGame();
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const activePlaylist = soundboard.playlists[0] || { id: 'default', name: 'Geral', tracks: [] };
    const playlistId = activePlaylist.id;

    // Helper para pegar duração de forma segura
    const getAudioDuration = (file) => {
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const audio = new Audio(objectUrl);
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(audio.duration);
            };
            
            // Se der erro ou demorar demais, resolve com 0
            audio.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(0);
            };
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
            console.error("Erro ao adicionar músicas:", error);
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = null; 
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header da Playlist */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
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
                    onClick={() => !isUploading && fileInputRef.current.click()}
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
                        <tr>
                            <th className="p-2 w-8">#</th>
                            <th className="p-2">Título</th>
                            <th className="p-2 w-16 text-right"><Clock size={12} className="inline"/></th>
                            <th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {activePlaylist.tracks.map((track, index) => {
                            const isCurrent = soundboard.activeTrack?.id === track.id;
                            const isPlaying = isCurrent && soundboard.activeTrack?.isPlaying;

                            return (
                                <tr 
                                    key={track.id} 
                                    onDoubleClick={() => playTrack(track, playlistId)}
                                    className={`
                                        group border-b border-white/5 last:border-0 transition-colors cursor-pointer
                                        ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}
                                    `}
                                >
                                    <td className="p-2 text-xs text-center text-text-muted group-hover:text-white">
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
                                            <Play size={12} className="hidden group-hover:block text-white" fill="white" onClick={() => playTrack(track, playlistId)}/>
                                        </div>
                                    </td>
                                    <td className={`p-2 text-sm font-medium ${isCurrent ? 'text-neon-green' : 'text-gray-300'}`}>
                                        {track.title}
                                    </td>
                                    <td className="p-2 text-xs text-right text-text-muted font-mono">
                                        {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
                                    </td>
                                    <td className="p-2 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeTrack(playlistId, track.id); }}
                                            className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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