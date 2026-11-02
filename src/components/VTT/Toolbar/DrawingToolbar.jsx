import React from 'react';
import { Brush, Eraser } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { SegmentedControl, ToolbarDivider } from './ToolbarParts';
import { MODE_ACCENTS } from './theme';


// Conteúdo da barra contextual do modo de desenho.
const DrawingToolbar = ({ activeTool, setActiveTool, brushColor, setBrushColor, brushSize, setBrushSize, setIsResizingBrush, colors }) => {
    const t = useTranslation();
    const isBrush = activeTool === 'brush';

    return (
        <div className="flex items-center gap-1">
            <SegmentedControl
                value={activeTool}
                onChange={setActiveTool}
                showAllLabels
                items={[
                    { id: 'brush', icon: Brush, label: t('toolbar.brush'), accent: MODE_ACCENTS.draw },
                    { id: 'eraser', icon: Eraser, label: t('toolbar.eraser'), accent: '#f87171' }
                ]}
            />

            {isBrush && (
                <>
                    <ToolbarDivider />
                    <div className="flex items-center gap-1.5 px-1">
                        {colors.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => setBrushColor(c.hex)}
                                title={c.label}
                                aria-label={c.label}
                                className={`h-5 w-5 rounded-full border border-white/20 transition-all hover:scale-110 ${brushColor === c.hex ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </>
            )}

            <ToolbarDivider />
            <div className="flex items-center gap-3 px-2">
                <span className="font-rajdhani text-[11px] font-bold uppercase tracking-wider text-text-muted">{t('toolbar.size')}</span>
                <input
                    type="range" min="2" max="150" step="2"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    onMouseDown={() => setIsResizingBrush(true)}
                    onMouseUp={() => setIsResizingBrush(false)}
                    onTouchStart={() => setIsResizingBrush(true)}
                    onTouchEnd={() => setIsResizingBrush(false)}
                    className="h-1.5 w-36 cursor-pointer appearance-none rounded-lg bg-white/20 outline-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <span className="w-8 text-right font-mono text-[11px] text-white">{brushSize}</span>
            </div>
        </div>
    );
};

export default DrawingToolbar;
