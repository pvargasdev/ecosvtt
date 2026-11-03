import React, { useEffect, useMemo, useRef } from 'react';
import { computeLightingExtent, createVisibilityCache, renderLightMap } from '../../lighting/renderLightMap';
import { applyFlicker, flickerKey, hasFlicker } from '../../lighting/flicker';

const GM_DARKNESS_OPACITY = 0.55;
const FULL_QUALITY_DELAY = 180;

// Camada de luz da cena (no espaço do mundo, dentro da transformação da câmera).
// O mestre vê a escuridão atenuada, para conseguir trabalhar no mapa; os jogadores
// veem a escuridão real. Durante arrastos o mapa de luz é redesenhado em resolução
// menor e volta à qualidade total logo que a interação para. Luzes que piscam fazem
// a camada ser redesenhada só quando alguma delas troca de cor.
const LightingLayer = ({ lighting, mapRect, seesAsGM, previewAsPlayer, interactive }) => {
    const canvasRef = useRef(null);
    const cacheRef = useRef(createVisibilityCache());
    const frameRef = useRef(null);
    const fullQualityTimerRef = useRef(null);
    const flickerKeyRef = useRef('');

    const extent = useMemo(
        () => computeLightingExtent(lighting, mapRect),
        [lighting, mapRect]
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        cancelAnimationFrame(frameRef.current);
        clearTimeout(fullQualityTimerRef.current);
        const draw = (quality) => renderLightMap(canvas, applyFlicker(lighting, flickerKeyRef.current), extent, { cache: cacheRef.current, interactive: quality });
        frameRef.current = requestAnimationFrame(() => draw(interactive));
        if (interactive) {
            fullQualityTimerRef.current = setTimeout(() => draw(false), FULL_QUALITY_DELAY);
        }

        let flickerFrame = null;
        if (lighting.lights.some(hasFlicker)) {
            const tick = (now) => {
                const key = flickerKey(lighting.lights, now / 1000);
                if (key !== flickerKeyRef.current) { flickerKeyRef.current = key; draw(interactive); }
                flickerFrame = requestAnimationFrame(tick);
            };
            flickerFrame = requestAnimationFrame(tick);
        } else {
            flickerKeyRef.current = '';
        }
        return () => {
            cancelAnimationFrame(frameRef.current);
            cancelAnimationFrame(flickerFrame);
            clearTimeout(fullQualityTimerRef.current);
        };
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
