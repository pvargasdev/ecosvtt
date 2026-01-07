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
    Square, Edit, Info, ArrowLeft, Minus 
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
        height: '100%'
    };

    if (!data) return null;

    const WidgetComp = GenericSystem.WIDGET_REGISTRY[data.type]?.comp;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="group relative mb-2 h-full">
            <div 
                className={`relative rounded-xl border transition-all bg-[#0a0a0c] overflow-hidden h-full flex flex-col
                ${isSelected ? 'border-[#d084ff] ring-1 ring-[#d084ff] z-10' : 'border-white/10 hover:border-white/30'}
                `}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
                <div {...listeners} className="absolute top-2 right-2 z-20 p-1.5 rounded cursor-grab active:cursor-grabbing text-gray-600 hover:text-white bg-black/50 hover:bg-[#d084ff] transition-colors opacity-0 group-hover:opacity-100">
                    <GripVertical size={14} />
                </div>

                <div className="pointer-events-none p-1 h-full flex-1">
                    {WidgetComp ? <WidgetComp data={data} readOnly={true} value={data.defaultValue} /> : <div className="p-4 text-xs text-red-500">Widget Inválido</div>}
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
             className={`flex-1 min-h-[100px] rounded-lg p-2 border border-dashed transition-all flex flex-col gap-2
             ${isOver ? 'bg-[#d084ff]/10 border-[#d084ff] shadow-[inset_0_0_20px_rgba(208,132,255,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/10'}
             `}>
            {items.length === 0 && !isOver && (
                <div className="h-full flex items-center justify-center text-[9px] text-gray-700 uppercase tracking-widest pointer-events-none">
                    Arraste aqui
                </div>
            )}
            {children}
        </div>
    );
};

