import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { X, ListMusic, Grid, Volume2 } from 'lucide-react';
import PlaylistView from './PlaylistView';
import PlayerBar from './PlayerBar';
import SFXGrid from './SFXGrid';

// Reutilizamos o WindowWrapper definido no VTTLayout (ou importamos se estiver exportado)
// Assumindo que você exportará o WindowWrapper do VTTLayout ou duplicará aqui por simplicidade.
// Para este exemplo, vou assumir que ele é passado como prop ou importado.
// Se não for possível importar, use uma div simples com as mesmas classes.

const SoundboardWindow = ({ onClose, containerRef, WindowWrapperComponent }) => {
    const { soundboard, addPlaylist } = useGame();
    const [activeTab, setActiveTab] = useState('music'); // 'music' | 'sfx'

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
        // AGORA RENDERIZA A GRADE REAL
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
                <button onClick={onClose} className="p-2 text-text-muted hover:text-white mb-1"><X size={18}/></button>
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