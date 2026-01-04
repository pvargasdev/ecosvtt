import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { 
    AudioLines, Upload, Search, X, Check, Music, 
    Trash2, Volume2, Loader2, ArrowLeft 
} from 'lucide-react';
import { audioDB } from '../../context/audioDb';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const AudioLibraryModal = ({ isOpen, onClose, onSelect, acceptMultiple = false, category = 'music' }) => {
    const { deleteGlobalAudio, refreshAudioSystem } = useGame();
    
    const [libraryFiles, setLibraryFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null); 
    
    const [newItems, setNewItems] = useState(new Set());

    const audioRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadLibrary();
            setSearchQuery("");
            setSelectedIds(new Set());
            setNewItems(new Set()); 
        }
    }, [isOpen]);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const files = await audioDB.getAllAudioMetadata();
            setLibraryFiles(files);
        } catch (e) {
            console.error("Erro ao carregar biblioteca:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFiles = useMemo(() => {
        return libraryFiles.filter(f => {
            const fileCat = f.category || 'music'; 
            if (fileCat !== category) return false;
            if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [libraryFiles, category, searchQuery]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                URL.revokeObjectURL(audioRef.current.src);
            }
        };
    }, []);

    const handleSelection = (id) => {
        if (deletingId) return; 
        if (acceptMultiple) {
            const newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedIds(newSet);
        } else {
            onSelect([id]); 
            onClose();
        }
    };

    const handleRowClick = (id) => {
        if (newItems.has(id)) {
            setNewItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
        handleSelection(id);
    };

    const handleConfirmSelection = () => {
        onSelect(Array.from(selectedIds));
        onClose();
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsLoading(true);
        const addedIds = new Set();

        try {
            const existingMetadata = await audioDB.getAllAudioMetadata();
            const existingAudioMap = new Map();
            
            existingMetadata.forEach(meta => {
                const metaCategory = meta.category || 'music';

                if (metaCategory === category) {
                    const uniqueKey = `${meta.name}|${meta.size}`;
                    existingAudioMap.set(uniqueKey, meta.id);
                }
            });

            for (const file of files) {
                const uniqueKey = `${file.name}|${file.size}`;
                let audioId = null;

                if (existingAudioMap.has(uniqueKey)) {
                    audioId = existingAudioMap.get(uniqueKey);
                } else {
                    audioId = await audioDB.saveAudio(file, category);
                    if (audioId) existingAudioMap.set(uniqueKey, audioId);
                }
                
                if (audioId) {
                    addedIds.add(audioId);
                }
            }
            
            await loadLibrary();
            
            if (addedIds.size > 0 && refreshAudioSystem) {
                await refreshAudioSystem();
            }

            setNewItems(prev => {
                const next = new Set(prev);
                addedIds.forEach(id => next.add(id));
                return next;
            });

        } catch (error) {
            console.error("Erro ao fazer upload:", error);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id) => {
        await deleteGlobalAudio(id);
        if (refreshAudioSystem) await refreshAudioSystem();

        setDeletingId(null);
        setLibraryFiles(prev => prev.filter(f => f.id !== id));
        if (selectedIds.has(id)) {
            const newSet = new Set(selectedIds);
            newSet.delete(id);
            setSelectedIds(newSet);
        }
        if (newItems.has(id)) {
            setNewItems(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    if (!isOpen) return null;

    const themeColor = 'pink'; 
    const hoverBg = `hover:bg-${themeColor}-500/10`;

    const buttonStyle = `
        bg-${themeColor}-500/10 
        text-${themeColor}-300 
        border border-${themeColor}-500 
        hover:bg-${themeColor}-500 
        hover:text-black 
        transition-all duration-200
        font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider
    `;
    const HeaderIcon = category === 'music' ? Music : Volume2;
    const headerTitle = category === 'music' ? 'Biblioteca Musical' : 'Biblioteca SFX';
    const headerSubtitle = category === 'music' ? 'FAIXAS DE ÁUDIO' : 'EFEITOS SONOROS';

    const vttRoot = document.getElementById('vtt-ui-root') || document.body;

    const modalContent = (
        <div 
            data-ecos-window="true" 
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 pointer-events-auto" 
            onMouseDown={(e) => { 
                e.stopPropagation(); 
                if(e.target === e.currentTarget) onClose(); 
            }}
        >
            <div 
                className="w-full max-w-4xl h-[70vh] min-h-[500px] bg-[#0c0c0e] border border-glass-border rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative"
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-16 border-b border-glass-border flex items-center justify-between gap-3 px-4 sm:px-6 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                    
                    <div className="flex items-center gap-3 shrink-0 max-w-[35%] min-w-0">
                        <div className={`p-2 rounded-lg bg-${themeColor}-500/10 text-${themeColor}-500 hidden sm:block`}>
                            <HeaderIcon size={20}/>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="font-rajdhani font-bold text-white text-sm sm:text-lg uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                                {headerTitle}
                            </h2>
                            <span className={`text-[10px] font-bold text-${themeColor}-400/60 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis`}>
                                {headerSubtitle}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center min-w-0 px-2">
                        <div className={`relative w-full max-w-md bg-black/50 border border-glass-border rounded-lg focus-within:border-${themeColor}-500 focus-within:bg-black/80 transition-all duration-300 group`}>
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors pointer-events-none">
                                <Search size={16} />
                            </div>
                            <input 
                                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-text-muted/50 font-medium py-2 pl-9 pr-8 truncate"
                                placeholder={category === 'music' ? 'Buscar música...' : 'Buscar efeito...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')} 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-1"
                                >
                                    <X size={14}/>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            disabled={isLoading}
                            className={`px-3 py-2 rounded-lg shadow-lg ${buttonStyle} ${isLoading ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
                            title="Fazer Upload"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} strokeWidth={3}/>} 
                            <span className="hidden sm:inline ml-1">Upload</span>
                        </button>
                        <input ref={fileInputRef} type="file" multiple={acceptMultiple} accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        
                        <div className="w-px h-6 bg-glass-border hidden sm:block"></div>
                        
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition"
                        >
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin bg-[#121214]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted gap-4 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-white/10"></div>
                            <span>Carregando...</span>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-40 gap-4">
                            <AudioLines size={64} strokeWidth={0.5}/>
                            <div className="text-center">
                                <p className="font-bold">Lista Vazia</p>
                                <p className="text-xs mt-1">Nenhum arquivo encontrado.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredFiles.map(file => {
                                if (deletingId === file.id) {
                                    return (
                                        <div 
                                            key={file.id} 
                                            className="px-6 py-2 min-h-[44px] rounded-lg bg-red-900/30 border border-red-500/50 flex justify-between items-center fade-in duration-200"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="text-white text-sm font-bold pl-1">Excluir arquivo?</span>
                                            <div className="flex gap-1 shrink-0">
                                                <button 
                                                    onClick={() => setDeletingId(null)} 
                                                    className="p-1.5 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition"
                                                    title="Cancelar"
                                                >
                                                    <ArrowLeft size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(file.id)} 
                                                    className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition"
                                                    title="Confirmar Exclusão"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                const isSelected = selectedIds.has(file.id);
                                const isNew = newItems.has(file.id);

                                return (
                                    <div 
                                        key={file.id}
                                        onClick={() => handleRowClick(file.id)}
                                        className={`
                                            relative group grid grid-cols-[1fr_100px_100px_60px] items-center px-6 py-2 min-h-[44px] rounded-lg cursor-pointer border transition-all duration-200
                                            ${isSelected 
                                                ? `bg-${themeColor}-500/10 border-${themeColor}-500/40`
                                                : `border-transparent bg-white/0 ${hoverBg}`
                                            }
                                        `}
                                    >
                                        {isNew && (
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" title="Recém adicionado"></div>
                                        )}

                                        <div className="min-w-0 pr-4 pl-2">
                                            <span className={`text-sm font-medium truncate block ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                                {file.name}
                                            </span>
                                        </div>

                                        <div className="text-right text-xs text-text-muted font-mono opacity-70 group-hover:opacity-100 hidden sm:block">
                                            {formatBytes(file.size)}
                                        </div>

                                        <div className="text-right text-xs text-text-muted opacity-70 group-hover:opacity-100 hidden sm:block">
                                            {formatDate(file.date)}
                                        </div>

                                        <div className="flex justify-end items-center gap-2 col-start-4" onClick={(e) => e.stopPropagation()}>
                                            {isSelected ? (
                                                <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center bg-${themeColor}-500 text-black shadow-lg scale-in`}>
                                                    <Check size={12} strokeWidth={3}/>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setDeletingId(file.id)} 
                                                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition opacity-0 group-hover:opacity-100"
                                                    title="Excluir arquivo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {acceptMultiple && selectedIds.size > 0 && (
                    <div className="shrink-0 p-4 border-t border-glass-border bg-[#0c0c0e]/95 backdrop-blur flex items-center justify-center gap-6 animate-in slide-in-from-bottom-2 duration-200 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
                        <span className="text-sm text-text-muted">
                            <strong className="text-white">{selectedIds.size}</strong> item(s) selecionado(s)
                        </span>
                        <button 
                            onClick={handleConfirmSelection}
                            className={`px-6 py-2 rounded-full shadow-lg hover:brightness-110 ${buttonStyle}`}
                        >
                            Adicionar na Aventura <Check size={14} strokeWidth={3}/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, vttRoot);
};

export default AudioLibraryModal;