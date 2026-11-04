import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { X, ListMusic, Grid } from 'lucide-react';
import { useTranslation } from '../../i18n';
import PlaylistView from './PlaylistView';
import PlayerBar from './PlayerBar';
import SFXGrid from './SFXGrid';

const SoundboardWindow = ({ onClose, containerRef, WindowWrapperComponent, currentFolderId, setCurrentFolderId }) => {
    const { soundboard, addPlaylist } = useGame();
    const [activeTab, setActiveTab] = useState('music');
    const t = useTranslation();

    useEffect(() => {
        if (soundboard.playlists.length === 0) {
            addPlaylist(t('soundboard.defaultPlaylist'));
        }
    }, [soundboard.playlists.length, addPlaylist, t]);

    const renderContent = () => {
        if (activeTab === 'music') {
            return (
                <PlaylistView 
                    currentFolderId={currentFolderId} 
                    setCurrentFolderId={setCurrentFolderId} 
                />
            );
        }
        return <SFXGrid />;
    };

    const Wrapper = WindowWrapperComponent || 'div';

    return (
        <Wrapper containerRef={containerRef} 
            className="absolute top-20 right-4 bottom-4 w-[437px] bg-black/90 border border-glass-border backdrop-blur-xl rounded-xl shadow-2xl z-40 flex flex-col animate-in fade-in overflow-hidden"
        >
            <div className="flex items-center justify-between px-2 pt-2 border-b border-white/5 shrink-0 bg-[#0a0a0a]">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setActiveTab('music')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold font-rajdhani flex items-center gap-2 transition-colors ${activeTab === 'music' ? 'bg-white/10 text-white border-t border-x border-white/10' : 'text-text-muted hover:text-white'}`}
                    >
                        <ListMusic size={14} /> {t('soundboard.musicTab')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('sfx')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold font-rajdhani flex items-center gap-2 transition-colors ${activeTab === 'sfx' ? 'bg-white/10 text-white border-t border-x border-white/10' : 'text-text-muted hover:text-white'}`}
                    >
                        <Grid size={14} /> {t('soundboard.sfxTab')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-black/40 relative flex flex-col min-h-0">
                {renderContent()}
            </div>

            {activeTab === 'music' && (
                <PlayerBar />
            )}
        </Wrapper>
    );
};

export default SoundboardWindow;