// src/systems/ecos_guild.jsx
import React, { useState, useMemo } from 'react';
import { 
    Building, Siren, Coins, Crown, LayoutGrid, MapPin,
    Handshake, Plus, Trash2, Package, CheckSquare, Square, X,
    Shield, Zap, Activity, BookOpen, PenLine, Weight, Search,
    Filter, Layers, Sparkles, Check, Pencil, ChevronsUp, Landmark
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const THEME_MAIN = "text-[#d084ff]"; 
const GLASS_BG = "bg-glass border border-glass-border";

// ==================================================================================
// --- DADOS E REGRAS ---
// ==================================================================================

export const SYSTEM_ID = 'ecos_guild_v3';
export const SYSTEM_NAME = 'ECOS: Guilda';
export const SYSTEM_DESC = 'Gerenciamento de Facção e Base.';

// Estado Padrão
export const defaultState = {
    name: "Nova Guilda",
    reputation: "",     
    baseLocation: "",   
    
    tier: 1,            // Categoria
    coins: 10,          // Tesouro
    wantedLevel: 0,     // Procurado
    territory: 0,       // Territórios
    
    // Barras
    prestige: 0,        
    prestigeMax: 6,     
    heat: 0,            
    heatMax: 5,
    
    // Listas
    upgrades: [],       // IDs das melhorias (string)
    customUpgrades: [], // Melhorias customizadas { id, name, description }
    
    factions: [],       
    stock: [],          
    
    notes: ""
};

const handleNumber = (value) => {
    const clean = value.replace(/[^0-9-]/g, '').slice(0, 3);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

// --- BANCO DE MELHORIAS (DATA) ---
const DATA_UPGRADES = [
    // Base & Segurança
    { id: 'santuario', name: 'Santuário', type: 'base', description: 'Jogadores começam a sessão com 2 Karma.' },
    { id: 'santuario_ii', name: 'Santuário II', type: 'base', description: 'Jogadores começam a sessão com 3 Karma (Requer Santuário).' },
    { id: 'santuario_iii', name: 'Santuário III', type: 'base', description: '+1 no valor máximo de Karma dos jogadores.' },
    { id: 'tuneis', name: 'Sistema de Túneis', type: 'base', description: 'A base torna-se imune a ser descoberta ou invadida.' },
    { id: 'base_segura', name: 'Base Segura', type: 'base', description: 'Ignora restrição de apenas 1 atividade de folga durante guerra.' },
    
    // Recursos & Operações
    { id: 'gerencia', name: 'Gerência de Operações', type: 'ops', description: '+1 dado em testes de missões enviadas com funcionários.' },
    { id: 'lealdade', name: 'Lealdade', type: 'ops', description: 'O funcionário mais antigo não cobra salário semanal.' },
    { id: 'lealdade_ii', name: 'Lealdade II', type: 'ops', description: 'Os dois funcionários mais antigos não cobram salário.' },
    { id: 'mapas', name: 'Sala de Mapas', type: 'ops', description: 'Planejamento: Faça 1 pergunta específica sobre a estrutura do local.' },
    { id: 'informantes', name: 'Informantes', type: 'ops', description: 'Planejamento: Faça 1 pergunta específica sobre perigos da missão.' },
    
    // Serviços & Conexões
    { id: 'enfermaria', name: 'Enfermaria', type: 'service', description: 'A atividade "Recuperar" cura 100% do PV.' },
    { id: 'enfermaria_ii', name: 'Enfermaria II', type: 'service', description: 'Todos os membros recebem +2 PV Máximo.' },
    { id: 'enfermaria_iii', name: 'Enfermaria III', type: 'service', description: 'Todos os membros recebem +2 PV Máximo adicional.' },
    { id: 'contatos_gov', name: 'Contatos no Governo', type: 'service', description: 'Pode pagar 10 moedas para reduzir Atenção em -2 imediatamente.' },
    { id: 'advocacia', name: 'Eq. de Advocacia', type: 'service', description: 'O valor de fiança para liberar membros presos é reduzido pela metade.' },
    { id: 'negociante', name: 'Negociante Exclusivo', type: 'service', description: 'Compra itens raros/ilegais sem gastar ação de folga.' },
    { id: 'treino', name: 'Campo de Treino', type: 'service', description: 'Ao treinar, o teste é crítico a partir do valor 18.' },
    { id: 'trofeus', name: 'Mural de Troféus', type: 'service', description: '+1 Prestígio extra sempre que completar uma missão com sucesso.' },
];

// --- REGRAS DE UPGRADE (MERGE) ---
// Define como as melhorias se fundem visualmente
const GUILD_UPGRADE_RULES = {
    'santuario_ii': {
        target: 'santuario',
        modifier: (base) => { base.description = 'Jogadores começam a sessão com 3 Karma.'; }
    },
    'santuario_iii': {
        target: 'santuario',
        modifier: (base) => { 
            // Adiciona a informação sem apagar a anterior (seja ela I ou II)
            base.description += ' (+1 Máx. de Karma).'; 
        }
    },
    'lealdade_ii': {
        target: 'lealdade',
        modifier: (base) => { base.description = 'Os dois funcionários mais antigos não cobram salário.'; }
    },
    'enfermaria_ii': {
        target: 'enfermaria',
        modifier: (base) => { base.description += ' (Membros recebem +2 PV Máx).'; }
    },
    'enfermaria_iii': {
        target: 'enfermaria',
        modifier: (base) => {
            // Lógica acumulativa inteligente para PV
            if (base.description.includes('+2 PV')) {
                base.description = base.description.replace('+2 PV', '+4 PV');
            } else {
                base.description += ' (Membros recebem +4 PV Máx).';
            }
        }
    }
};

// ==================================================================================
// --- COMPONENTES COMPARTILHADOS ---
// ==================================================================================

const StockWidget = ({ data, updateData, readOnly = false }) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemQtd, setNewItemQtd] = useState(1);
    const [isAdding, setIsAdding] = useState(false);

    const addItem = () => {
        if (!newItemName.trim()) return;
        updateData({ stock: [...(data.stock || []), { id: Date.now(), name: newItemName, qtd: parseInt(newItemQtd) || 1 }] });
        setNewItemName(""); setNewItemQtd(1); setIsAdding(false);
    };

    const removeItem = (id) => updateData({ stock: (data.stock || []).filter(i => i.id !== id) });

    return (
        <div className="flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden mt-2">
            <div className="bg-white/5 p-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={14} className={THEME_MAIN} />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Estoque</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">∞ Slots</div>
            </div>
            <div className="p-2 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                {(data.stock || []).length === 0 ? <div className="text-center text-gray-600 text-[9px] italic">Vazio.</div> : 
                (data.stock || []).map(item => (
                    <div key={item.id} className="flex justify-between items-center group border-b border-white/5 pb-1 mb-1 last:border-0">
                        <span className="text-[10px] text-gray-300 font-bold">{item.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-500">x{item.qtd}</span>
                            <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={9}/></button>
                        </div>
                    </div>
                ))}
            </div>
            {isAdding ? (
                <div className="bg-black/40 p-2 flex gap-1 animate-in slide-in-from-bottom-2">
                    <input autoFocus className="flex-1 bg-black/50 border border-white/10 rounded px-1 py-1 text-[10px] text-white outline-none"
                        value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Item..." />
                    <input type="number" className="w-8 bg-black/50 border border-white/10 rounded px-1 py-1 text-[10px] text-white outline-none text-center"
                        value={newItemQtd} onChange={e => setNewItemQtd(e.target.value)} />
                    <button onClick={addItem} className="text-[#d084ff]"><Plus size={12}/></button>
                </div>
            ) : (
                <button onClick={() => setIsAdding(true)} className="w-full py-1 text-gray-500 hover:text-[#d084ff] text-[9px] uppercase font-bold text-center border-t border-white/5">
                    + Adicionar
                </button>
            )}
        </div>
    );
};

