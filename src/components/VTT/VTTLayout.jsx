import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useGame } from '../../context/GameContext';
import { Settings, Image as ImageIcon, Box, ArrowLeft, Map, Plus, Trash2, X, ChevronDown, LogOut, Edit2, RotateCcw, Check, Search, Square, MousePointer, AlertTriangle, Folder, FolderPlus, CornerLeftUp, Copy, HelpCircle, Import, Speaker, Dices, MapPin, MapPinOff, File as FileIcon, PenTool, Eraser, } from 'lucide-react';
import { imageDB } from '../../context/db';
import SoundboardWindow from '../Soundboard/SoundboardWindow';
import DiceWindow from '../DiceRoller/DiceWindow';

let currentDraggingId = null;

const WindowWrapper = ({ children, className, containerRef }) => (
    <div 
        ref={containerRef} 
        data-ecos-window="true" 
        data-ecos-ui="true"
        className={`pointer-events-auto cursor-default ${className}`}
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        onWheel={e => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
        {children}
    </div>
);

const SceneThumbnail = memo(({ imageId, thumbnailId }) => {
    const [src, setSrc] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);
    const activeId = thumbnailId || imageId;

    useEffect(() => {
        if (!activeId) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (observer) observer.disconnect();
        };
    }, [activeId]);

    useEffect(() => {
        if (!isVisible || !activeId) return;

        let isMounted = true;
        let objectUrl = null;

        const load = async () => {
            try {
                const blob = await imageDB.getImage(activeId);
                
                if (isMounted && blob) {
                    objectUrl = URL.createObjectURL(blob);
                    setSrc(objectUrl);
                } else if (isMounted && !blob && thumbnailId) {
                    const fallbackBlob = await imageDB.getImage(imageId);
                    if (isMounted && fallbackBlob) {
                        objectUrl = URL.createObjectURL(fallbackBlob);
                        setSrc(objectUrl);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar thumb", error);
            }
        };

        load();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [isVisible, activeId, imageId, thumbnailId]);

    if (!activeId) {
        return (
            <div className="w-16 h-9 bg-black/50 rounded flex items-center justify-center border border-white/10 shrink-0">
                <HelpCircle size={14} className="text-text-muted opacity-50" />
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="w-16 h-9 bg-black rounded overflow-hidden border border-glass-border shrink-0 relative"
        >
            {src ? (
                <img 
                    src={src} 
                    alt="Scene Preview" 
                    className="w-full h-full object-cover opacity-80 animate-in fade-in duration-500"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                    {isVisible && <div className="w-3 h-3 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin"/>}
                </div>
            )}
        </div>
    );
});

const LibraryThumb = React.memo(({ token, onRename, onDelete, moveItem }) => {
    const [src, setSrc] = useState(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(token.name || "");
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false); 
    
    const [isDragOver, setIsDragOver] = useState(false);
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
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleClose = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        if (message && isVisible) {
            const timer = setTimeout(handleClose, 5000); 
            return () => clearTimeout(timer);
        }
    }, [message, isVisible, handleClose]);

    if (!message) return null;

    return (
        <div className="absolute bottom-4 left-0 w-full flex justify-center z-[100] pointer-events-none">
            <div 
                data-ecos-ui="true"
                className={`
                    pointer-events-auto flex items-center gap-3 p-3 
                    bg-red-900/90 border border-red-700 rounded-lg shadow-xl backdrop-blur-sm 
                    text-sm text-white cursor-default
                    transition-opacity duration-300 ease-in-out
                    ${isVisible ? 'opacity-100' : 'opacity-0'}
                `}
                onTransitionEnd={() => { if (!isVisible) { clearAlert(); } }}
            >
                <AlertTriangle size={18} className="text-yellow-400 shrink-0"/>
                <span className='font-semibold'>{message}</span>
                <button onClick={handleClose} className="text-red-300 hover:text-white shrink-0">
                    <X size={16}/>
                </button>
            </div>
        </div>
    );
};


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
        <WindowWrapper containerRef={libraryRef} className="absolute top-16 right-4 w-[300px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col max-h-[60vh] z-40 shadow-2xl animate-in fade-in">
            <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl shrink-0 z-20 relative">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    Biblioteca de Tokens
                </h3>
                <div className="flex gap-1">
                    <button onClick={() => addFolder("Pasta", currentFolderId)} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Criar Pasta"><FolderPlus size={16}/></button>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white"><X size={16}/></button>
                </div>
            </div>

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
                <div className={`absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 transition-opacity duration-200 pointer-events-none ${isBreadcrumbActive ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex items-center gap-2 text-neon-green font-bold animate-pulse">
                        <CornerLeftUp size={20} strokeWidth={3} />
                        <span className="uppercase tracking-widest text-[10px]">Mover para pasta acima</span>
                    </div>
                </div>

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

const SceneItem = ({ item, isActive, onSelect, onRename, onDelete, onDuplicate, onMove, onEnterFolder, activeSceneId }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(item.name);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const isFolder = item.type === 'folder';

    const handleDragStart = (e) => {
        if (isRenaming) { e.preventDefault(); return; }
        e.dataTransfer.setData('application/json', JSON.stringify({ 
            type: 'scene_item', 
            id: item.id,
            isFolder: isFolder 
        }));
        e.dataTransfer.effectAllowed = 'move';
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

        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'scene_item' && data.id !== item.id) {
            onMove(data.id, item.id);
        }
    };

    if (isDeleting) {
        return (
            <div className="h-14 px-2 mb-1 rounded bg-red-900/30 border border-red-500/50 flex justify-between items-center animate-in fade-in select-none">
                <span className="text-white text-xs font-bold pl-1 truncate">Excluir {isFolder ? 'Pasta' : 'Cena'}?</span>
                <div className="flex gap-1 shrink-0 items-center">
                    <button onClick={(e)=>{e.stopPropagation(); setIsDeleting(false);}} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white flex items-center"><ArrowLeft size={14}/></button>
                    <button onClick={(e)=>{e.stopPropagation(); onDelete(item.id);}} className="p-1 rounded bg-red-600 hover:bg-red-500 text-white flex items-center"><Trash2 size={14}/></button>
                </div>
            </div>
        );
    }

    if (isRenaming) {
        return (
            <div className="h-14 px-2 mb-1 rounded bg-white/10 border border-white/30 flex items-center justify-between animate-in fade-in">
                <input 
                    autoFocus 
                    onFocus={(e) => e.target.select()} 
                    className="flex-1 bg-transparent border-none text-white text-sm outline-none placeholder-text-muted min-w-0" 
                    value={renameVal} 
                    onChange={e => setRenameVal(e.target.value)} 
                    onKeyDown={e => { 
                        if (e.key === 'Enter') { onRename(item.id, renameVal); setIsRenaming(false); }
                        if (e.key === 'Escape') { setIsRenaming(false); setRenameVal(item.name); } 
                    }} 
                />
                <div className="flex gap-1 shrink-0 items-center ml-2">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsRenaming(false); 
                            setRenameVal(item.name); 
                        }} 
                        className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white flex items-center"
                        title="Cancelar"
                    >
                        <ArrowLeft size={14}/>
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onRename(item.id, renameVal); 
                            setIsRenaming(false); 
                        }} 
                        className="p-1 rounded bg-neon-green hover:bg-white text-black flex items-center"
                        title="Salvar"
                    >
                        <Check size={14}/>
                    </button>
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
                if (isFolder) onEnterFolder(item.id);
                else onSelect(item.id);
            }} 
            className={`
                flex items-center p-1.5 mb-1 cursor-pointer border-l-2 group transition-all rounded select-none relative gap-3 min-h-[50px]
                ${isDragOver ? 'bg-neon-green/20 border-neon-green scale-[1.02] z-10' : ''}
                ${!isDragOver && isActive ? 'border-neon-green bg-white/5' : (!isDragOver && 'border-transparent hover:bg-white/5')}
            `}
        >
            {!isFolder && (
                <SceneThumbnail 
                    imageId={item.mapImageId || item.mapImage} 
                    thumbnailId={item.mapThumbnailId}
                />
            )}

            <div className="flex items-center gap-2 min-w-0 flex-1">
                {isFolder && (
                    <Folder size={20} className={`shrink-0 ${isDragOver ? 'text-neon-green' : 'text-neon-green'}`} fill={isDragOver ? "currentColor" : "none"}/>
                )}
                
                <div className="flex flex-col min-w-0 justify-center">
                    <span className={`text-sm font-bold truncate leading-tight ${isActive ? 'text-neon-green' : 'text-white'}`}>
                        {item.name}
                    </span>
                </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center absolute right-2 bg-black/60 rounded px-1 backdrop-blur-sm">
                <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="text-text-muted hover:text-yellow-400 p-1.5 flex items-center" title="Renomear"><Edit2 size={12}/></button>
                {!isFolder && (
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(item.id); }} className="text-text-muted hover:text-neon-blue p-1.5 flex items-center" title="Duplicar"><Copy size={12}/></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }} className="text-text-muted hover:text-red-500 p-1.5 flex items-center" title="Excluir"><Trash2 size={12}/></button>
            </div>
        </div>
    );
};

const SceneSelector = ({ isOpen, currentFolderId, setCurrentFolderId }) => {
    const { activeAdventure, addScene, addSceneFolder, moveSceneItem, setActiveScene, updateScene, deleteScene, duplicateScene, activeScene } = useGame();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [isBreadcrumbActive, setIsBreadcrumbActive] = useState(false);
    
    const [isCreating, setIsCreating] = useState(false);
    const [createMode, setCreateMode] = useState('scene');
    const [newItemName, setNewItemName] = useState("");

    const sceneRef = useRef(null);
    

    if (!isOpen) return null;

    const handleCreate = () => {
        const name = newItemName.trim();
        if (createMode === 'folder') {
            addSceneFolder(name || "Nova Pasta", currentFolderId);
        } else {
            addScene(name || "Nova Cena", currentFolderId);
        }
        setNewItemName("");
        setIsCreating(false);
    };

    const handleRename = (id, newName) => {
        if (!newName.trim()) return;
        updateScene(id, { name: newName });
    };

    const handleDropOnBreadcrumb = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBreadcrumbActive(false);

        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'scene_item') {
            const currentFolder = activeAdventure?.scenes.find(s => s.id === currentFolderId);
            const targetId = currentFolder ? (currentFolder.parentId || null) : null;
            if (data.id !== targetId) {
                moveSceneItem(data.id, targetId);
            }
        }
    };

    const normalizeText = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    let displayItems = [];
    
    if (searchQuery) {
        displayItems = activeAdventure?.scenes.filter(s => 
            normalizeText(s.name).includes(normalizeText(searchQuery))
        ) || [];
    } else {
        displayItems = activeAdventure?.scenes.filter(s => {
            const pId = s.parentId || null;
            return pId === currentFolderId;
        }) || [];
        
        displayItems.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    }

    const currentFolderName = currentFolderId 
        ? activeAdventure?.scenes.find(s => s.id === currentFolderId)?.name || "Pasta"
        : "Raiz";

    return (
        <WindowWrapper containerRef={sceneRef} className="absolute top-16 right-4 w-80 bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in flex flex-col max-h-[60vh]">
            
            <div className="p-3 border-b border-glass-border bg-white/5 flex justify-between items-center shrink-0">
                <h3 className="font-rajdhani font-bold text-white text-sm">Cenas & Mapas</h3>
                <div className="flex gap-1">
                     <button onClick={() => { setCreateMode('folder'); setIsCreating(true); }} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Criar Pasta"><FolderPlus size={14}/></button>
                     <button onClick={() => { setCreateMode('scene'); setIsCreating(true); }} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white" title="Criar Cena"><Plus size={14}/></button>
                </div>
            </div>
            
            <div className="px-3 py-2 bg-black/20 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 bg-black/40 rounded px-2 py-1.5 border border-transparent focus-within:border-glass-border transition-colors">
                    <Search size={12} className="text-text-muted"/>
                    <input 
                        className="bg-transparent border-none outline-none text-xs text-white placeholder-text-muted w-full"
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-white"><X size={12}/></button>
                    )}
                </div>
            </div>

            {!searchQuery && currentFolderId && (
                <div 
                    className={`
                        px-2 py-1.5 border-b transition-all duration-200 flex items-center gap-2 text-xs relative overflow-hidden shrink-0
                        ${isBreadcrumbActive 
                            ? 'bg-neon-green/20 border-neon-green shadow-[inset_0_0_10px_rgba(74,222,128,0.2)]' 
                            : 'bg-black/40 border-white/5' 
                        }
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsBreadcrumbActive(true); }}
                    onDragLeave={() => setIsBreadcrumbActive(false)}
                    onDrop={handleDropOnBreadcrumb}
                >
                    <button 
                        onClick={() => {
                            const curr = activeAdventure?.scenes.find(s => s.id === currentFolderId);
                            setCurrentFolderId(curr?.parentId || null);
                        }}
                        className="p-1 bg-white/10 rounded hover:bg-white/20 text-white shrink-0"
                        title="Subir Nível"
                    >
                        <CornerLeftUp size={12}/>
                    </button>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-text-muted uppercase leading-none font-bold">Pasta Atual</span>
                        <span className="text-white font-mono truncate font-bold leading-tight">{currentFolderName}</span>
                    </div>
                    {isBreadcrumbActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-neon-green text-[10px] uppercase pointer-events-none backdrop-blur-[1px]">
                            Soltar para Mover Acima
                        </div>
                    )}
                </div>
            )}

            <div className="overflow-y-auto scrollbar-thin flex-1 relative min-h-[100px] p-2 bg-black/20">
                {displayItems.length === 0 && !isCreating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                        <Folder size={32} className="text-text-muted mb-2"/>
                        <p className="text-text-muted italic text-xs">Vazio</p>
                    </div>
                )}
                
                {isCreating && (
                    <div className="p-2 bg-white/5 border border-neon-green/30 rounded mb-2 animate-in fade-in">
                        <div className="flex items-center gap-2 mb-2 text-xs text-neon-green font-bold uppercase">
                            {createMode === 'folder' ? <Folder size={12}/> : <Map size={12}/>}
                            {createMode === 'folder' ? "Nova Pasta" : "Nova Cena"}
                        </div>
                        <input 
                            autoFocus 
                            placeholder="Nome..." 
                            className="w-full bg-black/50 border border-glass-border rounded px-2 py-1 text-sm text-white mb-2 outline-none focus:border-neon-green" 
                            value={newItemName} 
                            onChange={e => setNewItemName(e.target.value)} 
                            onKeyDown={e => { 
                                if (e.key === 'Enter') handleCreate(); 
                                if (e.key === 'Escape') setIsCreating(false); 
                            }} 
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-1 text-[10px] text-text-muted hover:text-white bg-white/5 rounded">Cancelar</button>
                            <button onClick={handleCreate} className="flex-1 py-1 text-[10px] bg-neon-green text-black font-bold rounded hover:bg-white">CRIAR</button>
                        </div>
                    </div>
                )}

                {displayItems.map(item => (
                    <SceneItem 
                        key={item.id}
                        item={item}
                        isActive={activeScene?.id === item.id}
                        activeSceneId={activeScene?.id}
                        onSelect={setActiveScene}
                        onEnterFolder={setCurrentFolderId}
                        onRename={handleRename}
                        onDelete={deleteScene}
                        onDuplicate={duplicateScene}
                        onMove={moveSceneItem}
                    />
                ))}
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
        <WindowWrapper containerRef={mapConfigRef} className="absolute top-16 right-4 bg-black/85 border border-glass-border backdrop-blur-sm p-4 rounded-xl shadow-2xl z-50 w-72 animate-in fade-in">
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
        { key: "G", desc: "Ajustar Tela" },
        { key: "Double Click", desc: "Criar/Editar Pin" },
        { key: "Ctrl + Click", desc: "Seleção Múltipla" },
        { key: "Ctrl + C / V", desc: "Copiar e Colar Tokens" },
        { key: "F", desc: "Espelhar Token" },
        { key: "Q / E", desc: "Rotacionar Token" },
        { key: "+ / -", desc: "Aumentar/Diminuir Token" },
        { key: "Backspace", desc: "Excluir Seleção" },
    ];

    return (
        <WindowWrapper containerRef={helpRef} className="absolute top-16 right-4 w-[280px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col z-50 shadow-2xl animate-in fade-in">
            <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl">
                <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
                    <HelpCircle size={16}/> Comandos
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white"><X size={16}/></button>
            </div>
            <div className="p-4 space-y-3 text-sm overflow-y-auto scrollbar-thin">
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


export const VTTLayout = ({ zoomValue, onZoomChange, activeTool, setActiveTool, showUI, setIsResizingBrush, alertMessage, setAlertMessage, clearAlert }) => {
  const { 
      activeAdventure, 
      activeScene, 
      setActiveAdventureId, 
      isGMWindow, 
      toggleAdventurePinVisibility,
      brushSize, setBrushSize,
      brushColor, setBrushColor,
  } = useGame();

  useEffect(() => {
      setBrushColor('#ffffff');
  }, []);

  const [uiState, setUiState] = useState({ 
      menuOpen: false, 
      libraryOpen: false, 
      mapConfigOpen: false, 
      helpOpen: false, 
      soundboardOpen: false,
      diceOpen: false 
  });
  
  const [sceneFolderId, setSceneFolderId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const headerRef = useRef(null);      

  const closeAllMenus = useCallback(() => {
      setUiState(prev => {
          if (prev.menuOpen || prev.libraryOpen || prev.mapConfigOpen || prev.helpOpen || prev.soundboardOpen || prev.diceOpen) {
              return { 
                  menuOpen: false, 
                  libraryOpen: false, 
                  mapConfigOpen: false, 
                  helpOpen: false, 
                  soundboardOpen: false,
                  diceOpen: false 
              };
          }
          return prev;
      });
  }, []);

  const isDrawingMode = activeTool === 'brush' || activeTool === 'eraser';

  useEffect(() => {
      if (isDrawingMode) {
          closeAllMenus();
      }
  }, [isDrawingMode, closeAllMenus]);

  useEffect(() => {
      const handleOutsideInteraction = (event) => {
          if (headerRef.current && headerRef.current.contains(event.target)) return;
          if (event.target.closest('[data-ecos-window="true"]')) return;
          if (uiState.menuOpen || uiState.libraryOpen || uiState.mapConfigOpen || uiState.helpOpen || uiState.soundboardOpen || uiState.diceOpen) closeAllMenus();
      };
      
      const handleKeyDown = (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') closeAllMenus(); };
      
      document.addEventListener("mousedown", handleOutsideInteraction, { capture: true });
      window.addEventListener("keydown", handleKeyDown);
      return () => {
          document.removeEventListener("mousedown", handleOutsideInteraction, { capture: true });
          window.removeEventListener("keydown", handleKeyDown);
      };
  }, [uiState, closeAllMenus]);

  const BRUSH_COLORS = [
    { hex: '#ffffff', label: 'Branco' },
    { hex: '#000000', label: 'Preto' },
    { hex: '#ef4444', label: 'Vermelho' },
    { hex: '#3b82f6', label: 'Azul' },
    { hex: '#22c55e', label: 'Verde' },
    { hex: '#eab308', label: 'Amarelo' },
  ];

  const toggle = (key, e) => {
    if (e) e.stopPropagation();
    setUiState(prev => ({
        menuOpen: key === 'menuOpen' ? !prev.menuOpen : false,
        libraryOpen: key === 'libraryOpen' ? !prev.libraryOpen : false,
        mapConfigOpen: key === 'mapConfigOpen' ? !prev.mapConfigOpen : false,
        helpOpen: key === 'helpOpen' ? !prev.helpOpen : false,
        soundboardOpen: key === 'soundboardOpen' ? !prev.soundboardOpen : false,
        diceOpen: key === 'diceOpen' ? !prev.diceOpen : false,
    }));
  };

  const ConfirmationModal = () => { 
      if (!confirmModal.open) return null; 
      return ( 
          <div data-ecos-ui="true" className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onMouseDown={e=>e.stopPropagation()}>
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
  
  const arePinsVisible = activeAdventure?.pinSettings 
      ? (isGMWindow ? activeAdventure.pinSettings.gm : activeAdventure.pinSettings.main)
      : true; 

  return (
      <div data-ecos-ui="true" className="absolute inset-0 pointer-events-none z-50">
          
          <InternalAlert message={alertMessage} clearAlert={clearAlert} />

          <div 
             ref={headerRef}
             data-ecos-ui="true"
             className={`
                absolute top-4 right-4 flex items-center bg-black/80 rounded-lg border border-glass-border shadow-lg backdrop-blur-sm pointer-events-auto z-40 overflow-hidden scale-90 origin-top-right transition-all duration-300
                ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}
                cursor-default
             `}
             onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
          >


              <div className="flex items-center gap-1 p-1.5">

                <button onClick={() => { setActiveTool('select'); closeAllMenus(); }} className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'select' ? 'bg-white/20 text-neon-green' : 'text-text-muted'}`} title="Modo Seleção"><MousePointer size={18}/></button>
                <button onClick={() => { setActiveTool('fogOfWar'); closeAllMenus(); }} className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'fogOfWar' ? 'bg-white/20 text-neon-purple' : 'text-text-muted'}`} title="Fog of War"><Square size={18}/></button>

                <div className="w-px h-6 bg-glass-border mx-1"></div>

                <button 
                    onClick={() => { setActiveTool('brush'); closeAllMenus(); }} 
                    className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'brush' ? 'bg-white/20 text-white' : 'text-text-muted'}`} 
                    title="Pincel"
                >
                    <PenTool size={18}/>
                </button>
                
                <button 
                    onClick={() => { setActiveTool('eraser'); closeAllMenus(); }} 
                    className={`p-2 rounded hover:bg-white/10 transition ${activeTool === 'eraser' ? 'bg-white/20 text-red-400' : 'text-text-muted'}`} 
                    title="Borracha"
                >
                    <Eraser size={18}/>
                </button>

                <div className="w-px h-6 bg-glass-border mx-1"></div>

                <div className="flex-1 flex items-center min-w-[380px]">
                    {isDrawingMode ? (
                        <div className="flex-1 flex items-center gap-3 px-2 w-full">
                                
                                {activeTool === 'brush' && (
                                    <div className="flex items-center gap-1.5 border-r border-glass-border pr-3 mr-1 shrink-0">
                                        {BRUSH_COLORS.map((c) => (
                                            <button
                                                key={c.hex}
                                                onClick={() => setBrushColor(c.hex)}
                                                className={`w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-all relative flex items-center justify-center ${brushColor === c.hex ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : ''}`}
                                                style={{ backgroundColor: c.hex }}
                                                title={c.label}
                                            >
                                            {brushColor === c.hex && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/50 mix-blend-difference" />
                                            )}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">
                                        {'Tamanho'}
                                    </span>
                                </div>
                                
                                <input 
                                  type="range" 
                                  min="2" 
                                  max="150" 
                                  step="2"
                                  value={brushSize} 
                                  onChange={(e) => setBrushSize(Number(e.target.value))}
                                  onMouseDown={() => setIsResizingBrush(true)}
                                  onMouseUp={() => setIsResizingBrush(false)}
                                  onTouchStart={() => setIsResizingBrush(true)}
                                  onTouchEnd={() => setIsResizingBrush(false)}
                                  className={`h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:bg-white ${activeTool === 'brush' ? 'w-[165px]' : 'w-[344px]'}`}
                              />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-end gap-1">
                            <button onClick={(e) => toggle('menuOpen', e)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded text-white transition border border-transparent hover:border-glass-border mr-auto">
                                <Map size={16} className="text-neon-green"/>
                                <span className="font-rajdhani font-bold uppercase text-sm truncate max-w-[120px]">
                                    {activeScene?.name ? (activeScene.name.length > 15 ? activeScene.name.substring(0, 15) + '...' : activeScene.name) : "Sem Cena"}
                                </span>
                                <ChevronDown size={14} className="text-text-muted"/>
                            </button>

                            <div className="w-px h-6 bg-glass-border mx-1"></div>

                            <button onClick={() => toggleAdventurePinVisibility(isGMWindow)} className={`p-2 rounded hover:bg-white/10 transition ${arePinsVisible ? 'text-text-muted' : 'text-text-muted opacity-50'}`} title={arePinsVisible ? "Ocultar Pins" : "Mostrar Pins"}>
                                {arePinsVisible ? <MapPin size={18}/> : <MapPinOff size={18}/>}
                            </button>

                            <div className="w-px h-6 bg-glass-border mx-1"></div>

                            <button onClick={(e) => toggle('mapConfigOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.mapConfigOpen ? 'text-neon-blue' : 'text-text-muted'}`} title="Configurar Fundo"><ImageIcon size={18}/></button>
                            <button onClick={(e) => toggle('libraryOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.libraryOpen ? 'text-yellow-500' : 'text-text-muted'}`} title="Biblioteca"><Box size={18}/></button>
                            
                            <div className="w-px h-6 bg-glass-border mx-1"></div>

                            <button onClick={(e) => toggle('soundboardOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.soundboardOpen ? 'text-pink-500' : 'text-text-muted'}`} title="Soundboard"><Speaker size={18}/></button>
                            <button onClick={(e) => toggle('diceOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.diceOpen ? 'text-neon-purple' : 'text-text-muted'}`} title="Dados"><Dices size={18}/></button>

                            <div className="w-px h-6 bg-glass-border mx-1"></div>

                            <button onClick={(e) => toggle('helpOpen', e)} className={`p-2 rounded hover:bg-white/10 transition ${uiState.helpOpen ? 'text-white' : 'text-text-muted'}`} title="Ajuda"><HelpCircle size={18}/></button>
                            <button onClick={(e) => { e.stopPropagation(); closeAllMenus(); setConfirmModal({ open: true, message: "Sair da aventura?", onConfirm: () => setActiveAdventureId(null) }); }} className="p-2 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500" title="Sair"><LogOut size={18}/></button>
                        </div>
                    )}
                </div>
              </div>
          </div>

          {showUI && (
            <>
              <MapConfigModal isOpen={uiState.mapConfigOpen} onClose={() => setUiState(p => ({...p, mapConfigOpen: false}))} />
              <AssetDock isOpen={uiState.libraryOpen} onClose={() => setUiState(p => ({...p, libraryOpen: false}))} />
              
              <SceneSelector 
                isOpen={uiState.menuOpen} 
                currentFolderId={sceneFolderId} 
                setCurrentFolderId={setSceneFolderId} 
              />
              
              <HelpWindow isOpen={uiState.helpOpen} onClose={() => setUiState(p => ({...p, helpOpen: false}))} />
              {uiState.soundboardOpen && <SoundboardWindow onClose={() => setUiState(p => ({...p, soundboardOpen: false}))} WindowWrapperComponent={WindowWrapper} />}
              {uiState.diceOpen && <DiceWindow onClose={() => setUiState(p => ({...p, diceOpen: false}))} WindowWrapperComponent={WindowWrapper} />}
              <ConfirmationModal />
            </>
          )}
      </div>
  );
};