// 4. Linha Sortable (Estrutura Reordenável e Expansível)
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
        <div ref={setNodeRef} style={style} className="bg-[#121216] border border-white/5 rounded-xl p-3 mb-4 group/row relative hover:border-white/10 transition-colors">
            
            {/* Controles Laterais (Colunas e Drag) */}
            <div className="absolute -left-12 top-0 bottom-0 flex flex-col items-end gap-2 pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                
                {/* Drag Handle */}
                <button {...listeners} {...attributes} className="p-2 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing bg-[#121216] rounded border border-white/10 shadow-lg hover:bg-white/5" title="Reordenar Linha">
                    <GripVertical size={16} />
                </button>

                {/* Colunas Control */}
                <div className="flex flex-col bg-[#121216] rounded border border-white/10 overflow-hidden shadow-lg">
                    <button onClick={() => onChangeColumns(rowId, 1)} className="p-1.5 text-gray-500 hover:text-[#d084ff] hover:bg-white/5 border-b border-white/5 transition-colors" title="Adicionar Coluna">
                        <Plus size={12} />
                    </button>
                    <div className="py-0.5 text-[9px] text-center text-gray-400 bg-black/50 font-mono select-none">
                        {row.columns.length}
                    </div>
                    <button onClick={() => onChangeColumns(rowId, -1)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors" title="Remover Coluna">
                        <Minus size={12} />
                    </button>
                </div>

                {/* Delete */}
                <button onClick={() => onDelete(rowId)} className="p-2 text-gray-600 hover:text-red-500 bg-[#121216] rounded border border-white/10 shadow-lg hover:bg-red-900/10 transition-colors" title="Excluir Linha">
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Renderização das Colunas */}
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
        <div className="flex flex-col h-full bg-[#0a0a0c] text-white w-full font-inter select-none">
             {/* HEADER */}
             <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gradient-to-br from-[#d084ff]/20 to-purple-900/20 rounded-xl border border-[#d084ff]/30">
                        <Layout className="text-[#d084ff]" size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Editor de Layout</h2>
                            <Edit size={10} className="text-gray-600"/>
                        </div>
                        <input className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#d084ff] text-xl font-rajdhani font-bold text-white p-0 focus:ring-0 w-80 placeholder-white/20 transition-all outline-none"
                            value={blueprint.name} onChange={e => setBlueprint({...blueprint, name: e.target.value})} placeholder="Nome do Sistema..." />
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white"><X size={24}/></button>
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
                    <div className="w-[280px] bg-[#121216] border-r border-white/5 flex flex-col p-4 gap-6 shrink-0 overflow-y-auto">
                        {!activeItemDef ? (
                            <div className="animate-in slide-in-from-left-2 duration-300">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">1. Estrutura</div>
                                <button onClick={addRow} className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all group mb-6">
                                    <Square size={24} className="text-gray-400 group-hover:text-white"/>
                                    <span className="text-[10px] uppercase font-bold text-gray-500 group-hover:text-white">Adicionar Linha</span>
                                </button>

                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">2. Componentes</div>
                                <div className="space-y-2">
                                    {Object.entries(GenericSystem.WIDGET_REGISTRY).map(([type, config]) => (
                                        <SidebarItem key={type} type={type} config={config} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right-2 duration-300 flex flex-col h-full">
                                <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#d084ff]">Editar Widget</h3>
                                    <button onClick={() => setSelectedId(null)} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"><ArrowLeft size={12}/> Voltar</button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Rótulo</label>
                                        <input className="w-full bg-black/30 border border-white/10 rounded p-2 text-xs text-white outline-none focus:border-[#d084ff]" 
                                            value={activeItemDef.label || ''} onChange={e => updateActiveItem({ label: e.target.value })} />
                                    </div>
                                    {activeItemDef.color !== undefined && (
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Cor</label>
                                            <div className="flex gap-2">
                                                <input type="color" className="h-8 w-8 bg-transparent border-none cursor-pointer rounded" 
                                                    value={activeItemDef.color} onChange={e => updateActiveItem({ color: e.target.value })} />
                                                <span className="text-xs self-center text-gray-500 font-mono">{activeItemDef.color}</span>
                                            </div>
                                        </div>
                                    )}
                                    {activeItemDef.type === 'skills' && (
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-2 font-bold uppercase tracking-wider">Opções</label>
                                            <textarea className="w-full h-32 bg-black/30 border border-white/10 rounded p-2 text-xs text-white outline-none focus:border-[#d084ff] font-mono"
                                                value={(activeItemDef.options || []).join('\n')}
                                                onChange={e => updateActiveItem({ options: e.target.value.split('\n') })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-white/10">
                                    <button onClick={() => {
                                        const newItems = { ...blueprint.items };
                                        delete newItems[selectedId];
                                        const newLayout = blueprint.layout.map(row => ({
                                            ...row,
                                            columns: row.columns.map(col => col.filter(id => id !== selectedId))
                                        }));
                                        setBlueprint(prev => ({ ...prev, layout: newLayout, items: newItems }));
                                        setSelectedId(null);
                                    }} className="w-full py-3 bg-red-900/10 border border-red-900/30 text-red-400 rounded-lg hover:bg-red-900/30 hover:text-red-200 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2">
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CANVAS */}
                    <div className="flex-1 bg-[#050505] relative overflow-y-auto custom-scrollbar">
                        <div className="min-h-full p-10 flex flex-col items-center">
                            <div className="w-full max-w-4xl pb-20">
                                {blueprint.layout.length === 0 && (
                                    <div className="border-2 border-dashed border-white/5 rounded-2xl h-64 flex flex-col items-center justify-center text-gray-600 gap-4 mb-8">
                                        <Layout size={40} className="opacity-20"/>
                                        <p className="text-sm">Clique em <strong className="text-white">Adicionar Linha</strong> para começar.</p>
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

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeDragId ? (
                        activeDragData?.isSidebar ? (
                            <div className="p-3 bg-[#d084ff] text-black font-bold rounded shadow-xl flex items-center gap-2">
                                <Plus size={16}/> {activeDragData.label}
                            </div>
                        ) : (
                            blueprint.items[activeDragId] ? (
                                <div className="w-64 opacity-80 rotate-3">
                                    <SortableItem id={activeDragId} data={blueprint.items[activeDragId]} isSelected={false} onClick={()=>{}} />
                                </div>
                            ) : null
                        )
                    ) : null}
                </DragOverlay>
            </DndContext>

             {/* Footer */}
             <div className="p-5 border-t border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-gray-500 px-4">
                    <Info size={16} className={saveMode === 'clone' ? "text-amber-500" : "text-gray-600"}/>
                    {saveMode === 'clone' ? (
                        <span><strong className="text-amber-500">Modo Seguro:</strong> Criaremos uma nova versão (v2) para proteger {usageCount} fichas.</span>
                    ) : (
                        <span>Modo Edição: Atualiza o sistema atual.</span>
                    )}
                </div>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">Cancelar</button>
                    <button onClick={() => onSave(blueprint)} className="px-8 py-2.5 bg-[#d084ff] hover:bg-white text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(208,132,255,0.3)] hover:shadow-[0_0_30px_rgba(208,132,255,0.5)] transition-all flex items-center gap-3 uppercase tracking-widest">
                        <Save size={16}/> Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};