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
        title: initialData?.title || "Novo Pin",
        description: initialData?.description || "",
        icon: initialData?.icon || "MapPin",
        color: initialData?.color || "#ffffff",
        linkedSceneId: initialData?.linkedSceneId || "",
        visibleToPlayers: initialData?.visibleToPlayers ?? true, // Default true
        x: initialData ? initialData.x : position.x,
        y: initialData ? initialData.y : position.y,
        id: initialData?.id || null // Se tiver ID é edição, senão é criação
    });

    const handleSave = () => {
        if (!formData.title.trim()) return;
        onSave(formData);
        onClose();
    };

    return (
        <div 
            // CORREÇÃO AQUI: Adicionado 'pointer-events-auto' para permitir cliques e interação
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto" 
            onClick={onClose}
        >
            <div 
                className="bg-ecos-bg border border-glass-border p-5 rounded-xl shadow-2xl w-full max-w-sm relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <h3 className="font-rajdhani font-bold text-white text-lg">
                        {formData.id ? "Editar Pin" : "Novo Pin"}
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Título</label>
                        <input 
                            autoFocus
                            className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-neon-green"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Descrição</label>
                        <textarea 
                            rows={3}
                            className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-neon-green resize-none"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* Link de Cena */}
                    <div>
                        <label className="text-xs text-text-muted block mb-1">Link para cena (Opcional)</label>
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

                    {/* Visibilidade (Lógica Invertida) */}
                    <label className="flex items-center gap-2 cursor-pointer border border-glass-border p-2 rounded hover:bg-white/5 transition-colors">
                        <input 
                            type="checkbox" 
                            // Se visibleToPlayers é TRUE (padrão), Checked é FALSE.
                            checked={!formData.visibleToPlayers}
                            // Ao clicar, setamos visibleToPlayers para o inverso do checkbox (Se check=true, visible=false)
                            onChange={e => setFormData({...formData, visibleToPlayers: !e.target.checked})}
                            className="accent-neon-green w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm text-white select-none">Visível apenas na tela do mestre?</span>
                    </label>

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