const FactionList = ({ data, updateData }) => {
    const [newFac, setNewFac] = useState("");
    
    const addFac = () => {
        if(!newFac.trim()) return;
        updateData({ factions: [...(data.factions||[]), { id: Date.now(), name: newFac, status: 0 }] });
        setNewFac("");
    };
    
    const modStatus = (id, delta) => {
        const list = (data.factions||[]).map(f => f.id === id ? { ...f, status: Math.min(3, Math.max(-3, f.status + delta)) } : f);
        updateData({ factions: list });
    };

    const getStatusColor = (s) => s > 0 ? 'text-green-400' : s < 0 ? 'text-red-400' : 'text-gray-500';

    return (
        <div className="flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden min-h-[100px] h-full">
            <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                <Handshake size={12} className={THEME_MAIN} />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Facções</span>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto flex-1 scrollbar-thin">
                {(data.factions || []).length === 0 ? <div className="text-center text-gray-600 text-[9px] italic">Nenhuma relação.</div> :
                (data.factions || []).map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-black/20 rounded px-2 py-1">
                        {/* min-w-0 é essencial para o truncate funcionar dentro do flex */}
                        <div className="flex-1 min-w-0 mr-2">
                             <div className="text-[10px] text-gray-200 font-bold truncate" title={f.name}>
                                 {f.name}
                             </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/40 rounded px-1 shrink-0">
                            <button onClick={()=>modStatus(f.id, -1)} className="text-gray-500 hover:text-white text-[10px]">-</button>
                            <span className={`text-[10px] font-rajdhani font-bold w-4 text-center ${getStatusColor(f.status)}`}>{f.status > 0 ? `+${f.status}`: f.status}</span>
                            <button onClick={()=>modStatus(f.id, 1)} className="text-gray-500 hover:text-white text-[10px]">+</button>
                        </div>
                        <button onClick={() => updateData({ factions: data.factions.filter(x => x.id !== f.id) })} className="text-gray-600 hover:text-red-500 ml-1 shrink-0"><X size={10}/></button>
                    </div>
                ))}
            </div>
            
            {/* CORREÇÃO: Input com w-full e padding ajustado para ter espaço */}
            <div className="p-2 border-t border-white/5 flex flex-col gap-1.5">
                <div className="flex gap-1 w-full">
                    <input 
                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-[#d084ff]"
                        value={newFac} 
                        onChange={e => setNewFac(e.target.value)} 
                        placeholder="Nome da facção..." 
                    />
                    <button onClick={addFac} className="text-[#d084ff] bg-[#d084ff]/10 px-3 rounded hover:bg-[#d084ff]/20 flex items-center justify-center">
                        <Plus size={12}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================================================================================
// --- EDITOR (Para Editar Atributos e Selecionar Habilidades) ---
// ==================================================================================

export const Editor = ({ data, updateData }) => {
    
    // UI Local
    const [searchTerm, setSearchTerm] = useState("");
    const [customName, setCustomName] = useState("");
    const [customDesc, setCustomDesc] = useState("");

    const toggleUpgrade = (id) => {
        const current = data.upgrades || [];
        if (current.includes(id)) updateData({ upgrades: current.filter(u => u !== id) });
        else updateData({ upgrades: [...current, id] });
    };

    const addCustom = () => {
        if(!customName.trim()) return;
        const newUpg = { id: `custom_${Date.now()}`, name: customName, description: customDesc };
        updateData({ customUpgrades: [...(data.customUpgrades||[]), newUpg] });
        setCustomName(""); setCustomDesc("");
    };

    const removeCustom = (id) => {
        updateData({ customUpgrades: (data.customUpgrades||[]).filter(u => u.id !== id) });
    };

    // Lista Combinada para Filtro
    const allOptions = [...DATA_UPGRADES];

    const filtered = allOptions.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 h-full overflow-y-auto pr-2 scrollbar-thin text-gray-200">
            {/* 2. ATRIBUTOS (GRID 4) */}
            <div>
                <label className="text-xs text-gray-400 mb-1 block">Características</label>
                <div className="grid grid-cols-4 gap-2">
                    {/* Categoria */}
                    <div className="bg-black/20 border border-glass-border rounded p-2 flex flex-col items-center">
                        <span className="text-[9px] uppercase text-[#d084ff] font-bold">Categoria</span>
                        <input type="number" className="w-full bg-transparent text-center font-rajdhani font-bold text-lg text-white outline-none"
                            value={data.tier} onChange={e => updateData({ tier: handleNumber(e.target.value) })} />
                    </div>
                    {/* Territórios */}
                    <div className="bg-black/20 border border-glass-border rounded p-2 flex flex-col items-center">
                        <span className="text-[9px] uppercase text-gray-300 font-bold">Territórios</span>
                        <input type="number" className="w-full bg-transparent text-center font-rajdhani font-bold text-lg text-white outline-none"
                            value={data.territory} onChange={e => updateData({ territory: handleNumber(e.target.value) })} />
                    </div>
                     {/* Moedas */}
                     <div className="bg-black/20 border border-glass-border rounded p-2 flex flex-col items-center">
                        <span className="text-[9px] uppercase text-yellow-400 font-bold">Moedas</span>
                        <input type="number" className="w-full bg-transparent text-center font-rajdhani font-bold text-lg text-white outline-none"
                            value={data.coins} onChange={e => updateData({ coins: handleNumber(e.target.value) })} />
                    </div>
                     {/* Procurado */}
                     <div className="bg-black/20 border border-glass-border rounded p-2 flex flex-col items-center">
                        <span className="text-[9px] uppercase text-red-400 font-bold">Procurado</span>
                        <input type="number" className="w-full bg-transparent text-center font-rajdhani font-bold text-lg text-white outline-none"
                            value={data.wantedLevel} onChange={e => updateData({ wantedLevel: handleNumber(e.target.value) })} />
                    </div>
                </div>
            </div>

            {/* 3. LIMITES DE BARRAS */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 p-2 rounded border border-white/5">
                    <label className="text-[9px] text-purple-400 block text-center font-bold uppercase">Prestígio Máx</label>
                    <input type="text" className="w-full bg-transparent text-center text-white outline-none"
                         value={data.prestigeMax} onChange={e => updateData({ prestigeMax: handleNumber(e.target.value) })}/>
                </div>
                 <div className="bg-black/20 p-2 rounded border border-white/5">
                    <label className="text-[9px] text-red-400 block text-center font-bold uppercase">Atenção Máx</label>
                    <input type="text" className="w-full bg-transparent text-center text-white outline-none"
                         value={data.heatMax} onChange={e => updateData({ heatMax: handleNumber(e.target.value) })}/>
                </div>
            </div>

            {/* 4. BANCO DE MELHORIAS (Seleção) */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 block font-bold">Banco de Melhorias</label>
                
                {/* Busca */}
                <div className="relative group">
                    <div className="absolute top-1.5 left-2.5 text-gray-500"><Search size={14} /></div>
                    <input type="text" placeholder="Buscar melhoria..."
                        className="w-full bg-black/50 border border-glass-border rounded-full py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-[#d084ff]"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                {/* Lista Padrão */}
                <div className="bg-black/20 p-1 rounded border border-glass-border max-h-48 overflow-y-auto scrollbar-thin">
                    {filtered.map(upg => {
                        const isSelected = (data.upgrades || []).includes(upg.id);
                        return (
                             <label key={upg.id} className={`flex items-start gap-2 p-2 mb-1 rounded cursor-pointer border transition-all ${isSelected ? 'bg-[#d084ff]/10 border-[#d084ff]/40' : 'border-transparent hover:bg-white/5'}`}>
                                <input type="checkbox" className="mt-1 accent-[#d084ff]" checked={isSelected} onChange={() => toggleUpgrade(upg.id)}/>
                                <div>
                                    <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{upg.name}</div>
                                    <div className="text-[10px] text-gray-500 leading-tight">{upg.description}</div>
                                </div>
                            </label>
                        );
                    })}
                </div>

                {/* Customizadas */}
                <div className="bg-black/20 p-2 rounded border border-glass-border">
                    <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Customizadas</div>
                    {(data.customUpgrades || []).map(u => (
                        <div key={u.id} className="flex justify-between items-center mb-1 bg-white/5 p-1 rounded">
                            <span className="text-xs text-white">{u.name}</span>
                            <button onClick={() => removeCustom(u.id)} className="text-red-400"><Trash2 size={10}/></button>
                        </div>
                    ))}
                    <div className="mt-2 border-t border-white/5 pt-2 space-y-1">
                        <input placeholder="Nome..." className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            value={customName} onChange={e => setCustomName(e.target.value)} />
                        <input placeholder="Descrição..." className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            value={customDesc} onChange={e => setCustomDesc(e.target.value)} />
                        <button onClick={addCustom} className="w-full bg-[#d084ff]/20 text-[#d084ff] text-xs font-bold py-1 rounded hover:bg-[#d084ff] hover:text-black">Adicionar</button>
                    </div>
                </div>
            </div>

            {/* 5. GESTÃO DE ESTOQUE/FACÇÕES */}
            <FactionList data={data} updateData={updateData} />
            <StockWidget data={data} updateData={updateData} />

            <div className="pb-4">
                 <label className="text-xs text-gray-400 mb-0.5 block">Notas</label>
                 <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-xs h-20 resize-none"
                    value={data.notes} onChange={e => updateData({ notes: e.target.value })} />
            </div>
        </div>
    );
};

// ==================================================================================
// --- VIEWER (Visualização e Uso Diário) ---
// ==================================================================================

// src/systems/ecos_guild.jsx

// ... (imports e dados anteriores permanecem iguais)

// 4. COMPONENTE DE VISUALIZAÇÃO
export const Viewer = ({ data, updateData }) => {
    
    // Funções de manipulação de barras
    const adjustStat = (stat, max, amount) => {
        const current = data[stat] || 0;
        const maximum = data[max] || 10;
        updateData({ [stat]: Math.min(maximum, Math.max(0, current + amount)) });
    };

    // --- PROCESSAMENTO DE MERGE DAS MELHORIAS ---
    const activeUpgrades = useMemo(() => {
        // 1. Clona a lista bruta de melhorias selecionadas
        let rawList = [
            ...DATA_UPGRADES.filter(u => (data.upgrades || []).includes(u.id)).map(u => ({...u})),
            ...(data.customUpgrades || []).map(u => ({...u}))
        ];

        // 2. Filtra apenas os itens que são modificadores (ex: santuario_ii)
        const modifiers = rawList.filter(item => GUILD_UPGRADE_RULES[item.id]);

        // 3. Aplica as modificações nos itens alvo
        modifiers.forEach(mod => {
            const rule = GUILD_UPGRADE_RULES[mod.id];
            const target = rawList.find(i => i.id === rule.target);

            if (target) {
                rule.modifier(target);
                
                // --- ALTERAÇÃO: Soma +1 ao contador de upgrades ---
                target._upgradeCount = (target._upgradeCount || 0) + 1;
                
                // Marca para remoção da lista visual
                mod._merged = true;      
            }
        });

        // 4. Retorna lista limpa (sem os itens que foram fundidos)
        return rawList.filter(i => !i._merged);
    }, [data.upgrades, data.customUpgrades]);

    return (
        <div className="w-full max-w-2xl mx-auto p-1 font-sans text-gray-200">
            
            {/* 1. IDENTIDADE (Top Bar) */}
            <div className="flex items-center justify-center gap-2 mb-3 mt-1">
                <div className="bg-black/40 border border-[#d084ff]/30 rounded-full px-4 py-1 flex items-center gap-2 shadow-[0_0_10px_rgba(208,132,255,0.15)] backdrop-blur-md">
                    <span className="text-[10px] text-white-400 uppercase tracking-wider font-semibold">{data.reputation || "Reputação"}</span>
                </div>
            </div>

            {/* 2. BARRAS VITAIS (Prestígio & Atenção) */}
            <div className="flex gap-2 mb-4 h-[55px]">
                
                {/* PRESTÍGIO */}
                <div className="flex-1 flex items-center justify-between bg-purple-950/30 border border-purple-500/30 rounded-xl p-1 shadow-[0_0_15px_rgba(208,132,255,0.15)] relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-900/60 to-[#d084ff]/40 z-0 transition-all duration-500 ease-out" 
                         style={{ width: `${Math.min(100, (data.prestige / (data.prestigeMax || 6)) * 100)}%` }} />
                    <button onClick={() => adjustStat('prestige', 'prestigeMax', -1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-purple-500/20 text-purple-200 hover:text-white transition-colors pb-1">-</button>
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10">
                        <div className="flex items-end gap-1">
                            <span className="text-3xl font-rajdhani font-bold text-white drop-shadow-md">{data.prestige}</span>
                            <span className="text-sm font-rajdhani font-bold text-gray-400 mb-1.5">/{data.prestigeMax}</span>
                        </div>
                        <span className="text-[7px] text-purple-300/80 font-bold tracking-[0.2em] uppercase pointer-events-none absolute bottom-1">Prestígio</span>
                    </div>
                    <button onClick={() => adjustStat('prestige', 'prestigeMax', 1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-purple-500/20 text-purple-200 hover:text-white transition-colors pb-1">+</button>
                </div>

                {/* ATENÇÃO */}
                <div className="flex-1 flex items-center justify-between bg-red-950/30 border border-red-500/30 rounded-xl p-1 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-900/60 to-red-600/40 z-0 transition-all duration-500 ease-out" 
                         style={{ width: `${Math.min(100, (data.heat / (data.heatMax || 5)) * 100)}%` }} />
                    <button onClick={() => adjustStat('heat', 'heatMax', -1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-red-500/20 text-red-200 hover:text-white transition-colors pb-1">-</button>
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10">
                        <div className="flex items-end gap-1">
                             <span className="text-3xl font-rajdhani font-bold text-white drop-shadow-md">{data.heat}</span>
                             <span className="text-sm font-rajdhani font-bold text-gray-400 mb-1.5">/{data.heatMax}</span>
                        </div>
                        <span className="text-[7px] text-red-300/80 font-bold tracking-[0.2em] uppercase pointer-events-none absolute bottom-1">Atenção</span>
                    </div>
                    <button onClick={() => adjustStat('heat', 'heatMax', 1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-red-500/20 text-red-200 hover:text-white transition-colors pb-1">+</button>
                </div>
            </div>

            {/* 3. ATRIBUTOS & RECURSOS (Grid de 4) */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
                {/* Categoria */}
                <div className="bg-glass border border-white/10 rounded-lg flex flex-col items-center justify-center py-2 relative overflow-hidden group">
                    <span className="text-[8px] uppercase text-[#d084ff] font-bold tracking-wider z-10">Categoria</span>
                    <input type="text" className="w-full bg-transparent text-xl font-rajdhani font-bold text-white text-center outline-none z-10"
                        value={data.tier} onChange={e => updateData({ tier: handleNumber(e.target.value) })}/>
                </div>
                 {/* Territórios */}
                <div className="bg-glass border border-white/10 rounded-lg flex flex-col items-center justify-center py-2 relative overflow-hidden group">
                    <span className="text-[8px] uppercase text-gray-300 font-bold tracking-wider z-10">Territórios</span>
                    <div className="flex items-center gap-1 z-10">
                        <MapPin size={12} className="text-gray-400"/>
                        <input type="text" className="w-8 bg-transparent text-xl font-rajdhani font-bold text-white text-center outline-none"
                            value={data.territory} onChange={e => updateData({ territory: handleNumber(e.target.value) })}/>
                    </div>
                </div>
                 {/* Moedas */}
                <div className="bg-glass border border-white/10 rounded-lg flex flex-col items-center justify-center py-2 relative overflow-hidden group">
                    <span className="text-[8px] uppercase text-yellow-400 font-bold tracking-wider z-10">Moedas</span>
                    <div className="flex items-center gap-1 z-10">
                        <Coins size={12} className="text-yellow-400"/>
                        <input type="text" className="w-12 bg-transparent text-xl font-rajdhani font-bold text-white text-center outline-none"
                            value={data.coins} onChange={e => updateData({ coins: handleNumber(e.target.value) })}/>
                    </div>
                </div>
                 {/* Procurado */}
                <div className="bg-glass border border-white/10 rounded-lg flex flex-col items-center justify-center py-2 relative overflow-hidden group">
                    <span className="text-[8px] uppercase text-red-400 font-bold tracking-wider z-10">Procurado</span>
                    <div className="flex items-center gap-1 z-10">
                        <Siren size={12} className="text-red-400"/>
                        <input type="text" className="w-8 bg-transparent text-xl font-rajdhani font-bold text-white text-center outline-none"
                            value={data.wantedLevel} onChange={e => updateData({ wantedLevel: handleNumber(e.target.value) })}/>
                    </div>
                </div>
            </div>

            {/* 4. ÁREA PRINCIPAL - LAYOUT EM GRID FIXO (2 COLUNAS) */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-[300px]">
                
                {/* COLUNA 1: MELHORIAS (Apenas Leitura) */}
                <div className="flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden h-full">
                    <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                        <Crown size={12} className="text-[#d084ff]" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Melhorias Ativas</span>
                    </div>
                    
                    <div className="overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#d084ff]/20 scrollbar-track-transparent flex-1 max-h-[400px]">
                        {activeUpgrades.length === 0 ? (
                            <div className="text-center text-gray-600 text-[9px] mt-4 italic">Nenhuma melhoria adquirida.</div>
                        ) : (
                            activeUpgrades.map((upg, idx) => (
                                <div key={`${upg.id}-${idx}`} className="bg-black/40 border-l-2 border-[#d084ff] rounded-r px-2 py-1.5 relative group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-white">{upg.name}</span>
                                            
                                            {/* --- TAG DE MELHORIA MÚLTIPLA --- */}
                                            {upg._upgradeCount > 0 && (
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-purple-950/50 border border-purple-500/30 text-purple-400">
                                                    {/* Renderiza um ícone para cada nível de upgrade */}
                                                    {Array.from({ length: upg._upgradeCount }).map((_, i) => (
                                                        <ChevronsUp key={i} size={8} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-400 leading-snug font-mono mt-0.5">{upg.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUNA 2: FACÇÕES & NOTAS */}
                <div className="flex flex-col gap-2 h-full">
                    <div className="flex-1">
                        <FactionList data={data} updateData={updateData} />
                    </div>
                    
                    <div className="flex-1 flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden min-h-[80px]">
                         <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                            <PenLine size={12} className="text-gray-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notas</span>
                        </div>
                         <textarea 
                            className="p-2 text-[10px] text-gray-300 font-mono leading-tight flex-1 bg-transparent resize-none outline-none scrollbar-thin"
                            value={data.notes}
                            onChange={e => updateData({ notes: e.target.value })}
                            placeholder="..."
                         />
                    </div>
                </div>
            </div>

            {/* 5. ESTOQUE */}
            <StockWidget data={data} updateData={updateData} />

        </div>
    );
};