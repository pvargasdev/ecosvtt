import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { X, Save, MapPin, TriangleAlert, Warehouse, Key, Skull, House, MessageCircle, Beer, DollarSign, Star } from 'lucide-react';

// Lista de ícones disponíveis para escolha
const AVAILABLE_ICONS = [
    { name: 'MapPin', Component: MapPin },
    { name: 'Star', Component: Star },
    { name: 'TriangleAlert', Component: TriangleAlert },
    { name: 'MessageCircle', Component: MessageCircle },
    { name: 'DollarSign', Component: DollarSign },
    { name: 'Key', Component: Key },
    { name: 'Skull', Component: Skull },
    { name: 'House', Component: House },
    { name: 'Warehouse', Component: Warehouse },
    { name: 'Beer', Component: Beer },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#d946ef', '#ffffff'];

const PinModal = ({ initialData, position, onSave, onClose }) => {
    const { activeAdventure } = useGame();
    
    // Estado do formulário
    const [formData, setFormData] = useState({
        title: initialData?.title || "", 
        description: initialData?.description || "",
        icon: initialData?.icon || "MapPin",
        color: initialData?.color || "#ffffff",
        linkedSceneId: initialData?.linkedSceneId || "",
        // REMOVIDO: visibleToPlayers
        x: initialData ? initialData.x : position.x,
        y: initialData ? initialData.y : position.y,
        id: initialData?.id || null 
    });

    const handleSave = () => {
        const finalTitle = formData.title.trim() === "" ? "Novo Pin" : formData.title;

        onSave({
            ...formData,
            title: finalTitle
        });
        onClose();
    };

    return (
        <div 
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" 
        >
            <div 
                className="bg-ecos-bg border border-glass-border p-5 rounded-xl shadow-2xl w-full max-w-sm relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <h3 className="font-rajdhani font-bold text-white text-lg">
                        {formData.id ? "Editar Pin" : "Novo Pin"}
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-white" title="Cancelar"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Título</label>
                        <input 
                            autoFocus
                            placeholder="Novo Pin" 
                            className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-neon-green placeholder-white/20"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Descrição (Hover)</label>
                        <textarea 
                            rows={3}
                            className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-neon-green resize-none"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* Link de Cena */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Link para Cena (Opcional)</label>
                        <select 
                            className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none"
                            value={formData.linkedSceneId}
                            onChange={e => setFormData({...formData, linkedSceneId: e.target.value})}
                        >
                            <option value="">-- Nenhum --</option>
                            {activeAdventure?.scenes.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ícone e Cor */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-text-muted block mb-1">Ícone</label>
                            <div className="grid grid-cols-5 gap-2 bg-black/30 p-2 rounded border border-white/5">
                                {AVAILABLE_ICONS.map(({ name, Component }) => (
                                    <button
                                        key={name}
                                        onClick={() => setFormData({...formData, icon: name})}
                                        className={`p-1.5 rounded flex justify-center items-center hover:bg-white/10 transition ${formData.icon === name ? 'bg-neon-green text-black' : 'text-text-muted'}`}
                                    >
                                        <Component size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs text-text-muted block mb-1">Cor</label>
                            <div className="grid grid-cols-3 gap-1">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFormData({...formData, color: c})}
                                        className={`w-6 h-6 rounded-full border-2 transition ${formData.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        className="w-full py-2 bg-neon-green text-black font-bold rounded hover:bg-white transition shadow-lg shadow-green-900/20"
                    >
                        {formData.id ? "SALVAR ALTERAÇÕES" : "CRIAR PIN"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PinModal;