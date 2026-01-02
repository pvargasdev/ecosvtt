import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, Image as ImageIcon, Box, ArrowLeft, Map, Plus, Trash2, X, ChevronDown, LogOut, Edit2, RotateCcw, Check, Search, Square, MousePointer, AlertTriangle, Folder, FolderPlus, CornerLeftUp, Copy, HelpCircle, Import, Speaker } from 'lucide-react';
import { imageDB } from '../../context/db';
import SoundboardWindow from '../Soundboard/SoundboardWindow';

// --- VARIÁVEL DE CONTROLE DE DRAG ---
let currentDraggingId = null;

// --- COMPONENTES AUXILIARES ---

const WindowWrapper = ({ children, className, containerRef }) => (
    <div 
        ref={containerRef} 
        data-ecos-window="true" 
        className={`pointer-events-auto ${className}`} 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        onWheel={e => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
        {children}
    </div>
);

// Componente LibraryThumb atualizado com UX melhorada
const LibraryThumb = React.memo(({ token, onRename, onDelete, moveItem }) => {
    const [src, setSrc] = useState(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(token.name || "");
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false); 
    
    // Estado para controle visual do Drag & Drop (Recebendo item)
    const [isDragOver, setIsDragOver] = useState(false);
    // [NOVO] Estado para controle visual quando ESTE item está sendo arrastado
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        if (token.type === 'token') {
             if(token.imageId) {
                imageDB.getImage(token.imageId).then(blob => { 
                    if(blob && isMounted) {
                        objectUrl = URL.createObjectURL(blob);
                        setSrc(objectUrl); 
                    }
                });
            } else if (token.imageSrc) { 
                setSrc(token.imageSrc); 
            }
        }

        return () => { 
            isMounted = false; 
            if(objectUrl) URL.revokeObjectURL(objectUrl); 
        }
    }, [token.imageId, token.imageSrc, token.type]);

    const handleMouseLeave = () => {
        if (isConfirmingDelete) setIsConfirmingDelete(false);
    };

    const handleDragStart = (e) => {
        if (isRenaming || isConfirmingDelete) {
            e.preventDefault();
            return;
        }

        currentDraggingId = token.id;
        setIsDragging(true);
        
        const payload = { type: 'library_item', id: token.id };
        if (token.type === 'token') {
            e.dataTransfer.setData('application/json', JSON.stringify({ 
                ...payload, 
                type: 'library_token', 
                libraryId: token.id, 
                imageId: token.imageId, 
                imageSrc: token.imageSrc 
            }));
        } else {
             e.dataTransfer.setData('application/json', JSON.stringify(payload));
        }
        
        const unifiedPayload = {
            type: token.type === 'token' ? 'library_token' : 'library_folder', 
            libraryId: token.id,
            imageId: token.imageId,
            imageSrc: token.imageSrc
        };
        e.dataTransfer.setData('application/json', JSON.stringify(unifiedPayload));
    };

    const handleDragEnd = () => {
        currentDraggingId = null;
        setIsDragging(false);
        setIsDragOver(false);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentDraggingId === token.id) return;

        if (token.type === 'folder') {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.currentTarget.contains(e.relatedTarget)) return;

        setIsDragOver(false);
    };

    const handleDropOnFolder = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false); 

        if (currentDraggingId === token.id) return;

        const dataString = e.dataTransfer.getData('application/json');
        if (!dataString) return;
        
        const data = JSON.parse(dataString);
        if (data.libraryId && data.libraryId !== token.id) {
            moveItem(data.libraryId, token.id);
        }
    };

    const renderActions = () => {
        if (isConfirmingDelete) {
            return (
                <div className="absolute top-1 right-1 flex gap-1 z-20 animate-in fade-in zoom-in duration-200">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(token.id); }} 
                        className="p-1 bg-red-600 rounded text-white hover:bg-red-500 transition shadow-lg shadow-red-900/50"
                        title="Confirmar Exclusão"
                    >
                        <Check size={10} strokeWidth={3}/>
                    </button>
                </div>
            );
        }

        return (
            <div className={`absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isDragging ? 'hidden' : ''}`}>
                {token.type === 'folder' && (
                    <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-1 bg-black/60 rounded text-white hover:text-yellow-400 backdrop-blur-sm"><Edit2 size={10}/></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }} className="p-1 bg-red-600/80 rounded text-white hover:bg-red-600 backdrop-blur-sm"><Trash2 size={10}/></button>
            </div>
        );
    };

    const confirmOverlay = isConfirmingDelete ? (
        <div className="absolute inset-0 bg-red-900/30 border-2 border-red-500/50 rounded-xl pointer-events-none z-0 animate-pulse" />
    ) : null;

    if (token.type === 'folder') {
        return (
            <div 
                draggable 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => { 
                    e.preventDefault(); 
                    if(currentDraggingId !== token.id) e.dataTransfer.dropEffect = "move"; 
                }}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOnFolder}
                onMouseLeave={handleMouseLeave}
                onClick={() => !isRenaming && !isConfirmingDelete && token.onEnter()}
                className={`
                    aspect-square rounded-xl border-2 transition-all duration-200 
                    group relative flex flex-col items-center justify-center cursor-pointer h-full w-full select-none
                    ${isDragging ? 'opacity-40 grayscale border-dashed border-white/30 scale-95' : ''} 
                    ${isDragOver && !isDragging
                        ? 'bg-neon-green/20 border-neon-green scale-105 shadow-[0_0_15px_rgba(74,222,128,0.4)] z-10' 
                        : 'bg-white/5 border-glass-border hover:border-white' 
                    }
                `}
            >
                {confirmOverlay}
                
                <Folder 
                    size={32} 
                    className={`mb-1 transition-colors duration-200 ${
                        isConfirmingDelete ? 'text-red-400' : 
                        (isDragOver && !isDragging) ? 'text-neon-green scale-110' : 'text-yellow-500'
                    }`} 
                    fill={isConfirmingDelete ? "rgba(248, 113, 113, 0.2)" : ((isDragOver && !isDragging) ? "rgba(74, 222, 128, 0.2)" : "rgba(234, 179, 8, 0.2)")}
                />
                
                {isRenaming ? (
                    <input 
                        autoFocus 
                        className="w-[90%] bg-black/50 border border-white/50 text-xs text-white text-center rounded px-1 outline-none z-20"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { onRename(token.id, renameVal); setIsRenaming(false); } }}
                        onBlur={() => { onRename(token.id, renameVal); setIsRenaming(false); }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className={`text-xs truncate w-full text-center px-1 select-none relative z-10 transition-colors ${(isDragOver && !isDragging) ? 'text-white font-bold' : 'text-text-muted'}`}>
                        {token.name}
                    </span>
                )}

                {!isRenaming && renderActions()}
            </div>
        );
    }
    
    return (
        <div 
            draggable 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
            onMouseLeave={handleMouseLeave}
             className={`
                aspect-square bg-black rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all group relative h-full w-full select-none 
                ${isDragging ? 'opacity-40 grayscale border-dashed border-white/30 scale-95' : ''}
                ${isConfirmingDelete ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-glass-border hover:border-white'}
             `}
        >
            {confirmOverlay}
            {src && <img src={src} className={`w-full h-full object-cover pointer-events-none transition-opacity ${isConfirmingDelete ? 'opacity-50 grayscale' : ''}`} alt="token"/>}
            {renderActions()}
        </div>
    );
}, (prev, next) => prev.token === next.token);

