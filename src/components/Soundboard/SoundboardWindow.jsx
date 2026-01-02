import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { X, ListMusic, Grid, Save, Upload, MoreVertical } from 'lucide-react';
import PlaylistView from './PlaylistView';
import PlayerBar from './PlayerBar';
import SFXGrid from './SFXGrid';

const SoundboardWindow = ({ onClose, containerRef, WindowWrapperComponent }) => {
    const { soundboard, addPlaylist, exportSoundboard, importSoundboard } = useGame();
    const [activeTab, setActiveTab] = useState('music');
    const [showMenu, setShowMenu] = useState(false); // Estado para dropdown
    const importRef = useRef(null);

    // Garante que exista pelo menos uma playlist ao abrir
    useEffect(() => {
        if (soundboard.playlists.length === 0) {
            addPlaylist("Padrão");
        }
    }, [soundboard.playlists.length, addPlaylist]);

    // Renderiza o conteúdo da aba
    const renderContent = () => {
        if (activeTab === 'music') {
            return <PlaylistView />;
        }
        return <SFXGrid />;
    };

    const Wrapper = WindowWrapperComponent || 'div'; // Fallback

    return (
        <Wrapper containerRef={containerRef} className="absolute top-16 left-1/2 -translate-x-1/2 w-[500px] h-[600px] bg-black/90 border border-glass-border backdrop-blur-xl rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-2 pt-2 border-b border-white/5 shrink-0 bg-[#0a0a0a]">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveTab('music')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold font-rajdhani flex items-center gap-2 transition-colors ${activeTab === 'music' ? 'bg-white/10 text-white border-t border-x border-white/10' : 'text-text-muted hover:text-white'}`}
                    >
                        <ListMusic size={14} /> MÚSICA
                    </button>
                    <button 
                        onClick={() => setActiveTab('sfx')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold font-rajdhani flex items-center gap-2 transition-colors ${activeTab === 'sfx' ? 'bg-white/10 text-white border-t border-x border-white/10' : 'text-text-muted hover:text-white'}`}
                    >
                        <Grid size={14} /> EFEITOS (SFX)
                    </button>
                </div>
                
                <div className="flex items-center gap-1 mb-1">
                    {/* Botão de Menu de Dados */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded transition"
                            title="Opções e Backup"
                        >
                            <MoreVertical size={18}/>
                        </button>

                        {/* Dropdown Menu */}
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-black/95 border border-glass-border rounded-lg shadow-xl z-50 flex flex-col p-1 animate-in fade-in zoom-in-95">
                                <button 
                                    onClick={() => { exportSoundboard(); setShowMenu(false); }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-white hover:bg-white/10 rounded text-left transition"
                                >
                                    <Save size={14} /> Exportar Backup (.zip)
                                </button>
                                
                                <button 
                                    onClick={() => { importRef.current.click(); setShowMenu(false); }}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-white hover:bg-white/10 rounded text-left transition"
                                >
                                    <Upload size={14} /> Importar Backup
                                </button>
                                {/* Input invisível para importação */}
                                <input 
                                    ref={importRef} 
                                    type="file" 
                                    accept=".zip" 
                                    className="hidden" 
                                    onChange={(e) => { 
                                        const file = e.target.files[0]; 
                                        if(file) importSoundboard(file); 
                                        e.target.value = null; 
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <button onClick={onClose} className="p-2 text-text-muted hover:text-white"><X size={18}/></button>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 overflow-hidden bg-black/40 relative">
                {renderContent()}
            </div>

            {/* Player Bar (Fixo no fundo se for aba de música) */}
            {activeTab === 'music' && (
                <PlayerBar />
            )}
        </Wrapper>
    );
};

export default SoundboardWindow;