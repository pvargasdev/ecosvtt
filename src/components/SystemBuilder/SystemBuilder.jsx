import React, { useState, useEffect } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    pointerWithin, // Importante para detectar colisão baseada no cursor
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    defaultDropAnimationSideEffects,
    useDraggable
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy, 
    useSortable,
    defaultAnimateLayoutChanges
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Plus, Trash2, Save, X, Layout, 
    Square, ArrowLeft, Minus, Layers, GripHorizontal, Palette, Copy
} from 'lucide-react';
import * as GenericSystem from '../../systems/generic_system';
import { useGame } from '../../context/GameContext';

const REGISTRY = GenericSystem.WIDGET_REGISTRY || {};

// Tipos que aceitam cor
const COLOR_SUPPORTED_TYPES = ['attributes', 'resources', 'headers', 'separators', 'toggles', 'longTexts'];

// --- COMPONENTES AUXILIARES ---

const WidgetPreview = ({ type, label, color }) => {
    const Comp = REGISTRY[type]?.comp;
    if (Comp) return <Comp data={{ label, color }} readOnly={true} value={0} />;
    return (
        <div className="p-3 bg-[#1a1a20] text-white rounded-lg border border-white/10 shadow-xl flex items-center justify-between" 
             style={{ borderColor: color }}>
            <span className="text-xs font-bold uppercase tracking-wider">{label || type}</span>
            {color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}/>}
        </div>
    );
};

