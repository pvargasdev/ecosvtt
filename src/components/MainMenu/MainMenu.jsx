import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import { Plus, Search, Monitor, Import, Loader2, X, AlertTriangle, Maximize, LogOut, Check } from 'lucide-react';
import AdventureCard from './AdventureCard';
import EditAdventureModal from './EditAdventureModal';
import Logo from '../../assets/logo2.png'; 

const APP_VERSION = "v1.1.0"; 
const NEON_COLOR = "text-neon-green"; 

const InternalAlert = ({ message, clearAlert }) => {
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [message]);
    const handleClose = useCallback(() => { setIsVisible(false); }, []);
    useEffect(() => {
        if (message && isVisible) {
            const timer = setTimeout(handleClose, 5000); 
            return () => clearTimeout(timer);
        }
    }, [message, isVisible, handleClose]);
    if (!message) return null;
    return (
        <div className="absolute bottom-12 left-0 w-full flex justify-center z-[100] pointer-events-none">
            <div 
                className={`
                    pointer-events-auto flex items-center gap-3 p-3 px-4
                    bg-[#18181b] border border-neon-green/30 rounded shadow-2xl 
                    text-sm text-white cursor-default
                    transition-all duration-300 ease-in-out
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ borderColor: `${NEON_COLOR}40` }}
                onTransitionEnd={() => { if (!isVisible) { clearAlert(); } }}
            >
                <AlertTriangle size={16} className="text-neon-green shrink-0"/>
                <span className='font-medium tracking-wide text-xs uppercase'>{message}</span>
                <button onClick={handleClose} className="text-gray-500 hover:text-white shrink-0 ml-4"><X size={14}/></button>
            </div>
        </div>
    );
};

const MainMenu = () => {
    const { 
        adventures = [], 
        createAdventure, setActiveAdventureId, 
        deleteAdventure, updateAdventure, duplicateAdventure, 
        importAdventure, exportAdventure, 
        isGMWindow, isGMWindowOpen 
    } = useGame() || {}; 

    const [searchTerm, setSearchTerm] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [newAdvName, setNewAdvName] = useState("");
    const [importing, setImporting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [editingAdventure, setEditingAdventure] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    
    const importRef = useRef(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    };

    const handleQuit = () => {
        if (window.electron && window.electron.quit) {
            window.electron.quit();
        } else {
            window.close();
        }
    };

    if (isGMWindow) {
        return (
            <div className="w-full h-full bg-[#09090b] flex flex-col items-center justify-center text-white overflow-hidden relative font-inter select-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f1f23_0%,_#000000_100%)] opacity-100 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-32 h-32 rounded-3xl border border-white/5 bg-white/[0.02] flex items-center justify-center mb-8 shadow-2xl relative group">
                        <Monitor size={48} className="text-gray-200 opacity-80 group-hover:opacity-100 transition-opacity" strokeWidth={1} />
                        
                        <div className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_#39ff14] animate-pulse" />
                    </div>
                    
                    <h1 className="text-3xl font-rajdhani font-bold text-white tracking-[0.3em] uppercase mb-4 opacity-90">
                        Tela do Mestre
                    </h1>
                    
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-white/5 bg-white/[0.02]">
                        <div className="w-1 h-1 rounded-full bg-gray-500" />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                            Aguardando Seleção de Aventura
                        </p>
                    </div>
                </div>


                <div className="absolute bottom-8 right-8 z-20">
                    <button onClick={toggleFullscreen} className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 transition-all hover:scale-105 shadow-lg" title="Tela Cheia (F11)">
                        <Maximize size={18}/>
                    </button>
                </div>
            </div>
        );
    }

    const filteredAdventures = adventures.filter(adv => {
        if (!adv || !adv.name) return false;
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(adv.name).includes(normalize(searchTerm));
    });

    const handleCreate = () => {
        const name = newAdvName.trim() || "Nova Aventura";
        if (createAdventure) createAdventure(name);
        setNewAdvName("");
        setIsCreating(false);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        try { if(importAdventure) await importAdventure(file); } 
        catch (e) { setAlertMessage("Erro ao importar aventura."); } 
        finally { setImporting(false); e.target.value = null; }
    };

    return (
        <div className="w-full h-full bg-[#09090b] text-white overflow-hidden flex flex-col relative z-50 font-inter">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f1f23_0%,_#000000_100%)] opacity-100 pointer-events-none" />
            
            <InternalAlert message={alertMessage} clearAlert={() => setAlertMessage(null)} />

            <div className="relative z-10 px-8 py-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <img src={Logo} alt="Logo" className="h-8 opacity-100 drop-shadow-lg" />
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-white transition-colors"/>
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="bg-transparent border border-white/5 rounded-full h-9 pl-10 pr-4 text-xs text-white outline-none w-56 transition-all focus:w-72 focus:bg-white/5 hover:border-white/10 placeholder-gray-600 focus:border-neon-green"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="h-6 w-px bg-white/5 mx-2"></div>
                    
                    {window.electron && (
                        <button 
                            onClick={() => window.electron.openGMWindow()} 
                            className={`h-9 px-3 rounded flex items-center gap-2 text-xs font-bold transition-all border border-transparent ${isGMWindowOpen ? 'bg-white/5 text-neon-green border-neon-green/20 shadow-[0_0_10px_rgba(57,255,20,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            title={isGMWindowOpen ? "Janela do Mestre Aberta" : "Abrir Janela do Mestre"}
                        >
                            <Monitor size={16} />
                            <span className="hidden xl:inline">TELA DO MESTRE</span>
                        </button>
                    )}

                    <button 
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 h-9 px-4 rounded text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {importing ? <Loader2 size={14} className="animate-spin text-neon-green"/> : <Import size={14}/>}
                        <span>IMPORTAR</span>
                    </button>
                    <input ref={importRef} type="file" className="hidden" accept=".zip" onChange={handleImport} />

                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 h-9 px-5 bg-neon-green text-black rounded text-xs font-bold hover:bg-white active:scale-95 transition-all shadow-[0_0_15px_rgba(57,255,20,0.1)]"
                    >
                        <Plus size={16} strokeWidth={3} />
                        <span>NOVA AVENTURA</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-4 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                
                {isCreating && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#121214] border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-rajdhani font-bold text-white mb-6 uppercase tracking-wider">Criar Nova Aventura</h2>
                            <input 
                                autoFocus
                                className="w-full bg-black/40 border-b border-white/20 py-2 px-3 text-white outline-none focus:border-neon-green transition-colors mb-8 text-lg font-rajdhani font-bold placeholder-white/10"
                                placeholder="Nome da aventura..."
                                value={newAdvName}
                                onChange={e => setNewAdvName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
                            />
                            <div className="flex gap-4">
                                <button onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded text-gray-500 hover:text-white transition font-bold text-xs uppercase tracking-wider hover:bg-white/5">Cancelar</button>
                                <button onClick={handleCreate} className="flex-1 py-3 bg-neon-green rounded text-black font-bold hover:bg-white transition text-xs uppercase tracking-widest shadow-lg">Criar</button>
                            </div>
                        </div>
                    </div>
                )}

                {confirmDelete && (
                     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200" onMouseDown={(e) => { e.stopPropagation(); setConfirmDelete(null); }}>
                        <div className="bg-ecos-bg border border-glass-border p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4" onMouseDown={(e) => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-white mb-2">Excluir Aventura?</h3>
                            <p className="text-text-muted mb-6">Esta ação é irreversível e apagará todos os dados desta aventura.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-glass rounded text-white hover:bg-white/10 transition-colors">Cancelar</button>
                                <button onClick={() => { deleteAdventure(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2 bg-red-600 rounded text-white font-bold hover:bg-red-500 transition-colors">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 pt-4">
                    
                    <div 
                        onClick={() => setIsCreating(true)}
                        className="group relative aspect-[3/4] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-neon-green/50 hover:bg-white/[0.02] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(57,255,20,0.05)]"
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-white/5 bg-white/[0.03] group-hover:bg-neon-green group-hover:border-neon-green group-hover:scale-110 transition-all duration-500 shadow-xl">
                            <Plus size={28} className="text-gray-600 group-hover:text-black transition-colors duration-300" strokeWidth={2.5} />
                        </div>
                        <span className="font-rajdhani font-bold text-gray-600 group-hover:text-white transition-colors duration-300 tracking-[0.2em] uppercase text-xs">
                            Nova Aventura
                        </span>
                    </div>

                    {filteredAdventures.map(adv => (
                        <AdventureCard 
                            key={adv.id}
                            adventure={adv}
                            onPlay={() => setActiveAdventureId(adv.id)}
                            onEdit={() => setEditingAdventure(adv)}
                            onDuplicate={() => duplicateAdventure(adv.id)}
                            onDelete={() => setConfirmDelete(adv.id)}
                            onExport={() => exportAdventure(adv.id)}
                        />
                    ))}
                </div>
            </div>

            <div className="relative z-10 px-8 py-6 flex items-center justify-between shrink-0 text-xs text-gray-600">
                 <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-mono uppercase tracking-widest transition-opacity cursor-default">
                        {APP_VERSION}
                    </span>
                 </div>

                 <div className="flex items-center gap-4">
                    <button onClick={toggleFullscreen} className="p-2 rounded text-gray-600 hover:text-white hover:bg-white/5 transition flex items-center gap-2" title="Tela Cheia (F11)">
                        <Maximize size={14}/>
                    </button>
                    
                    <button onClick={handleQuit} className="p-2 rounded text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition flex items-center gap-2" title="Sair do Programa">
                        <LogOut size={14}/>
                    </button>
                 </div>
            </div>

            {editingAdventure && (
                <EditAdventureModal 
                    adventure={editingAdventure}
                    onClose={() => setEditingAdventure(null)}
                    onSave={updateAdventure}
                    onAlert={setAlertMessage}
                />
            )}
        </div>
    );
};

export default MainMenu;