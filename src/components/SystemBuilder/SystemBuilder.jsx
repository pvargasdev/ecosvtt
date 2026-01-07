import React, { useState, useEffect } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    closestCenter, 
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
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Plus, Trash2, Save, X, Layout, GripVertical, 
    Square, Edit, Info, ArrowLeft, Minus, GripHorizontal
} from 'lucide-react';
import * as GenericSystem from '../../systems/generic_system';
import { useGame } from '../../context/GameContext';

// --- COMPONENTES AUXILIARES DND ---

// 1. Item da Sidebar (Arrastável)
const SidebarItem = ({ type, config }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sidebar_new_${type}`,
        data: { 
            type: type, 
            label: config.label,
            isSidebar: true 
        }
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} 
             className={`w-full flex items-center gap-3 p-2.5 rounded-lg border border-transparent bg-black/40 transition-all text-xs text-gray-400 group cursor-grab active:cursor-grabbing 
             ${isDragging ? 'opacity-50 ring-2 ring-[#d084ff]' : 'hover:border-white/10 hover:bg-white/5 hover:text-white'}`}>
            <Plus size={14} className="text-[#d084ff] opacity-50 group-hover:opacity-100"/>
            {config.label}
        </div>
    );
};

// 2. Item Sortable (Widget no Canvas)
const SortableItem = ({ id, data, onClick, isSelected }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        height: '100%', // Força altura 100% no estilo inline
        flex: 1         // Força flex-grow
    };

    if (!data) return null;

    const WidgetComp = GenericSystem.WIDGET_REGISTRY[data.type]?.comp;

    return (
        // ADICIONADO: 'flex-1 h-full' na div container
        <div ref={setNodeRef} style={style} {...attributes} className="group relative mb-2 flex-1 h-full flex flex-col">
            <div 
                // ADICIONADO: 'h-full' na div interna
                className={`relative rounded-xl border transition-all overflow-hidden h-full flex flex-col flex-1
                ${isSelected ? 'border-[#d084ff] ring-1 ring-[#d084ff] z-10 bg-[#0a0a0c]' : 'border-transparent hover:border-white/20 bg-[#0a0a0c]'}
                `}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
                {/* ... (Overlay e Handle mantidos iguais) ... */}
                <div {...listeners} className="absolute inset-0 bg-[#d084ff]/5 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-grab active:cursor-grabbing pointer-events-none" />
                
                <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="p-1 bg-black/80 rounded border border-white/10 text-gray-400 shadow-sm backdrop-blur-md">
                        <GripVertical size={12} />
                     </div>
                </div>

                <div className="pointer-events-none p-0.5 h-full flex-1 flex flex-col">
                     {/* WidgetComp renderizado com flex-1 para preencher */}
                    {WidgetComp ? 
                        <div className="flex-1 h-full">
                            <WidgetComp data={data} readOnly={true} value={data.defaultValue} /> 
                        </div>
                    : <div className="p-4 text-xs text-red-500">Widget Inválido</div>}
                </div>
            </div>
        </div>
    );
};

// 3. Container de Coluna
const ColumnContainer = ({ id, items, children }) => {
    const { setNodeRef, isOver } = useSortable({ id, data: { type: 'container' } });
    
    return (
        <div ref={setNodeRef} 
             // ADICIONADO: 'h-full' para ocupar toda a altura da linha
             className={`flex-1 min-h-[60px] rounded-xl p-2 transition-all flex flex-col gap-2 min-w-0 h-full
             ${isOver ? 'bg-[#d084ff]/10 border border-[#d084ff] shadow-[inset_0_0_20px_rgba(208,132,255,0.05)]' : 'border border-dashed border-white/5 hover:border-white/10'}
             `}>
            {items.length === 0 && !isOver && (
                <div className="h-full flex items-center justify-center text-[9px] text-gray-700 uppercase tracking-widest pointer-events-none opacity-30">
                    {/* Vazio */}
                </div>
            )}
            {children}
        </div>
    );
};

// 4. Linha Sortable (POLIDA)
const SortableRow = ({ row, rowId, itemsDef, onDelete, onSelectItem, selectedItemId, onChangeColumns }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowId, data: { type: 'row' } });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto'
    };

    return (
        <div ref={setNodeRef} style={style} className="group/row relative mb-2 transition-all">
            
            {/* Action Bar: Agora com z-index maior para garantir clique na ultima linha */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover/row:opacity-100 transition-all duration-200 translate-y-2 group-hover/row:translate-y-0 pointer-events-none group-hover/row:pointer-events-auto">
                <div className="flex items-center gap-1 p-1 bg-[#121216] border border-white/20 rounded-full shadow-2xl">
                    
                    {/* Drag Handle */}
                    <button {...listeners} {...attributes} className="p-1.5 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing hover:bg-white/10 rounded-full transition-colors" title="Arrastar Linha">
                        <GripHorizontal size={14} />
                    </button>

                    <div className="w-px h-3 bg-white/10 mx-0.5" />

                    {/* Columns Control */}
                    <button onClick={() => onChangeColumns(rowId, -1)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors" title="- Coluna">
                        <Minus size={12} />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-gray-300 w-4 text-center">{row.columns.length}</span>
                    <button onClick={() => onChangeColumns(rowId, 1)} className="p-1.5 text-gray-500 hover:text-[#d084ff] hover:bg-white/10 rounded-full transition-colors" title="+ Coluna">
                        <Plus size={12} />
                    </button>

                    <div className="w-px h-3 bg-white/10 mx-0.5" />

                    <button onClick={() => onDelete(rowId)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-colors" title="Excluir Linha">
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Conteúdo da Linha: REMOVIDO bg-gradient e bordas fortes */}
            <div className={`rounded-xl p-1 transition-colors ${isDragging ? 'ring-1 ring-[#d084ff] border-[#d084ff] bg-black' : 'border border-transparent'}`}>
                <div className="flex gap-4 min-h-[50px]">
                    {row.columns.map((colItems, colIndex) => {
                        const containerId = `${rowId}-col-${colIndex}`;
                        return (
                            <SortableContext key={containerId} id={containerId} items={colItems} strategy={rectSortingStrategy}>
                                <ColumnContainer id={containerId} items={colItems}>
                                    {colItems.map(itemId => {
                                        const itemData = itemsDef[itemId];
                                        if (!itemData) return null;
                                        return (
                                            <SortableItem 
                                                key={itemId} 
                                                id={itemId} 
                                                data={itemData} 
                                                onClick={() => onSelectItem(itemId, itemData.type)}
                                                isSelected={selectedItemId === itemId}
                                            />
                                        )
                                    })}
                                </ColumnContainer>
                            </SortableContext>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- SYSTEM BUILDER PRINCIPAL ---

export const SystemBuilder = ({ systemToEdit, onSave, onCancel, usageCount = 0 }) => {
    const { setIsSystemBuilderOpen } = useGame();

    useEffect(() => {
        setIsSystemBuilderOpen(true);
        return () => setIsSystemBuilderOpen(false);
    }, [setIsSystemBuilderOpen]);

    const [blueprint, setBlueprint] = useState(() => {
        const b = systemToEdit || {};
        let initialLayout = b.layout || [];
        let initialItems = b.items || {};

        if (initialLayout.length === 0) {
            initialLayout = [];
        }

        return {
            name: b.name || "Novo Sistema",
            id: b.id,
            layout: initialLayout, 
            items: initialItems,
            notes: b.notes !== false
        };
    });

    const [selectedId, setSelectedId] = useState(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);
    
    const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Adiciona uma linha padrão com 1 coluna
    const addRow = () => {
        const newRow = {
            id: generateId(),
            type: 'row', 
            columns: [[]] 
        };
        setBlueprint(prev => ({
            ...prev,
            layout: [...prev.layout, newRow]
        }));
    };

    const handleColumnChange = (rowId, delta) => {
        setBlueprint(prev => {
            const rowIndex = prev.layout.findIndex(r => r.id === rowId);
            if (rowIndex === -1) return prev;

            const row = prev.layout[rowIndex];
            const currentCount = row.columns.length;
            const newCount = currentCount + delta;

            if (newCount < 1 || newCount > 6) return prev; 

            const newColumns = [...row.columns];

            if (delta > 0) {
                newColumns.push([]); // Adiciona coluna vazia
            } else {
                // Ao remover, move itens da última coluna para a penúltima
                const itemsToSave = newColumns.pop();
                if (itemsToSave && itemsToSave.length > 0) {
                    const prevColIndex = newColumns.length - 1;
                    newColumns[prevColIndex] = [...newColumns[prevColIndex], ...itemsToSave];
                }
            }

            const newLayout = [...prev.layout];
            newLayout[rowIndex] = { ...row, columns: newColumns };
            return { ...prev, layout: newLayout };
        });
    };

    const createNewItemDef = (type) => {
        const newItemId = `${type}_${Date.now()}`;
        const defaultLabel = GenericSystem.WIDGET_REGISTRY[type]?.label || "Novo Item";
        
        const newItemDef = {
            id: newItemId,
            type,
            label: defaultLabel,
            defaultValue: type === 'toggles' ? false : 0,
            color: (type === 'attributes' || type === 'resources') ? '#d084ff' : undefined,
            options: type === 'skills' ? ['Opção 1'] : undefined
        };
        return { newItemId, newItemDef };
    };

    const deleteRow = (rowId) => {
        setBlueprint(prev => {
            const row = prev.layout.find(r => r.id === rowId);
            if (!row) return prev;
            
            const newItems = { ...prev.items };
            row.columns.flat().forEach(itemId => delete newItems[itemId]);

            return {
                ...prev,
                layout: prev.layout.filter(r => r.id !== rowId),
                items: newItems
            };
        });
    };

    // Sensores DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const findContainer = (id) => {
        if (blueprint.layout.find(r => r.id === id)) return 'root';
        for (const row of blueprint.layout) {
            for (let i = 0; i < row.columns.length; i++) {
                const colId = `${row.id}-col-${i}`;
                if (id === colId) return colId;
                if (row.columns[i].includes(id)) return colId;
            }
        }
        return null;
    };

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
        setActiveDragData(event.active.data.current);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;
        if (active.data.current?.isSidebar) return;
        if (active.data.current?.type === 'row') return;

        const activeId = active.id;
        const overId = over.id;
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === 'root' || overContainer === 'root') return;

        if (activeContainer !== overContainer) {
            setBlueprint(prev => {
                const newLayout = [...prev.layout];
                const [oldRowId, , oldColIdx] = activeContainer.split('-');
                const oldRowIndex = newLayout.findIndex(r => r.id === oldRowId);
                const oldCols = [...newLayout[oldRowIndex].columns];
                
                oldCols[parseInt(oldColIdx)] = oldCols[parseInt(oldColIdx)].filter(id => id !== activeId);
                newLayout[oldRowIndex] = { ...newLayout[oldRowIndex], columns: oldCols };

                const [newRowId, , newColIdx] = overContainer.split('-');
                const newRowIndex = newLayout.findIndex(r => r.id === newRowId);
                const newCols = [...newLayout[newRowIndex].columns];
                const overItems = newCols[parseInt(newColIdx)];
                
                let newIndex = overItems.length;
                if (overItems.includes(overId)) {
                    newIndex = overItems.indexOf(overId);
                }

                const newColItems = [...overItems];
                newColItems.splice(newIndex, 0, activeId);
                newCols[parseInt(newColIdx)] = newColItems;
                
                newLayout[newRowIndex] = { ...newLayout[newRowIndex], columns: newCols };

                return { ...prev, layout: newLayout };
            });
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragData(null);

        if (!over) return;

        // 1. Drop Sidebar Item
        if (active.data.current?.isSidebar) {
            const overContainer = findContainer(over.id);
            if (overContainer && overContainer !== 'root') {
                const { newItemId, newItemDef } = createNewItemDef(active.data.current.type);
                setBlueprint(prev => {
                    const newLayout = [...prev.layout];
                    const [rowId, , colIdx] = overContainer.split('-');
                    const rowIndex = newLayout.findIndex(r => r.id === rowId);
                    
                    if (rowIndex === -1) return prev;

                    const newCols = [...newLayout[rowIndex].columns];
                    const targetColIndex = parseInt(colIdx);
                    const overItems = newCols[targetColIndex];
                    
                    let insertIndex = overItems.length;
                    if (over.id !== overContainer) {
                        const idx = overItems.indexOf(over.id);
                        if (idx !== -1) insertIndex = idx;
                    }

                    const newColItems = [...overItems];
                    newColItems.splice(insertIndex, 0, newItemId);
                    newCols[targetColIndex] = newColItems;
                    newLayout[rowIndex] = { ...newLayout[rowIndex], columns: newCols };

                    return {
                        ...prev,
                        layout: newLayout,
                        items: { ...prev.items, [newItemId]: newItemDef }
                    };
                });
            }
            return;
        }

        // 2. Reorder Rows
        if (active.data.current?.type === 'row' && over.data.current?.type === 'row') {
            if (active.id !== over.id) {
                setBlueprint(prev => {
                    const oldIndex = prev.layout.findIndex(r => r.id === active.id);
                    const newIndex = prev.layout.findIndex(r => r.id === over.id);
                    return { ...prev, layout: arrayMove(prev.layout, oldIndex, newIndex) };
                });
            }
            return;
        }

        // 3. Reorder Items in Same Column
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        if (activeContainer && overContainer && activeContainer === overContainer) {
            const [rowId, , colIdx] = activeContainer.split('-');
            const colIndex = parseInt(colIdx);
            
            setBlueprint(prev => {
                const rowIndex = prev.layout.findIndex(r => r.id === rowId);
                const row = prev.layout[rowIndex];
                const oldIndex = row.columns[colIndex].indexOf(active.id);
                const newIndex = row.columns[colIndex].indexOf(over.id);

                if (oldIndex !== newIndex) {
                    const newLayout = [...prev.layout];
                    const newCols = [...row.columns];
                    newCols[colIndex] = arrayMove(newCols[colIndex], oldIndex, newIndex);
                    newLayout[rowIndex] = { ...row, columns: newCols };
                    return { ...prev, layout: newLayout };
                }
                return prev;
            });
        }
    };

    const updateActiveItem = (updates) => {
        if (!selectedId) return;
        setBlueprint(prev => ({
            ...prev,
            items: { ...prev.items, [selectedId]: { ...prev.items[selectedId], ...updates } }
        }));
    };

    const activeItemDef = blueprint.items[selectedId];
    const saveMode = usageCount > 0 ? 'clone' : 'overwrite';

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white w-full font-inter select-none">
             {/* HEADER */}
             <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-[#d084ff]/10 to-transparent rounded-xl border border-[#d084ff]/30 shadow-[0_0_15px_rgba(208,132,255,0.1)]">
                        <Layout className="text-[#d084ff]" size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">System Builder</h2>
                            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                            <span className="text-[9px] text-gray-600 font-mono">v2.0</span>
                        </div>
                        <input className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#d084ff] text-lg font-rajdhani font-bold text-white p-0 focus:ring-0 w-80 placeholder-white/20 transition-all outline-none"
                            value={blueprint.name} onChange={e => setBlueprint({...blueprint, name: e.target.value})} placeholder="Nome do Sistema..." />
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver} 
                onDragEnd={handleDragEnd}
            >
                <div className="flex flex-1 overflow-hidden">
                    {/* TOOLBAR */}
                    <div className="w-[280px] bg-[#0a0a0c] border-r border-white/5 flex flex-col p-4 gap-6 shrink-0 overflow-y-auto">
                        {!activeItemDef ? (
                            <div className="animate-in slide-in-from-left-2 duration-300">
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Square size={10} className="text-[#d084ff]" /> Estrutura
                                </div>
                                <button onClick={addRow} className="w-full flex flex-col items-center justify-center gap-2 p-5 bg-gradient-to-br from-white/5 to-transparent hover:from-white/10 hover:to-white/5 border border-dashed border-white/10 hover:border-[#d084ff]/50 rounded-xl transition-all group mb-8 shadow-sm">
                                    <div className="p-2 bg-black/40 rounded-full group-hover:bg-[#d084ff]/20 transition-colors">
                                        <Plus size={16} className="text-gray-400 group-hover:text-[#d084ff]"/>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-white">Adicionar Linha</span>
                                </button>

                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Square size={10} className="text-[#d084ff]" /> Widgets
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(GenericSystem.WIDGET_REGISTRY).map(([type, config]) => (
                                        <SidebarItem key={type} type={type} config={config} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right-2 duration-300 flex flex-col h-full">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#d084ff]">Editar Widget</h3>
                                    <button onClick={() => setSelectedId(null)} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors"><ArrowLeft size={10}/> Voltar</button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[9px] text-gray-400 block mb-1.5 font-bold uppercase tracking-wider">Rótulo</label>
                                        <input className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#d084ff] transition-all focus:shadow-[0_0_10px_rgba(208,132,255,0.1)]" 
                                            value={activeItemDef.label || ''} onChange={e => updateActiveItem({ label: e.target.value })} />
                                    </div>
                                    {activeItemDef.color !== undefined && (
                                        <div>
                                            <label className="text-[9px] text-gray-400 block mb-1.5 font-bold uppercase tracking-wider">Cor de Acento</label>
                                            <div className="flex gap-2 items-center bg-black/30 p-2 rounded-lg border border-white/10">
                                                <input type="color" className="h-6 w-8 bg-transparent border-none cursor-pointer rounded" 
                                                    value={activeItemDef.color} onChange={e => updateActiveItem({ color: e.target.value })} />
                                                <span className="text-[10px] text-gray-400 font-mono uppercase">{activeItemDef.color}</span>
                                            </div>
                                        </div>
                                    )}
                                    {activeItemDef.type === 'skills' && (
                                        <div>
                                            <label className="text-[9px] text-gray-400 block mb-2 font-bold uppercase tracking-wider">Opções da Lista</label>
                                            <textarea className="w-full h-40 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-[#d084ff] font-mono leading-relaxed"
                                                value={(activeItemDef.options || []).join('\n')}
                                                onChange={e => updateActiveItem({ options: e.target.value.split('\n') })}
                                                placeholder="Uma opção por linha..."
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <button onClick={() => {
                                        const newItems = { ...blueprint.items };
                                        delete newItems[selectedId];
                                        const newLayout = blueprint.layout.map(row => ({
                                            ...row,
                                            columns: row.columns.map(col => col.filter(id => id !== selectedId))
                                        }));
                                        setBlueprint(prev => ({ ...prev, layout: newLayout, items: newItems }));
                                        setSelectedId(null);
                                    }} className="w-full py-3 bg-red-500/5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-300 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2">
                                        <Trash2 size={14} /> Excluir Widget
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CANVAS */}
                    <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#050505] to-[#0a0a0c]">
                         {/* Background Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        {/* ALTERADO: pb-60 (Padding Bottom enorme) para garantir que a última linha flutue e seja clicável */}
                        <div className="min-h-full p-10 flex flex-col items-center relative z-10 pb-60">
                            <div className="w-full max-w-5xl">
                                {blueprint.layout.length === 0 && (
                                    <div className="border border-dashed border-white/5 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-600 gap-4 mb-8 bg-white/[0.01]">
                                        <div className="p-4 bg-black/50 rounded-full border border-white/5">
                                            <Layout size={32} className="opacity-40"/>
                                        </div>
                                        <p className="text-sm font-medium">O canvas está vazio.</p>
                                        <p className="text-xs opacity-50">Adicione uma linha para começar a construir.</p>
                                    </div>
                                )}
                                <SortableContext items={blueprint.layout.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                    {blueprint.layout.map(row => (
                                        <SortableRow 
                                            key={row.id} 
                                            rowId={row.id} 
                                            row={row} 
                                            itemsDef={blueprint.items} 
                                            onDelete={deleteRow}
                                            onSelectItem={(id) => setSelectedId(id)}
                                            selectedItemId={selectedId}
                                            onChangeColumns={handleColumnChange}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </div>
                    </div>
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                    {activeDragId ? (
                        activeDragData?.isSidebar ? (
                            <div className="px-4 py-3 bg-[#0a0a0c] border border-[#d084ff] text-white text-xs font-bold rounded-lg shadow-[0_0_20px_rgba(208,132,255,0.3)] flex items-center gap-3 backdrop-blur-xl">
                                <Plus size={16} className="text-[#d084ff]"/> {activeDragData.label}
                            </div>
                        ) : (
                            blueprint.items[activeDragId] ? (
                                <div className="w-64 opacity-90 rotate-2 scale-105">
                                    <div className="bg-[#0a0a0c] rounded-xl border border-[#d084ff] shadow-2xl overflow-hidden">
                                        {(() => {
                                            const Comp = GenericSystem.WIDGET_REGISTRY[blueprint.items[activeDragId].type]?.comp;
                                            return Comp ? <Comp data={blueprint.items[activeDragId]} readOnly={true} value={blueprint.items[activeDragId].defaultValue} /> : null;
                                        })()}
                                    </div>
                                </div>
                            ) : null
                        )
                    ) : null}
                </DragOverlay>
            </DndContext>

             {/* Footer */}
             <div className="p-4 border-t border-white/5 bg-[#0a0a0c]/90 backdrop-blur-md flex justify-between items-center gap-4 z-20">
                <div className="flex items-center gap-3 text-xs text-gray-500 px-4">
                    <Info size={14} className={saveMode === 'clone' ? "text-amber-500" : "text-gray-600"}/>
                    {saveMode === 'clone' ? (
                        <span><strong className="text-amber-500">Modo Seguro:</strong> Criaremos uma nova versão (v2) para proteger {usageCount} fichas.</span>
                    ) : (
                        <span>Todas as alterações são salvas automaticamente.</span>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-6 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest hover:bg-white/5 rounded-lg">Cancelar</button>
                    <button onClick={() => onSave(blueprint)} className="px-6 py-2 bg-[#d084ff] hover:bg-white text-black font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(208,132,255,0.2)] hover:shadow-[0_0_25px_rgba(208,132,255,0.4)] transition-all flex items-center gap-2 uppercase tracking-widest transform hover:-translate-y-0.5">
                        <Save size={14}/> Salvar Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};