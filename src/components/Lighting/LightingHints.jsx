import React from 'react';
import { useTranslation } from '../../i18n';

// Dicas contextuais do modo de iluminação (rodapé), para a ferramenta ser descoberta
// sem precisar de manual.
const LightingHints = ({ tool, selection, visible }) => {
    const t = useTranslation();
    let hint = tool;
    const editsWalls = tool === 'select' || tool === 'wall';
    if (editsWalls && selection?.kind === 'segment') hint = 'segmentSelected';
    if (editsWalls && selection?.kind === 'vertex') hint = 'vertexSelected';
    const parts = t(`lighting.hints.${hint}`).split('|');

    return (
        <div className={`absolute bottom-4 left-0 w-full flex justify-center pointer-events-none z-40 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 px-4 py-2 rounded-lg bg-black/80 border border-glass-border backdrop-blur-sm text-[11px] text-text-muted max-w-[90vw]">
                {parts.map((p, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20" />}
                        <span>
                            {p.trim().split(/(\[[^\]]+\])/).map((chunk, j) => (
                                chunk.startsWith('[') ? <b key={j} className="text-white font-bold">{chunk.slice(1, -1)}</b> : chunk
                            ))}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default LightingHints;