const InternalAlert = ({ message, clearAlert }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => { clearAlert(); }, 5000); 
            return () => clearTimeout(timer);
        }
    }, [message, clearAlert]);

    if (!message) return null;

    return (
        <div 
            className="absolute top-4 left-1/2 transform -translate-x-1/2 p-3 bg-red-900/90 border border-red-700 rounded-lg shadow-xl backdrop-blur-sm z-[100] pointer-events-auto flex items-center gap-3 text-sm text-white"
            style={{ animation: 'fadeInDown 0.3s ease-out forwards' }}
        >
            <AlertTriangle size={18} className="text-yellow-400 shrink-0"/>
            <span className='font-semibold'>{message}</span>
            <button onClick={clearAlert} className="text-red-300 hover:text-white shrink-0"><X size={16}/></button>
        </div>
    );
};

// --- COMPONENTES EXTRAÍDOS ---

const AssetDock = ({ isOpen, onClose }) => {
    const { 
        activeAdventure, 
        addTokenToLibrary, removeTokenFromLibrary, 
        addFolder, moveLibraryItem, renameLibraryItem 
    } = useGame();
    
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isBreadcrumbActive, setIsBreadcrumbActive] = useState(false);
    
    const tokenInputRef = useRef(null);
    const libraryRef = useRef(null);

    useEffect(() => { if (!isOpen) setCurrentFolderId(null); }, [isOpen]);

    const handleMultiTokenUpload = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            addTokenToLibrary(files[i], currentFolderId); 
        }
        event.target.value = ''; 
    };

    const handleDropToParent = (e) => {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (!data.libraryId) return;
        
        const currentFolder = activeAdventure?.tokenLibrary?.find(t => t.id === currentFolderId);
        const targetId = currentFolder ? (currentFolder.parentId || null) : null;
        
        moveLibraryItem(data.libraryId, targetId);
    };

    const handleBreadcrumbDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBreadcrumbActive(true);
    };

    const handleBreadcrumbDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsBreadcrumbActive(false);
    };

    const handleBreadcrumbDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBreadcrumbActive(false);
        handleDropToParent(e);
    };

    if (!isOpen) return null;

    const currentItems = activeAdventure?.tokenLibrary?.filter(t => {
        const pId = t.parentId || null;
        return pId === currentFolderId;
    }) || [];
    
    currentItems.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return 0;
    });

    const currentFolderName = currentFolderId 
        ? activeAdventure?.tokenLibrary?.find(t => t.id === currentFolderId)?.name || "Pasta"
        : "";

    const showBreadcrumb = currentFolderId !== null;

    return (
        <WindowWrapper containerRef={libraryRef} className="absolute top-24 right-4 w-[300px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col max-h-[60vh] z-40 shadow-2xl scale-90 origin-top-right">
            {/* Header */}
            <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl shrink-0 z-20 relative">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    Biblioteca de Tokens
                </h3>
                <div className="flex gap-1">
                    <button onClick={() => addFolder("Pasta", currentFolderId)} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Criar Pasta"><FolderPlus size={16}/></button>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white"><X size={16}/></button>
                </div>
            </div>

            {/* Breadcrumb / Nav */}
            <div 
                className={`
                    border-b transition-all duration-200 ease-in-out shrink-0 z-10 flex items-center px-2 gap-2 text-xs relative overflow-hidden
                    ${showBreadcrumb ? 'max-h-12 opacity-100 py-2 translate-y-0' : 'max-h-0 opacity-0 py-0 -translate-y-2 pointer-events-none'}
                    ${isBreadcrumbActive 
                        ? 'bg-neon-green/20 border-neon-green cursor-copy shadow-[inset_0_0_20px_rgba(74,222,128,0.2)]' 
                        : 'bg-black/40 border-glass-border' 
                    }
                `}
                onDragEnter={handleBreadcrumbDragEnter}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} 
                onDragLeave={handleBreadcrumbDragLeave}
                onDrop={handleBreadcrumbDrop}
            >
                {/* Overlay de Feedback Visual */}
                <div className={`absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 transition-opacity duration-200 pointer-events-none ${isBreadcrumbActive ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 text-neon-green font-bold animate-pulse">
                        <CornerLeftUp size={20} strokeWidth={3} />
                        <span className="uppercase tracking-widest text-[10px]">Mover para pasta acima</span>
                    </div>
                </div>

                {/* Conteúdo Normal */}
                <button 
                    onClick={() => {
                            const curr = activeAdventure?.tokenLibrary?.find(t => t.id === currentFolderId);
                            setCurrentFolderId(curr?.parentId || null);
                    }}
                    className="p-1.5 bg-white/10 rounded hover:bg-white/20 text-white flex items-center gap-1 transition-colors shrink-0 z-10"
                    title="Voltar"
                >
                    <CornerLeftUp size={14}/>
                </button>
                <div className="flex-1 min-w-0 z-10">
                    <div className="text-[10px] text-text-muted uppercase font-bold leading-none mb-0.5">Pasta Atual</div>
                    <div className="font-mono text-white truncate leading-none">{currentFolderName}</div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 p-3 bg-black/20">
                <div className="grid grid-cols-4 gap-2 pb-2">
                    <div onClick={() => tokenInputRef.current?.click()} className="aspect-square border border-dashed border-glass-border rounded-xl hover:bg-white/10 flex flex-col items-center justify-center cursor-pointer text-text-muted hover:text-white transition h-full w-full">
                        <Plus size={24}/>
                    </div>
                    <input ref={tokenInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMultiTokenUpload}/>
                    
                    {currentItems.map(t => (
                        <LibraryThumb 
                          key={t.id} 
                          token={{ ...t, onEnter: () => setCurrentFolderId(t.id) }} 
                          onDelete={removeTokenFromLibrary} 
                          onRename={renameLibraryItem}
                          moveItem={moveLibraryItem}
                        />
                    ))}
                </div>
            </div>
        </WindowWrapper>
    );
};

const SceneSelector = ({ isOpen }) => {
    const { activeAdventure, addScene, setActiveScene, updateScene, deleteScene, duplicateScene, activeScene } = useGame();
    const sceneRef = useRef(null);
    const scenesListRef = useRef(null);
    const prevScenesLength = useRef(activeAdventure?.scenes.length || 0);

    const [isCreating, setIsCreating] = useState(false);
    const [newSceneName, setNewSceneName] = useState("");
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    
    // Campo de Busca
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (activeAdventure?.scenes.length > prevScenesLength.current) {
            if (scenesListRef.current) scenesListRef.current.scrollTop = scenesListRef.current.scrollHeight;
        }
        prevScenesLength.current = activeAdventure?.scenes.length || 0;
    }, [activeAdventure?.scenes.length]);

    if (!isOpen) return null;

    const handleCreate = () => {
        const name = newSceneName.trim() || "Nova Cena";
        addScene(name);
        setNewSceneName("");
        setIsCreating(false);
    };

    const handleRename = (id) => {
        if (!renameValue.trim()) return setRenamingId(null);
        updateScene(id, { name: renameValue });
        setRenamingId(null);
    };

    const normalizeText = (text) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const filteredScenes = activeAdventure?.scenes.filter(s => {
        if (!searchQuery) return true;
        return normalizeText(s.name).includes(normalizeText(searchQuery));
    }) || [];

    const isOnlyScene = activeAdventure?.scenes.length <= 1;

    return (
        <WindowWrapper containerRef={sceneRef} className="absolute top-24 right-4 w-72 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 overflow-hidden scale-90 origin-top-right flex flex-col max-h-[60vh]">
            <div className="p-3 border-b border-glass-border bg-white/5">
                <h3 className="font-rajdhani font-bold text-white text-sm">Cenas da Aventura</h3>
            </div>
            
            <div className="px-3 py-2 bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-2 bg-black/40 rounded px-2 py-1.5 border border-transparent focus-within:border-glass-border transition-colors">
                    <Search size={12} className="text-text-muted"/>
                    <input 
                        className="bg-transparent border-none outline-none text-xs text-white placeholder-text-muted w-full"
                        placeholder="Pesquisar cena..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-white"><X size={12}/></button>
                    )}
                </div>
            </div>

            <div ref={scenesListRef} className="overflow-y-auto scrollbar-thin flex-1 relative min-h-[60px] min-h-0 space-y-1 p-2">
                {filteredScenes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-text-muted italic text-xs opacity-50">
                            {activeAdventure?.scenes.length === 0 ? "Nenhuma cena." : "Nenhuma cena encontrada."}
                        </p>
                    </div>
                )}
                {filteredScenes.map(s => {
                    if (deletingId === s.id) {
                        return (
                            <div key={s.id} className="p-3 rounded bg-red-900/30 border border-red-500/50 flex justify-between items-center fade-in duration-200">
                                <span className="text-white text-xs font-bold pl-1">Excluir?</span>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={(e)=>{e.stopPropagation(); setDeletingId(null);}} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white"><ArrowLeft size={14}/></button>
                                    <button onClick={(e)=>{e.stopPropagation(); deleteScene(s.id); setDeletingId(null);}} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        );
                    }
                    if (renamingId === s.id) {
                        return (
                            <div key={s.id} className="p-3 rounded bg-white/10 border border-white/30 flex items-center gap-1 fade-in duration-200">
                                <input autoFocus onFocus={(e) => e.target.select()} className="flex-1 bg-black/50 border border-glass-border rounded px-2 text-white text-sm outline-none focus:border-white min-w-0" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename(s.id); if (e.key === 'Escape') setRenamingId(null); }} />
                                <div className="flex gap-1 shrink-0"><button onClick={() => setRenamingId(null)} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white"><ArrowLeft size={14}/></button><button onClick={() => handleRename(s.id)} className="p-1 rounded bg-neon-green hover:bg-white text-black"><Check size={14}/></button></div>
                            </div>
                        );
                    }
                    return (
                        <div key={s.id} onClick={(e) => { e.stopPropagation(); setActiveScene(s.id); }} className={`p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 border-l-2 group transition-colors rounded ${activeScene?.id === s.id ? 'border-neon-green bg-white/5' : 'border-transparent'}`}>
                            <span className={`text-sm font-bold truncate max-w-[120px] ${activeScene?.id === s.id ? 'text-neon-green' : 'text-white'}`}>{s.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.name); setDeletingId(null); }} className="text-text-muted hover:text-yellow-400 p-1" title="Renomear"><Edit2 size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateScene(s.id); }} className="text-text-muted hover:text-neon-blue p-1" title="Duplicar"><Copy size={14}/></button>
                                <button onClick={(e) => { e.stopPropagation(); if (!isOnlyScene) { setDeletingId(s.id); setRenamingId(null); } }} className={`p-1 ${isOnlyScene ? 'text-text-muted opacity-30 cursor-not-allowed' : 'text-text-muted hover:text-red-500'}`} title="Excluir"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-3 border-t border-glass-border bg-black/40">
                {!isCreating ? (
                    <button onClick={(e) => { e.stopPropagation(); setIsCreating(true); }} className="w-full py-2 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded text-xs font-bold hover:bg-neon-green hover:text-black hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] transition flex items-center justify-center gap-2"><Plus size={14} strokeWidth={3}/> NOVA CENA</button>
                ) : (
                    <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                        <input autoFocus placeholder="Nome da Cena..." className="w-full bg-[#15151a] border border-neon-green text-white placeholder-white/20 rounded p-2 text-sm outline-none" value={newSceneName} onChange={e => setNewSceneName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }} />
                        <div className="flex gap-2"><button onClick={() => setIsCreating(false)} className="flex-1 py-1.5 text-xs text-text-muted hover:text-white transition">Cancelar</button><button onClick={handleCreate} className="flex-1 py-1.5 bg-neon-green text-black font-bold rounded text-xs hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-900/20">CRIAR</button></div>
                    </div>
                )}
            </div>
        </WindowWrapper>
    );
};

const MapConfigModal = ({ isOpen, onClose }) => {
    const { activeScene, updateScene, updateSceneMap } = useGame();
    const mapInputRef = useRef(null);
    const mapConfigRef = useRef(null);
    const [localScale, setLocalScale] = useState(100);

    useEffect(() => { if (activeScene?.mapScale) setLocalScale(Math.round(activeScene.mapScale * 100)); }, [activeScene?.id, isOpen]);

    if (!isOpen) return null;

    const handleApplyScale = () => {
        let val = parseInt(localScale); if (isNaN(val) || val < 10) val = 10; if (val > 1000) val = 1000; 
        updateScene(activeScene.id, { mapScale: val / 100 }); setLocalScale(val); 
    };

    return (
        <WindowWrapper containerRef={mapConfigRef} className="absolute top-24 right-4 bg-black/85 border border-glass-border backdrop-blur-sm p-4 rounded-xl shadow-2xl z-50 w-72 scale-90 origin-top-right">
            <div className="flex justify-between items-center mb-4"><h3 className="font-rajdhani font-bold text-white">Imagem de Fundo</h3><button onClick={onClose}><X size={16} className="text-text-muted hover:text-white"/></button></div>
            <div className="space-y-4">
                <div onClick={() => mapInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 border border-dashed border-glass-border rounded hover:bg-white/5 cursor-pointer text-sm text-neon-blue transition"><ImageIcon size={16}/> {activeScene?.mapImageId ? "Trocar Imagem" : "Escolher Imagem"}</div>
                <input ref={mapInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f) updateSceneMap(activeScene.id, f); e.target.value = ''; }} />
                {(activeScene?.mapImageId || activeScene?.mapImage) && (
                    <div className="bg-black/20 p-3 rounded border border-white/5">
                        <div className="flex justify-between items-center mb-2"><label className="text-xs text-text-muted uppercase font-bold">Escala (%)</label><button onClick={() => { setLocalScale(100); updateScene(activeScene.id, { mapScale: 1 }); }} title="Resetar para 100%" className="text-[10px] flex items-center gap-1 text-neon-blue hover:text-white transition"><RotateCcw size={10} /> Resetar</button></div>
                        <div className="flex items-center gap-2"><div className="relative flex-1"><input type="number" className="w-full bg-black/50 border border-glass-border rounded-l p-2 text-white text-sm focus:border-neon-green outline-none pr-8 font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={localScale} onChange={(e) => setLocalScale(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleApplyScale(); }} placeholder="100"/><span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold pointer-events-none">%</span></div><button onClick={handleApplyScale} className="bg-neon-green text-black p-2 rounded-r font-bold hover:bg-white transition flex items-center justify-center"><Check size={16} /></button></div>
                    </div>
                )}
            </div>
        </WindowWrapper>
    );
};

const HelpWindow = ({ isOpen, onClose }) => {
    const helpRef = useRef(null);
    if (!isOpen) return null;

    const shortcuts = [
        { key: "Middle Click", desc: "Mover a tela" },
        { key: "Scroll", desc: "Zoom In / Zoom Out" },
        { key: "F11", desc: "Tela Cheia" },
        { key: "Tab", desc: "Esconder UI" },
        { key: "Double Click", desc: "Criar/Editar Pin" },
        { key: "Ctrl + Click", desc: "Seleção Múltipla" },
        { key: "Ctrl + C / V", desc: "Copiar e Colar Tokens" },
        { key: "Ctrl + F", desc: "Flip de Token (Espelhar)" },
        { key: "Ctrl + Q / E", desc: "Rotacionar Tokens" },
        { key: "Backspace", desc: "Excluir Seleção" },
    ];

    return (
        <WindowWrapper containerRef={helpRef} className="absolute top-24 right-4 w-[280px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col z-50 shadow-2xl scale-90 origin-top-right">
            <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    <HelpCircle size={16}/> Comandos
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white"><X size={16}/></button>
            </div>
            <div className="p-4 space-y-3 text-sm overflow-y-auto max-h-[60vh] scrollbar-thin">
                {shortcuts.map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="font-bold text-white">{item.key}</span>
                        <span className="text-text-muted text-xs text-right">{item.desc}</span>
                    </div>
                ))}
            </div>
        </WindowWrapper>
    );
};

// --- COMPONENTE PRINCIPAL ---

// [ALTERAÇÃO]: Recebendo showUI via props
export const VTTLayout = ({ zoomValue, onZoomChange, activeTool, setActiveTool, showUI }) => {
  const { activeAdventure, activeScene, setActiveAdventureId } = useGame();

  const [uiState, setUiState] = useState({ menuOpen: false, libraryOpen: false, mapConfigOpen: false, helpOpen: false, soundboardOpen: false });
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [alertMessage, setAlertMessage] = useState(null); 
  const clearAlert = useCallback(() => setAlertMessage(null), []);
  const headerRef = useRef(null);      

  const closeAllMenus = useCallback(() => {
      setUiState(prev => {
          if (prev.menuOpen || prev.libraryOpen || prev.mapConfigOpen || prev.helpOpen || prev.soundboardOpen) {
              return { menuOpen: false, libraryOpen: false, mapConfigOpen: false, helpOpen: false, soundboardOpen: false };
          }
          return prev;
      });
  }, []);

  useEffect(() => {
      const handleOutsideInteraction = (event) => {
          if (headerRef.current && headerRef.current.contains(event.target)) return;
          if (event.target.closest('[data-ecos-window="true"]')) return;
          if (uiState.menuOpen || uiState.libraryOpen || uiState.mapConfigOpen || uiState.helpOpen || uiState.soundboardOpen) closeAllMenus();
      };
      
      const handleKeyDown = (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') closeAllMenus(); };
      
      document.addEventListener("mousedown", handleOutsideInteraction, { capture: true });
      window.addEventListener("keydown", handleKeyDown);
      return () => {
          document.removeEventListener("mousedown", handleOutsideInteraction, { capture: true });
          window.removeEventListener("keydown", handleKeyDown);
      };
  }, [uiState, closeAllMenus]);

  const toggle = (key, e) => {
    if (e) e.stopPropagation();
    setUiState(prev => ({
        menuOpen: key === 'menuOpen' ? !prev.menuOpen : false,
        libraryOpen: key === 'libraryOpen' ? !prev.libraryOpen : false,
        mapConfigOpen: key === 'mapConfigOpen' ? !prev.mapConfigOpen : false,
        helpOpen: key === 'helpOpen' ? !prev.helpOpen : false,
        soundboardOpen: key === 'soundboardOpen' ? !prev.soundboardOpen : false,
    }));
  };

  const ConfirmationModal = () => { 
      if (!confirmModal.open) return null; 
      return ( 
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onMouseDown={e=>e.stopPropagation()}>
              <div className="bg-ecos-bg border border-glass-border p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-2">Confirmação</h3>
                  <p className="text-text-muted mb-6">{confirmModal.message}</p>
                  <div className="flex gap-3">
                      <button onClick={()=>setConfirmModal({open:false,message:'',onConfirm:null})} className="flex-1 py-2 bg-glass rounded text-white hover:bg-white/10">Cancelar</button>
                      <button onClick={()=>{confirmModal.onConfirm();setConfirmModal({open:false,message:'',onConfirm:null})}} className="flex-1 py-2 bg-red-600 rounded text-white font-bold hover:bg-red-500">Confirmar</button>
                  </div>
              </div>
          </div> 
      ); 
  };

  return (
      <div className="absolute inset-0 pointer-events-none z-50">
          
          <InternalAlert message={alertMessage} clearAlert={clearAlert} />

          <div 
             ref={headerRef}
             // [ALTERAÇÃO]: Classes CSS condicionais para esconder a barra superior suavemente
             className={`
                absolute top-4 right-4 flex flex-col bg-black/80 rounded-lg border border-glass-border shadow-lg backdrop-blur-sm pointer-events-auto z-40 w-max overflow-hidden scale-90 origin-top-right transition-all duration-300
                ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}
             `}
             onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
          >
              
              {onZoomChange && (
                <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 justify-left bg-black/20">
                    <Search size={15} className="text-text-muted"/>
                    <input 
                        type="range" 
                        min="30" 
                        max="300" 
                        value={zoomValue || 100} 
                        onChange={onZoomChange}
                        onMouseDown={closeAllMenus}
                        className="flex-1 min-w-[150px] h-2 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                </div>
              )}

              <div className="flex items-center gap-2 p-1.5">
                
                <button onClick={() => { setActiveTool('select'); closeAllMenus(); }} className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'select' ? 'bg-white/20 text-neon-green' : 'text-text-muted'}`} title="Modo Seleção"><MousePointer size={18}/></button>
                <button onClick={() => { setActiveTool('fogOfWar'); closeAllMenus(); }} className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'fogOfWar' ? 'bg-white/20 text-neon-purple' : 'text-text-muted'}`} title="Fog of War"><Square size={18}/></button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => toggle('menuOpen', e)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-white transition border border-transparent hover:border-glass-border">
                    <Map size={16} className="text-neon-green"/>
                    <span className="font-rajdhani font-bold uppercase text-sm">
                        {activeScene?.name ? (activeScene.name.length > 10 ? activeScene.name.substring(0, 10) + '...' : activeScene.name) : "Sem Cena"}
                    </span>
                    <ChevronDown size={14} className="text-text-muted"/>
                </button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>
                
                <button onClick={(e) => toggle('mapConfigOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.mapConfigOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Configurar Fundo"><ImageIcon size={18}/></button>
                <button onClick={(e) => toggle('libraryOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.libraryOpen ? 'text-yellow-500' : 'text-text-muted'}`} title="Biblioteca"><Box size={18}/></button>
                
                <div className="w-px h-6 bg-glass-border mx-1"></div>

                {/* BOTÃO DA SOUNDBOARD ADICIONADO AQUI */}
                <button 
                    onClick={(e) => toggle('soundboardOpen', e)} 
                    className={`p-2 rounded hover:bg-white/10 transition ${uiState.soundboardOpen ? 'text-pink-500' : 'text-text-muted'}`} 
                    title="Soundboard / Músicas"
                >
                    <Speaker size={18}/>
                </button>

                <div className="w-px h-6 bg-glass-border mx-1"></div>

                <button onClick={(e) => toggle('helpOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.helpOpen ? 'text-white' : 'text-text-muted'}`} title="Ajuda / Comandos"><HelpCircle size={18}/></button>
                
                <button onClick={(e) => { 
                    e.stopPropagation(); 
                    closeAllMenus();
                    setConfirmModal({ open: true, message: "Sair da aventura?", onConfirm: () => setActiveAdventureId(null) }); 
                }} className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title="Sair"><LogOut size={18}/></button>
              </div>
          </div>

          {/* JANELAS RENDERIZADAS CONDICIONALMENTE SE SHOWUI FOR TRUE */}
          {showUI && (
            <>
              <MapConfigModal isOpen={uiState.mapConfigOpen} onClose={() => setUiState(p => ({...p, mapConfigOpen: false}))} />
              <AssetDock isOpen={uiState.libraryOpen} onClose={() => setUiState(p => ({...p, libraryOpen: false}))} />
              <SceneSelector isOpen={uiState.menuOpen} />
              <HelpWindow isOpen={uiState.helpOpen} onClose={() => setUiState(p => ({...p, helpOpen: false}))} />
              
              {uiState.soundboardOpen && (
                  <SoundboardWindow 
                      onClose={() => setUiState(p => ({...p, soundboardOpen: false}))} 
                      WindowWrapperComponent={WindowWrapper} 
                  />
              )}

              <ConfirmationModal />
            </>
          )}
      </div>
  );
};