const SidebarItem = ({ type, config }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sidebar_${type}`,
        data: { type, label: config.label, isSidebar: true }
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes}
             className={`w-full flex items-center gap-3 p-3 rounded-lg border border-transparent bg-white/5 hover:bg-white/10 cursor-grab active:cursor-grabbing transition-all select-none group mb-2
             ${isDragging ? 'opacity-40 ring-1 ring-[#d084ff]' : ''}`}>
            <div className="p-1.5 bg-black/50 rounded-md group-hover:bg-[#d084ff]/20 transition-colors">
                 <Plus size={12} className="text-gray-500 group-hover:text-[#d084ff]"/>
            </div>
            <span className="text-xs text-gray-300 font-medium group-hover:text-white">{config.label}</span>
        </div>
    );
};

const SortableWidget = ({ id, data, isSelected, onSelect }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id,
        data: { type: 'widget', ...data }
    });
    
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, 
    };

    const WidgetComp = REGISTRY[data.type]?.comp;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
             onClick={(e) => {
                 if (!isDragging) {
                    e.stopPropagation();
                    onSelect();
                 }
             }}
             className={`relative mb-3 touch-none select-none cursor-grab active:cursor-grabbing group h-full
             ${isSelected ? 'z-10' : 'z-0'}`}>
            
            <div className={`
                relative rounded-xl border transition-all duration-200 overflow-hidden bg-[#0e0e12] flex flex-col min-h-[60px] pointer-events-none h-full
                ${isSelected 
                    ? 'border-[#d084ff] shadow-[0_0_0_1px_#d084ff] bg-[#1a1a20]' 
                    : 'border-white/5 group-hover:border-white/20 group-hover:bg-[#15151a]'}
            `}>
                <div className="p-1 flex-1 flex flex-col justify-center">
                    {WidgetComp ? <WidgetComp data={data} readOnly={true} value={data.defaultValue} /> : <div className="p-2 text-xs text-red-500">Erro</div>}
                </div>
            </div>
        </div>
    );
};

const SortableColumn = ({ id, items, children }) => {
    const { setNodeRef, isOver } = useSortable({ 
        id, 
        data: { type: 'container' },
        animateLayoutChanges: (args) => defaultAnimateLayoutChanges({...args, wasDragging: true})
    });

    return (
        <div ref={setNodeRef} 
             className={`flex-1 min-h-[120px] rounded-xl p-2 flex flex-col gap-0 transition-all duration-300
             ${isOver ? 'bg-[#d084ff]/5 border-2 border-[#d084ff]/30' : 'border border-dashed border-white/5 bg-black/20 hover:border-white/10'}`}>
            {items.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-white/10 select-none pointer-events-none gap-2">
                    <Square size={24} strokeWidth={1} />
                    <span className="text-[9px] uppercase tracking-widest">Solte Aqui</span>
                </div>
            )}
            {children}
        </div>
    );
};

const SortableRow = ({ row, rowId, itemsDef, onDelete, onSelectWidget, selectedWidgetId, onChangeColumns }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: rowId, 
        data: { type: 'row' } 
    });
    
    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 99 : 'auto',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} className="group/row relative mb-6 transition-all">
            <div className="absolute -top-3 right-0 z-40 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all duration-200 translate-y-2 group-hover/row:translate-y-0">
                <div className="flex bg-[#1a1a20] border border-white/10 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
                     <div {...listeners} {...attributes} className="p-1.5 hover:bg-white/10 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white border-r border-white/5" title="Mover Linha">
                        <GripHorizontal size={14} />
                    </div>
                    <button onClick={() => onChangeColumns(rowId, -1)} className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border-r border-white/5"><Minus size={14} /></button>
                    <button onClick={() => onChangeColumns(rowId, 1)} className="p-1.5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 border-r border-white/5"><Plus size={14} /></button>
                    <button onClick={() => onDelete(rowId)} className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="p-1 border border-transparent rounded-xl hover:border-white/5 transition-colors">
                <div className="flex gap-4 items-stretch">
                    {row.columns.map((colItems, colIndex) => {
                        const containerId = `${rowId}-col-${colIndex}`;
                        return (
                            <SortableContext key={containerId} id={containerId} items={colItems} strategy={verticalListSortingStrategy}>
                                <SortableColumn id={containerId} items={colItems}>
                                    {colItems.map(itemId => {
                                        const itemData = itemsDef[itemId];
                                        if (!itemData) return null;
                                        return (
                                            <SortableWidget 
                                                key={itemId} 
                                                id={itemId} 
                                                data={itemData} 
                                                isSelected={selectedWidgetId === itemId}
                                                onSelect={() => onSelectWidget(itemId)}
                                            />
                                        )
                                    })}
                                </SortableColumn>
                            </SortableContext>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const SystemBuilder = ({ systemToEdit, onSave, onCancel }) => {
    const { setIsSystemBuilderOpen } = useGame();

    useEffect(() => {
        setIsSystemBuilderOpen(true);
        return () => setIsSystemBuilderOpen(false);
    }, [setIsSystemBuilderOpen]);

    const [blueprint, setBlueprint] = useState(() => ({
        name: systemToEdit?.name || "Novo Sistema",
        id: systemToEdit?.id,
        layout: systemToEdit?.layout || [], 
        items: systemToEdit?.items || {}
    }));

    const [selectedId, setSelectedId] = useState(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);
    const [dragStartSnapshot, setDragStartSnapshot] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const generateId = () => `n_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const addRow = () => {
        setBlueprint(prev => ({
            ...prev,
            layout: [...prev.layout, { id: generateId(), type: 'row', columns: [[]] }]
        }));
    };

    const deleteRow = (rowId) => {
        setBlueprint(prev => {
            const row = prev.layout.find(r => r.id === rowId);
            if (!row) return prev;
            const newItems = { ...prev.items };
            row.columns.flat().forEach(id => delete newItems[id]);
            return {
                ...prev,
                layout: prev.layout.filter(r => r.id !== rowId),
                items: newItems
            };
        });
    };

    const handleColumnChange = (rowId, delta) => {
        setBlueprint(prev => {
            const rowIndex = prev.layout.findIndex(r => r.id === rowId);
            if (rowIndex === -1) return prev;
            const row = prev.layout[rowIndex];
            const newCount = row.columns.length + delta;
            
            if (newCount < 1 || newCount > 6) return prev;
            const newColumns = [...row.columns];
            if (delta > 0) newColumns.push([]);
            else {
                const removed = newColumns.pop();
                if (removed?.length && newColumns.length > 0) {
                    newColumns[newColumns.length - 1] = [...newColumns[newColumns.length - 1], ...removed];
                }
            }
            const newLayout = [...prev.layout];
            newLayout[rowIndex] = { ...row, columns: newColumns };
            return { ...prev, layout: newLayout };
        });
    };

    const duplicateWidget = (id) => {
        const item = blueprint.items[id];
        if (!item) return;
        const newId = `${item.type}_${Date.now()}`;
        const newItem = { ...item, id: newId, label: `${item.label} (Cópia)` };
        
        const newLayout = blueprint.layout.map(row => ({
            ...row,
            columns: row.columns.map(col => {
                const idx = col.indexOf(id);
                if (idx >= 0) {
                    const newCol = [...col];
                    newCol.splice(idx + 1, 0, newId);
                    return newCol;
                }
                return col;
            })
        }));

        setBlueprint(prev => ({
            ...prev,
            layout: newLayout,
            items: { ...prev.items, [newId]: newItem }
        }));
        setSelectedId(newId);
    };

    // --- CORE DRAG LOGIC ---

    const findContainer = (id) => {
        if (!id) return null;
        if (blueprint.layout.some(r => r.id === id)) return 'root';
        if (id.includes('-col-')) return id;

        for (const row of blueprint.layout) {
            for (let i = 0; i < row.columns.length; i++) {
                if (row.columns[i].includes(id)) {
                    return `${row.id}-col-${i}`;
                }
            }
        }
        return null;
    };

    const onDragStart = ({ active }) => {
        setActiveDragId(active.id);
        setActiveDragData(active.data.current);
        if (!active.data.current?.isSidebar) {
            setDragStartSnapshot(JSON.parse(JSON.stringify(blueprint)));
        }
    };

    const onDragOver = ({ active, over }) => {
        const overId = over?.id;
        if (!overId || active.data.current?.type === 'row' || active.data.current?.isSidebar) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            // CRÍTICO: Se a coluna for a mesma, NÃO FAÇA NADA AQUI. 
            // Deixe o onDragEnd lidar com o reorder (ArrayMove).
            // Isso evita o bug do item sumir.
            return;
        }

        setBlueprint((prev) => {
            const activeItems = prev.layout
                .flatMap(r => r.columns.map((c, i) => ({ id: `${r.id}-col-${i}`, items: c })))
                .find(c => c.id === activeContainer)?.items || [];
            
            const overItems = prev.layout
                .flatMap(r => r.columns.map((c, i) => ({ id: `${r.id}-col-${i}`, items: c })))
                .find(c => c.id === overContainer)?.items || [];

            const overIndex = overItems.indexOf(overId);
            let newIndex;
            
            if (overId in prev.items) {
                // Sobre um item existente
                const isBelow = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelow ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            } else {
                // Sobre a coluna vazia
                newIndex = overItems.length + 1;
            }

            const newLayout = prev.layout.map(row => ({
                ...row,
                columns: row.columns.map((col, colIdx) => {
                    const colId = `${row.id}-col-${colIdx}`;
                    
                    if (colId === activeContainer) {
                        return col.filter(id => id !== active.id);
                    }
                    
                    if (colId === overContainer) {
                        const newCol = [...col];
                        // Remove duplicata se já existir (segurança)
                        const existingIdx = newCol.indexOf(active.id);
                        if (existingIdx !== -1) newCol.splice(existingIdx, 1);
                        
                        // Insere na nova posição
                        newCol.splice(newIndex, 0, active.id);
                        return newCol;
                    }
                    return col;
                })
            }));

            return { ...prev, layout: newLayout };
        });
    };

    const onDragEnd = ({ active, over }) => {
        // Rollback se drop inválido
        if (!over) {
            if (dragStartSnapshot && !active.data.current?.isSidebar) {
                setBlueprint(dragStartSnapshot);
            }
            setActiveDragId(null);
            setActiveDragData(null);
            setDragStartSnapshot(null);
            return;
        }

        // Sidebar Drop (Criação)
        if (active.data.current?.isSidebar) {
            const overContainer = findContainer(over.id);
            if (overContainer && overContainer !== 'root') {
                const newItemId = `${active.data.current.type}_${Date.now()}`;
                const newItemDef = {
                    id: newItemId,
                    type: active.data.current.type,
                    label: active.data.current.label,
                    defaultValue: active.data.current.type === 'toggles' ? false : 0,
                    color: '#d084ff' 
                };

                setBlueprint(prev => {
                    const newLayout = prev.layout.map(row => ({
                        ...row,
                        columns: row.columns.map((col, idx) => {
                            if (`${row.id}-col-${idx}` === overContainer) {
                                const index = col.indexOf(over.id);
                                const newCol = [...col];
                                if (index >= 0) newCol.splice(index, 0, newItemId);
                                else newCol.push(newItemId);
                                return newCol;
                            }
                            return col;
                        })
                    }));
                    return { ...prev, layout: newLayout, items: { ...prev.items, [newItemId]: newItemDef } };
                });
                setSelectedId(newItemId);
            }
        } 
        
        // Reordenação na MESMA coluna
        else {
            const activeContainer = findContainer(active.id);
            const overContainer = findContainer(over.id);

            if (activeContainer && overContainer && activeContainer === overContainer) {
                const [rId, , cIdx] = activeContainer.split('-');
                setBlueprint(prev => {
                    const rIdx = prev.layout.findIndex(r => r.id === rId);
                    const col = prev.layout[rIdx].columns[parseInt(cIdx)];
                    const oldIdx = col.indexOf(active.id);
                    const newIdx = col.indexOf(over.id);
                    if (oldIdx !== newIdx) {
                        const newLayout = [...prev.layout];
                        const newCols = [...newLayout[rIdx].columns];
                        newCols[parseInt(cIdx)] = arrayMove(col, oldIdx, newIdx);
                        newLayout[rIdx] = { ...newLayout[rIdx], columns: newCols };
                        return { ...prev, layout: newLayout };
                    }
                    return prev;
                });
            }
        }
        
        setActiveDragId(null);
        setActiveDragData(null);
        setDragStartSnapshot(null);
    };

    const activeItem = blueprint.items[selectedId];

    return (
        <div className="flex flex-col h-screen w-full bg-[#050505] text-white font-inter overflow-hidden fixed inset-0 z-50">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#0a0a0c] z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#d084ff]/10 rounded-lg border border-[#d084ff]/20">
                        <Layout className="text-[#d084ff]" size={18} />
                    </div>
                    <div className="flex flex-col">
                        <input className="bg-transparent text-lg font-bold text-white outline-none w-64 placeholder-white/20"
                            value={blueprint.name} onChange={e => setBlueprint({...blueprint, name: e.target.value})} 
                            placeholder="Nome do Sistema" />
                        <span className="text-[10px] text-gray-500 font-mono uppercase">System Builder v2.1</span>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <DndContext 
                sensors={sensors} 
                collisionDetection={pointerWithin}
                onDragStart={onDragStart} 
                onDragOver={onDragOver} 
                onDragEnd={onDragEnd}
                dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}
            >
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-[280px] bg-[#08080a] border-r border-white/5 flex flex-col p-4 overflow-y-auto shrink-0 z-10 custom-scrollbar">
                        {!activeItem ? (
                            <div className="space-y-8 animate-in slide-in-from-left-4 fade-in duration-300">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Layers size={12} className="text-[#d084ff]"/> Estrutura
                                    </div>
                                    <button onClick={addRow} className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-white/10 hover:border-[#d084ff] hover:bg-[#d084ff]/5 transition-all text-xs text-gray-400 hover:text-white group">
                                        <Plus size={14} className="group-hover:scale-110 transition-transform"/> Nova Linha
                                    </button>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Square size={12} className="text-[#d084ff]"/> Widgets
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {Object.entries(REGISTRY).map(([type, config]) => (
                                            <SidebarItem key={type} type={type} config={config} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-300">
                                <button onClick={() => setSelectedId(null)} className="mb-6 flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
                                    <ArrowLeft size={12}/> Voltar
                                </button>
                                
                                <div className="space-y-6">
                                    <div className="border-b border-white/5 pb-4">
                                        <h3 className="text-sm font-bold text-white mb-1">Editar Propriedades</h3>
                                        <p className="text-[10px] text-gray-500 font-mono">Tipo: {activeItem.type}</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Rótulo</label>
                                            <input className="w-full bg-[#15151a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#d084ff] outline-none transition-colors"
                                                value={activeItem.label} onChange={e => setBlueprint(prev => ({ ...prev, items: { ...prev.items, [selectedId]: { ...activeItem, label: e.target.value } } }))} />
                                        </div>

                                        {/* COR CONDICIONAL */}
                                        {COLOR_SUPPORTED_TYPES.includes(activeItem.type) && (
                                            <div className="bg-[#15151a] border border-white/10 rounded-lg p-3 flex items-center justify-between">
                                                <label className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-2">
                                                    <Palette size={12} /> Cor
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-mono text-gray-400">{activeItem.color || '#d084ff'}</span>
                                                    <input type="color" className="bg-transparent w-6 h-6 rounded cursor-pointer border-none p-0 overflow-hidden"
                                                        value={activeItem.color || '#d084ff'}
                                                        onChange={e => setBlueprint(prev => ({ ...prev, items: { ...prev.items, [selectedId]: { ...activeItem, color: e.target.value } } }))}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {activeItem.type === 'skills' && (
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Opções</label>
                                                <textarea className="w-full h-32 bg-[#15151a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#d084ff] outline-none resize-none font-mono"
                                                    value={(activeItem.options || []).join('\n')}
                                                    onChange={e => setBlueprint(prev => ({ ...prev, items: { ...prev.items, [selectedId]: { ...activeItem, options: e.target.value.split('\n') } } }))}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-2 border-t border-white/5 pt-6">
                                        <button onClick={() => duplicateWidget(selectedId)} 
                                            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-2">
                                            <Copy size={14}/> Duplicar
                                        </button>
                                        <button onClick={() => {
                                            const newItems = { ...blueprint.items };
                                            delete newItems[selectedId];
                                            const newLayout = blueprint.layout.map(r => ({ ...r, columns: r.columns.map(c => c.filter(id => id !== selectedId)) }));
                                            setBlueprint({ ...blueprint, layout: newLayout, items: newItems });
                                            setSelectedId(null);
                                        }} className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-2">
                                            <Trash2 size={14}/> Remover
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 overflow-y-auto bg-[#050505] p-8 pb-40 relative">
                         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                         <SortableContext items={blueprint.layout.map(r => r.id)} strategy={verticalListSortingStrategy}>
                            <div className="max-w-5xl mx-auto space-y-4">
                                {blueprint.layout.length === 0 && (
                                    <div className="h-64 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-600 gap-4">
                                        <div className="p-4 bg-white/5 rounded-full"><Layout size={32} className="opacity-50"/></div>
                                        <p className="text-sm">Comece adicionando uma <span className="text-[#d084ff] font-bold">Nova Linha</span></p>
                                    </div>
                                )}
                                {blueprint.layout.map(row => (
                                    <SortableRow 
                                        key={row.id} 
                                        rowId={row.id} 
                                        row={row} 
                                        itemsDef={blueprint.items} 
                                        onDelete={deleteRow}
                                        onSelectWidget={setSelectedId}
                                        selectedWidgetId={selectedId}
                                        onChangeColumns={handleColumnChange}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                </div>

                <DragOverlay zIndex={9999}>
                    {activeDragId ? (
                        activeDragData?.isSidebar ? (
                            <div className="w-[280px] cursor-grabbing opacity-90 rotate-2 scale-105">
                                <WidgetPreview type={activeDragData.type} label={activeDragData.label} />
                            </div>
                        ) : activeDragData?.type === 'row' ? (
                            <div className="w-[600px] h-24 bg-[#1a1a20] border border-[#d084ff] rounded-xl flex items-center justify-center shadow-2xl opacity-90">
                                <span className="text-[#d084ff] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <GripHorizontal /> Reordenando Linha
                                </span>
                            </div>
                        ) : (
                            <div className="w-full cursor-grabbing opacity-90 rotate-1 scale-105">
                                <WidgetPreview 
                                    type={blueprint.items[activeDragId]?.type} 
                                    label={blueprint.items[activeDragId]?.label} 
                                    color={blueprint.items[activeDragId]?.color}
                                />
                            </div>
                        )
                    ) : null}
                </DragOverlay>
            </DndContext>

            <div className="p-4 border-t border-white/5 bg-[#0a0a0c] flex justify-end gap-3 z-20 shrink-0">
                <button onClick={onCancel} className="px-5 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-lg transition-colors">CANCELAR</button>
                <button onClick={() => onSave(blueprint)} className="px-6 py-2 bg-[#d084ff] hover:bg-white text-black font-bold text-xs rounded-lg flex items-center gap-2 shadow-[0_0_20px_rgba(208,132,255,0.2)] transition-all transform hover:-translate-y-0.5">
                    <Save size={14}/> SALVAR SISTEMA
                </button>
            </div>
        </div>
    );
};