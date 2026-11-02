import React, { useEffect, useMemo, useRef } from 'react';
import { computeLightingExtent, createVisibilityCache, renderLightMap } from '../../lighting/renderLightMap';

const GM_DARKNESS_OPACITY = 0.55;
const FULL_QUALITY_DELAY = 180;

// Camada de luz da cena (no espaço do mundo, dentro da transformação da câmera).
// O mestre vê a escuridão atenuada, para conseguir trabalhar no mapa; os jogadores
// veem a escuridão real. Durante arrastos o mapa de luz é redesenhado em resolução
// menor e volta à qualidade total logo que a interação para.
const LightingLayer = ({ lighting, mapRect, seesAsGM, previewAsPlayer, interactive }) => {
    const canvasRef = useRef(null);
    const cacheRef = useRef(createVisibilityCache());
    const frameRef = useRef(null);
    const fullQualityTimerRef = useRef(null);

    const extent = useMemo(
        () => computeLightingExtent(lighting, mapRect),
        [lighting, mapRect]
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        cancelAnimationFrame(frameRef.current);
        clearTimeout(fullQualityTimerRef.current);
        frameRef.current = requestAnimationFrame(() => {
            renderLightMap(canvas, lighting, extent, { cache: cacheRef.current, interactive });
        });
        if (interactive) {
            fullQualityTimerRef.current = setTimeout(() => {
                renderLightMap(canvas, lighting, extent, { cache: cacheRef.current, interactive: false });
            }, FULL_QUALITY_DELAY);
        }
        return () => { cancelAnimationFrame(frameRef.current); clearTimeout(fullQualityTimerRef.current); };
    }, [lighting, extent, interactive]);

    // Limpa do cache luzes que não existem mais.
    useEffect(() => {
        const ids = new Set(lighting.lights.map(l => l.id));
        cacheRef.current.forEach((_, id) => { if (!ids.has(id)) cacheRef.current.delete(id); });
    }, [lighting.lights]);

    const opacity = seesAsGM && !previewAsPlayer ? GM_DARKNESS_OPACITY : 1;

    return (
        <canvas
            ref={canvasRef}
            className="absolute pointer-events-none"
            style={{
                left: extent.x, top: extent.y, width: extent.w, height: extent.h,
                mixBlendMode: 'multiply', opacity, zIndex: 21,
                transition: 'opacity 0.3s ease'
            }}
        />
    );
};

export default LightingLayer;
