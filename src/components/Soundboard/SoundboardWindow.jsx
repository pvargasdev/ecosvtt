import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { X, ListMusic, Grid } from 'lucide-react';
import PlaylistView from './PlaylistView';
import PlayerBar from './PlayerBar';
import SFXGrid from './SFXGrid';

const SoundboardWindow = ({ onClose, containerRef, WindowWrapperComponent }) => {
    const { soundboard, addPlaylist } = useGame();
    const [activeTab, setActiveTab] = useState('music');

    useEffect(() => {
        if (soundboard.playlists.length === 0) {
            addPlaylist("Padrão");
        }
    }, [soundboard.playlists.length, addPlaylist]);

    const renderContent = () => {
        if (activeTab === 'music') {
            return <PlaylistView />;
        }
        return <SFXGrid />;
    };

    const Wrapper = WindowWrapperComponent || 'div';

    return (
        <Wrapper containerRef={containerRef} 
            className="absolute top-16 right-4 w-[437px] h-[calc(100vh-80px)] max-h-[500px] bg-black/90 border border-glass-border backdrop-blur-xl rounded-xl shadow-2xl z-40 flex flex-col animate-in fade-in overflow-hidden"
        >
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
            </div>

            <div className="flex-1 overflow-hidden bg-black/40 relative">
                {renderContent()}
            </div>

            {activeTab === 'music' && (
                <PlayerBar />
            )}
        </Wrapper>
    );
};

export default SoundboardWindow;