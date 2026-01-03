import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { 
    AudioLines, Upload, Search, X, Check, Music, 
    Trash2, Zap, Loader2, ArrowLeft 
} from 'lucide-react';
import { audioDB } from '../../context/audioDb';

// --- UTILITÁRIOS ---
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
    const { deleteGlobalAudio } = useGame();
    
    // States
    const [libraryFiles, setLibraryFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deletingId, setDeletingId] = useState(null); 
    
    // Rastreia itens recém adicionados nesta sessão da janela
    const [newItems, setNewItems] = useState(new Set());

    const audioRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- CARREGAMENTO ---
    useEffect(() => {
        if (isOpen) {
            loadLibrary();
            setSearchQuery("");
            setSelectedIds(new Set());
            setNewItems(new Set()); // Limpa as bolinhas ao abrir a biblioteca (reset de sessão)
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

    // --- FILTRO ---
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
        // Ao clicar no item, remove o marcador de "Novo"
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

    // --- UPLOAD ---
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsLoading(true);
        const addedIds = new Set();

        try {
            for (const file of files) {
                const audioId = await audioDB.saveAudio(file, category);
                
                if (audioId) {
                    addedIds.add(audioId);
                }
            }
            
            // Recarrega a lista
            await loadLibrary();
            
            // Marca os novos arquivos
            setNewItems(prev => {
                const next = new Set(prev);
                addedIds.forEach(id => next.add(id));
                return next;
            });

        } catch (error) {
            console.error("Erro ao fazer upload:", error);
        } finally {
            setIsLoading(false);
            // Reseta o valor do input para permitir selecionar o mesmo arquivo novamente se necessário
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id) => {
        await deleteGlobalAudio(id);
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

    const accentBg = 'bg-pink-500';
    const accentBorder = 'bg-pink-500';
    const hoverBg = 'hover:bg-pink-500/10';

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
                className="w-full max-w-4xl h-[70vh] min-h-[500px] bg-[#0c0c0e] border border-glass-border rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10"
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                {/* TOP BAR */}
                <div className="h-16 border-b border-glass-border flex items-center justify-between px-6 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="font-rajdhani font-bold text-white text-lg flex items-center gap-2 uppercase tracking-wide mr-4">
                             {category === 'music' ? <Music className="text-pink-500"/> : <Zap className="text-pink-500"/>}
                             {category === 'music' ? 'Biblioteca de Músicas' : 'Biblioteca de SFX'}
                        </h2>
                        <div className={`relative flex items-center w-full max-w-sm bg-black/50 border border-glass-border rounded-lg px-4 py-2 focus-within:${accentBorder} focus-within:bg-black/80 transition-all duration-300 group`}>
                            <Search size={16} className="text-text-muted shrink-0 mr-2 group-focus-within:text-white transition-colors"/>
                            <input 
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-text-muted/50 w-full font-medium"
                                placeholder={`Pesquisar ${category === 'music' ? 'música' : 'efeito'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-white"><X size={14}/></button>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            disabled={isLoading}
                            className={`px-4 py-2 ${accentBg} text-black font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-2 text-xs uppercase tracking-wider ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} strokeWidth={3}/>} 
                            Upload
                        </button>
                        <input ref={fileInputRef} type="file" multiple={acceptMultiple} accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        
                        <div className="w-px h-6 bg-glass-border mx-2"></div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition"><X size={20}/></button>
                    </div>
                </div>

                {/* SCROLLABLE LIST */}
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
                                // MODO DE EXCLUSÃO
                                if (deletingId === file.id) {
                                    return (
                                        <div 
                                            key={file.id} 
                                            // min-h-[44px] adicionado para consistência
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
                                        // min-h-[44px] adicionado para evitar colapso de altura ao trocar os ícones
                                        className={`
                                            relative group grid grid-cols-[1fr_100px_100px_60px] items-center px-6 py-2 min-h-[44px] rounded-lg cursor-pointer border transition-all duration-200
                                            ${isSelected 
                                                ? `${category === 'music' ? 'bg-pink-500/10 border-pink-500/40' : 'bg-pink-500/10 border-pink-500/40'}`
                                                : `border-transparent bg-white/0 ${hoverBg}`
                                            }
                                        `}
                                    >
                                        {/* INDICADOR DE NOVO ITEM */}
                                        {isNew && (
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" title="Recém adicionado"></div>
                                        )}

                                        {/* Name */}
                                        <div className="min-w-0 pr-4 pl-2">
                                            <span className={`text-sm font-medium truncate block ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                                {file.name}
                                            </span>
                                        </div>

                                        {/* Size */}
                                        <div className="text-right text-xs text-text-muted font-mono opacity-70 group-hover:opacity-100">
                                            {formatBytes(file.size)}
                                        </div>

                                        {/* Date */}
                                        <div className="text-right text-xs text-text-muted opacity-70 group-hover:opacity-100">
                                            {formatDate(file.date)}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {isSelected ? (
                                                // w-[26px] h-[26px] iguala a altura exata do botão de lixeira (p-1.5 + icon 14px = 26px)
                                                <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center ${category === 'music' ? 'bg-pink-500 text-black' : 'bg-pink-500 text-black'} shadow-lg scale-in`}>
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

                {/* FOOTER (Se houver seleção múltipla) */}
                {acceptMultiple && selectedIds.size > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1e] border border-glass-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in fade-in duration-300 z-20">
                        <span className="text-sm text-text-muted">
                            <strong className="text-white">{selectedIds.size}</strong> item(s)
                        </span>
                        <button 
                            onClick={handleConfirmSelection}
                            className={`px-6 py-2 ${accentBg} text-black font-bold rounded-full hover:brightness-110 transition shadow-lg flex items-center gap-2 text-xs uppercase tracking-wide`}
                        >
                            Adicionar à Mesa <Check size={14} strokeWidth={3}/>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, vttRoot);
};

export default AudioLibraryModal;