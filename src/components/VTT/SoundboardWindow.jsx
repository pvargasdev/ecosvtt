import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import { 
    X, Folder, FolderPlus, CornerLeftUp, Music, Speaker, 
    Volume2, Square, Play, Pause, Trash2, Edit2, 
    Clock, Settings2
} from 'lucide-react';

// --- COMPONENTES AUXILIARES ---

const WindowWrapper = ({ children, className, containerRef }) => (
    <div 
        ref={containerRef} data-ecos-window="true" className={`pointer-events-auto ${className}`} 
        onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
        {children}
    </div>
);

const AudioThumb = ({ item, onRename, onDelete, moveItem, onClick, isPlaying }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(item.name || "");
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    
    const handleDragStart = (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'audio_library_item', libraryId: item.id }));
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (item.type !== 'folder') return;
        const dataString = e.dataTransfer.getData('application/json');
        if (!dataString) return;
        const data = JSON.parse(dataString);
        if (data.type === 'audio_library_item' && data.libraryId !== item.id) moveItem(data.libraryId, item.id);
    };

    const isFolder = item.type === 'folder';
    const isMusic = item.category === 'music';
    let iconColor = "text-yellow-500"; 
    if (!isFolder) iconColor = isMusic ? "text-neon-blue" : "text-orange-500";

    return (
        <div 
            draggable onDragStart={handleDragStart} onDragOver={(e) => { if(isFolder) e.preventDefault(); }} onDrop={handleDrop}
            onClick={() => !isRenaming && !isConfirmingDelete && onClick(item)} onMouseLeave={() => setIsConfirmingDelete(false)}
            className={`aspect-square rounded-xl border-2 transition-all duration-200 group relative flex flex-col items-center justify-center cursor-pointer h-full w-full select-none ${isPlaying ? 'border-neon-green bg-neon-green/10 shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'bg-white/5 border-glass-border hover:border-white'} ${isConfirmingDelete ? 'border-red-500 bg-red-900/20' : ''}`}
        >
            <div className={`mb-1 transition-transform group-hover:scale-110 ${iconColor}`}>
                {isFolder ? <Folder size={32} /> : (isMusic ? (isPlaying ? <Pause size={32} className="animate-pulse"/> : <Music size={32} />) : <Speaker size={32} />)}
            </div>
            {isRenaming ? (
                <input autoFocus className="w-[90%] bg-black/50 border border-white/50 text-xs text-white text-center rounded px-1 outline-none z-20" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { onRename(item.id, renameVal); setIsRenaming(false); } }} onBlur={() => { onRename(item.id, renameVal); setIsRenaming(false); }} onClick={(e) => e.stopPropagation()}/>
            ) : (
                <span className="text-[10px] truncate w-full text-center px-1 text-text-muted group-hover:text-white transition-colors">{item.name}</span>
            )}
            <div className={`absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-1 bg-black/60 rounded text-white hover:text-yellow-400 backdrop-blur-sm"><Edit2 size={10}/></button>
                <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }} className={`p-1 rounded text-white backdrop-blur-sm ${isConfirmingDelete ? 'bg-red-600' : 'bg-black/60 hover:bg-red-600'}`}><Trash2 size={10}/></button>
            </div>
            {isConfirmingDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/80 rounded-xl text-white font-bold text-xs animate-in fade-in">Confirmar?</button>}
        </div>
    );
};

// --- PLAYER BAR (Atualizado: Sem input de fade, apenas display e controle de tempo) ---
const PlayerBar = ({ trackName, isPlaying, onPlayPause, duration, currentTime, onSeek }) => {
    const formatTime = (secs) => {
        if (!secs || isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="p-3 bg-[#0a0a0e] border-t border-glass-border animate-in slide-in-from-bottom-2 shrink-0 z-20 shadow-up-lg">
            {/* Info e Controles Principais */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[10px] text-neon-blue font-bold uppercase tracking-wider flex items-center gap-1"><Music size={10}/> Tocando Agora</span>
                    <span className="text-white font-rajdhani font-bold truncate text-sm" title={trackName}>{trackName}</span>
                </div>
                <button 
                    onClick={onPlayPause}
                    className={`p-3 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg ${isPlaying ? 'bg-neon-green text-black' : 'bg-white text-black'}`}
                >
                    {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" className="ml-0.5"/>}
                </button>
            </div>

            {/* Barra de Progresso */}
            <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
                <span className="w-8 text-right">{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-green hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                />
                <span className="w-8">{formatTime(duration)}</span>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const SoundboardWindow = ({ isOpen, onClose }) => {
    const { activeAdventure, addAudioToLibrary, addAudioFolder, removeAudioFromLibrary, moveAudioItem, renameAudioItem } = useGame();
    const { 
        playMusic, playSFX, pauseMusic, stopAll, 
        musicVolume, setMusicVolume, 
        sfxVolume, setSfxVolume,
        currentMusicId, isPlaying,
        currentTime, trackDuration, seekMusic,
        crossfadeDuration, setCrossfadeDuration
    } = useAudio();

    const [activeTab, setActiveTab] = useState('music'); 
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const fileInputRef = useRef(null);
    const windowRef = useRef(null);

    useEffect(() => { if (!isOpen) setCurrentFolderId(null); }, [isOpen]);
    useEffect(() => { setCurrentFolderId(null); }, [activeTab]);

    if (!isOpen) return null;

    const currentItems = activeAdventure?.audioLibrary?.filter(item => item.parentId === currentFolderId && item.category === activeTab) || [];
    currentItems.sort((a, b) => (a.type === 'folder' && b.type !== 'folder') ? -1 : (a.type !== 'folder' && b.type === 'folder' ? 1 : 0));
    
    const currentFolder = activeAdventure?.audioLibrary?.find(t => t.id === currentFolderId);
    const playingTrack = activeAdventure?.audioLibrary?.find(t => t.audioId === currentMusicId);

    const handleFileUpload = (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        for (let i = 0; i < files.length; i++) addAudioToLibrary(files[i], currentFolderId, activeTab);
        e.target.value = '';
    };

    const handleWindowDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length) for (let i = 0; i < files.length; i++) addAudioToLibrary(files[i], currentFolderId, activeTab);
    };

    const handleItemClick = (item) => {
        if (item.type === 'folder') { setCurrentFolderId(item.id); } 
        else {
            if (item.category === 'music') playMusic(item.audioId);
            else playSFX(item.audioId);
        }
    };

    const handlePlayPauseToggle = () => {
        if (isPlaying) pauseMusic();
        else if (currentMusicId) playMusic(currentMusicId); 
    };

    const accentColor = activeTab === 'music' ? 'text-neon-blue' : 'text-orange-500';

    return (
        <WindowWrapper containerRef={windowRef} className={`absolute top-24 right-4 w-[340px] bg-[#121216]/95 border border-glass-border backdrop-blur-md rounded-xl flex flex-col max-h-[85vh] z-40 shadow-2xl origin-top-right animate-in fade-in zoom-in-95 overflow-hidden`}>
            
            {/* Header & Global Controls */}
            <div className="p-3 border-b border-glass-border bg-black/40 shrink-0 space-y-3" onDragOver={e => e.preventDefault()} onDrop={handleWindowDrop}>
                {/* Título e Botões de Janela */}
                <div className="flex justify-between items-center">
                    <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                        <Speaker size={18} className={accentColor}/> SOUNDBOARD
                    </h3>
                    <div className="flex gap-1">
                        <button onClick={stopAll} className="p-1 px-2 bg-red-900/50 border border-red-500/30 rounded text-red-400 hover:bg-red-600 hover:text-white text-[10px] font-bold transition flex items-center gap-1">
                            <Square size={10} fill="currentColor"/> STOP
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white">
                            <X size={16}/>
                        </button>
                    </div>
                </div>

                {/* Controles de Volume e Fade */}
                <div className="bg-white/5 rounded-lg p-3 space-y-3 border border-white/5">
                    {/* Volume Música */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-neon-blue font-bold uppercase"><span>Música</span><span>{Math.round(musicVolume * 100)}%</span></div>
                        <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-blue"/>
                    </div>
                    
                    {/* Volume SFX */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-orange-500 font-bold uppercase"><span>SFX</span><span>{Math.round(sfxVolume * 100)}%</span></div>
                        <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={e => setSfxVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"/>
                    </div>

                    {/* [NOVO] Slider de Fade Duration */}
                    <div className="space-y-1 pt-1 border-t border-white/5">
                         <div className="flex justify-between text-[10px] text-text-muted font-bold uppercase">
                            <span className="flex items-center gap-1"><Clock size={10}/> Fade Duration</span>
                            <span className="text-white">{(crossfadeDuration / 1000).toFixed(1)}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="5000" // Máximo de 5 segundos
                            step="500" // Passos de 0.5s
                            value={crossfadeDuration} 
                            onChange={e => setCrossfadeDuration(parseFloat(e.target.value))} 
                            className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:bg-neon-green transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-glass-border bg-black/20 shrink-0">
                <button onClick={() => setActiveTab('music')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'music' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-text-muted hover:text-white hover:bg-white/5'}`}><Music size={14}/> Music</button>
                <button onClick={() => setActiveTab('sfx')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${activeTab === 'sfx' ? 'bg-orange-500/10 text-orange-500 border-b-2 border-orange-500' : 'text-text-muted hover:text-white hover:bg-white/5'}`}><Volume2 size={14}/> SFX</button>
            </div>

            {/* Breadcrumbs */}
            <div className={`flex items-center gap-2 p-2 border-b border-white/5 text-xs transition-colors shrink-0 ${currentFolderId ? 'bg-white/5' : 'bg-transparent'}`} onDragOver={e => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const data = JSON.parse(e.dataTransfer.getData('application/json')); if (data.type === 'audio_library_item') moveAudioItem(data.libraryId, currentFolder?.parentId || null); }}>
                <button onClick={() => setCurrentFolderId(currentFolder?.parentId || null)} disabled={!currentFolderId} className={`p-1.5 rounded transition-colors ${currentFolderId ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer' : 'text-text-muted opacity-30 cursor-default'}`}><CornerLeftUp size={14}/></button>
                <div className="flex-1 truncate font-mono text-text-muted">{currentFolderId ? `/${currentFolder?.name}` : '/Raiz'}</div>
                <button onClick={() => addAudioFolder("Nova Pasta", currentFolderId, activeTab)} className="p-1.5 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Nova Pasta"><FolderPlus size={16}/></button>
            </div>

            {/* Grid de Arquivos */}
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 p-3 bg-black/20 relative" onDragOver={e => e.preventDefault()} onDrop={handleWindowDrop}>
                {currentItems.length === 0 && <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted opacity-30 pointer-events-none gap-2"><FolderPlus size={32}/><span className="text-xs">Arraste arquivos aqui</span></div>}
                <div className="grid grid-cols-4 gap-2 pb-2">
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square border border-dashed border-glass-border rounded-xl hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-white transition h-full w-full opacity-50 hover:opacity-100"><FolderPlus size={24}/></div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="audio/*" multiple onChange={handleFileUpload}/>
                    {currentItems.map(item => (
                        <AudioThumb key={item.id} item={item} isPlaying={activeTab === 'music' && currentMusicId === item.audioId && isPlaying} onRename={renameAudioItem} onDelete={removeAudioFromLibrary} moveItem={moveAudioItem} onClick={handleItemClick}/>
                    ))}
                </div>
            </div>

            {/* Footer Player - Só aparece se houver música ativa */}
            {(currentMusicId) && (
                <PlayerBar 
                    trackName={playingTrack ? playingTrack.name : "Desconhecido"}
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPauseToggle}
                    duration={trackDuration}
                    currentTime={currentTime}
                    onSeek={seekMusic}
                    // Removemos o crossfade daqui pois agora está no topo
                />
            )}
        </WindowWrapper>
    );
};

export default SoundboardWindow;