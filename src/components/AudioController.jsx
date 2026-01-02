// src/components/AudioController.jsx
import React, { useEffect } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useGame } from '../context/GameContext';

const AudioController = () => {
    // Apenas instanciar o hook é suficiente para que ele comece a "ouvir" o contexto
    // e tocar as músicas de fundo.
    const { triggerSfx } = useAudioEngine();
    
    // Você pode usar o triggerSfx aqui se implementar uma fila de SFX no contexto futuramente.
    // Por enquanto, ele apenas mantém o motor de música vivo.

    return null; // Componente invisível
};

export default AudioController;