// src/systems/ecos_rpg.jsx
import React, { useMemo, useState } from 'react';
import { 
    Shield, Zap, Activity, BookOpen, Plus, Trash2, Search, Filter, 
    Layers, CheckCircle2, Sparkles, PenLine, Package, Weight, X, 
    CheckSquare, Square, Pencil, Check, ChevronsUp
} from 'lucide-react';

// --- CONFIGURAÇÃO VISUAL ---
const THEME_MAIN = "text-[#d084ff]"; 
const THEME_GLOW = "shadow-[0_0_15px_rgba(208,132,255,0.4)]";

// ==================================================================================
// --- ÁREA DE DADOS (TEMPLATES) ---
// ==================================================================================

const DATA_ORIGINS = [
    { id: 'elfo', name: 'Elfo', description: 'Seres longevos e graciosos com forte conexão mágica e natural.' },
    { id: 'pequenino', name: 'Pequenino', description: 'Povos de baixa estatura, pacatos mas bravos quando ameaçados.' },
    { id: 'humano', name: 'Humano', description: 'A mais jovem, ambiciosa e versátil das espécies comuns.' },
    { id: 'meio_orc', name: 'Meio-Orc', description: 'Imponentes e ferozes, unem a força orc ao pragmatismo humano.' },
    { id: 'tiefling', name: 'Tiefling', description: 'Marcados por uma herança infernal visível e intelecto afiado.' },
    { id: 'vampiro', name: 'Vampiro', description: 'Seres amaldiçoados com uma sede de sangue insaciável.' },
];

const DATA_CLASSES = [
    { id: 'acolito', name: 'Acólito' },
    { id: 'artifice', name: 'Artífice' },
    { id: 'atirador', name: 'Atirador' },
    { id: 'bardo', name: 'Bardo' },
    { id: 'bruto', name: 'Bruto' },
    { id: 'feiticeiro', name: 'Feiticeiro' },
    { id: 'combatente', name: 'Combatente' },
    { id: 'vigarista', name: 'Vigarista' },
];

const DATA_SKILLS_LIST = [
    'Carisma', 'Enganação', 'Furtividade', 'Intimidação', 
    'Intuição', 'Medicina', 'Misticismo', 'Natureza', 
    'Percepção', 'Persuasão', 'Religião', 'Tecnologia'
];

const DATA_ABILITIES = [
    // --- HABILIDADES DE ORIGEM [Pág. 6] ---
    { id: 'serenidade', name: 'Serenidade', type: 'origin', req: 'elfo', description: 'Seu valor máximo de Karma inicial é 4.' },
    { id: 'espirito_civico', name: 'Espírito Cívico', type: 'origin', req: 'pequenino', description: 'Gaste 1 Karma extra ao ajudar para dar +2 dados no total.' },
    { id: 'determinacao_versatil', name: 'Determinação Versátil', type: 'origin', req: 'humano', description: 'Uma vez por sessão, adicione +2 dados para qualquer teste.' },
    { id: 'parrudo', name: 'Parrudo', type: 'origin', req: 'meio_orc', description: 'Imune a efeitos de veneno, toxina ou atordoamento.' },
    { id: 'nascido_do_inferno', name: 'Nascido do Inferno', type: 'origin', req: 'tiefling', description: 'Você possui imunidade contra chamas e calor intenso.' },
    { id: 'heranca_vampirica', name: 'Herança Vampírica', type: 'origin', req: 'vampiro', description: 'Sugar sangue cura 1 dano. Sofre 1 dano/turno sob luz do Sol.' },

    // --- ACÓLITO [Pág. 7] ---
    { id: 'patrono', name: 'Patrono', type: 'class', req: 'acolito', description: 'Uma vez, suplique por ajuda de sua entidade em grande necessidade.' },
    { id: 'punicao', name: 'Punição', type: 'class', req: 'acolito', description: 'Ao atacar, gaste 2 Karma para aumentar o dano em +3.' },
    { id: 'aura_de_protecao', name: 'Aura de Proteção', type: 'class', req: 'acolito', description: 'Aliados próximos recebem +1 dado para resistir a efeitos mentais.' },
    { id: 'sexto_sentido', name: 'Sexto Sentido', type: 'class', req: 'acolito', description: 'Gaste 2 Karma para saber a localização de seres a até 10m.' },
    { id: 'vingador', name: 'Vingador', type: 'class', req: 'acolito', description: 'Dano duplo contra inimigo que colocou aliado em Morrendo.' },
    { id: 'vinculo_de_sangue', name: 'Vínculo de Sangue', type: 'class', req: 'acolito', description: 'Gaste 1 Karma para transferir dano sofrido por aliado para você.' },
    { id: 'ataque_vampirico', name: 'Ataque Vampírico', type: 'class', req: 'acolito', description: 'Ao causar 3+ dano em um ataque, você cura 1 PV.' },
    { id: 'maos_que_curam', name: 'Mãos que Curam', type: 'class', req: 'acolito', description: 'Gaste 2 Karma e toque em um aliado para curá-lo em 3 PV.' },
    { id: 'abencoado', name: 'Abençoado', type: 'class', req: 'acolito', description: 'Você começa toda missão com seu Karma preenchido ao máximo.' },

    // --- ARTÍFICE [Pág. 7] ---
    { id: 'bolsa_de_tralhas', name: 'Bolsa de Tralhas', type: 'class', req: 'artifice', description: 'Gaste 1 Karma para retirar um item útil improvisado da bolsa.' },
    { id: 'sobrecarga', name: 'Sobrecarga', type: 'class', req: 'artifice', description: 'Use +2 dados em Tecnologia. Se falhar, sofre 3 de dano.' },
    { id: 'projetil_teleguiado', name: 'Projétil Teleguiado', type: 'class', req: 'artifice', description: 'Gaste 1 Karma para curvar projétil, ignorando cobertura.' },
    { id: 'ricochete', name: 'Ricochete', type: 'class', req: 'artifice', description: 'Gaste 1 Karma para projétil ricochetear para outro alvo.' },
    { id: 'tiro_ameacador', name: 'Tiro Ameaçador', type: 'class', req: 'artifice', description: 'Seus acertos em ataques à distância são críticos a partir de 17.' },
    { id: 'raio_omega', name: 'Raio Ômega', type: 'class', req: 'artifice', description: 'Gaste 2 Karma para ataque em linha reta que acerta todos (Raio).' },
    { id: 'exoesqueleto', name: 'Exoesqueleto', type: 'class', req: 'artifice', description: '1 Karma: Até o fim da cena, permite saltos irreais.' },
    { id: 'mente_astuta', name: 'Mente Astuta', type: 'class', req: 'artifice', description: 'Gaste 1 Karma para usar Intelecto em vez de Destreza ou Força.' },
    { id: 'drone_sentinela', name: 'Drone Sentinela', type: 'class', req: 'artifice', description: '1 Karma: Cria drone até fim da cena. +2 dados em Percepção.' },
    { id: 'drone_sentinela_ii', name: 'Drone Sentinela II', type: 'class', req: 'artifice', description: 'Ao atacar, gaste 2 Karma para drone atirar também (+3 dados).' },
    { id: 'drone_sentinela_iii', name: 'Drone Sentinela III', type: 'class', req: 'artifice', description: 'Gaste 3 Karma: Drone se destrói para anular próximo dano em você.' },
    { id: 'tiro_elemental', name: 'Tiro Elemental', type: 'class', req: 'artifice', description: '1 Karma: Alterar tipo de dano de ataque à distância para qualquer outro.' },

    // --- ATIRADOR [Pág. 8] ---
    { id: 'olho_de_aguia', name: 'Olho de Águia', type: 'class', req: 'atirador', description: 'Ignora penalidade por distância estendida com armas de fogo.' },
    { id: 'tiro_sucessivo', name: 'Tiro Sucessivo', type: 'class', req: 'atirador', description: 'Ao matar alvo, pode imediatamente fazer ataque adicional.' },
    { id: 'brecha_na_guarda', name: 'Brecha na Guarda', type: 'class', req: 'atirador', description: 'Quando aliado ataca, gaste 1 Karma para atacar o mesmo alvo.' },
    { id: 'dedo_no_gatilho', name: 'Dedo no Gatilho', type: 'class', req: 'atirador', description: 'Gaste 1 Karma para ser o primeiro a agir no combate.' },
    { id: 'interrupcao', name: 'Interrupção', type: 'class', req: 'atirador', description: 'Gaste 2 Karma para atacar oponente que vai atacar. 3+ dano anula o dele.' },
    { id: 'mira_estabilizada', name: 'Mira Estabilizada', type: 'class', req: 'atirador', description: 'Se não mover, recebe +1 dado para ataque à distância.' },
    { id: 'tiro_certeiro', name: 'Tiro Certeiro', type: 'class', req: 'atirador', description: '1 Karma: Dano triplicado contra alvo focado no próximo turno.' },
    { id: 'roleta_russa', name: 'Roleta Russa', type: 'class', req: 'atirador', description: 'Role 1d: Par (dano duplicado), Ímpar (ataque anulado).' },
    { id: 'caindo_com_estilo', name: 'Caindo com Estilo', type: 'class', req: 'atirador', description: 'Ao entrar em Morrendo, realiza ataque com dano duplicado.' },
    { id: 'critico_letal', name: 'Crítico Letal', type: 'class', req: 'atirador', description: 'Acertos críticos valem como 3 danos ao invés de 2.' },
    { id: 'tiro_de_advertencia', name: 'Tiro de Advertência', type: 'class', req: 'atirador', description: 'Gaste 1 Karma e teste Presença. Sucesso atordoa o alvo.' },

    // --- BARDO [Pág. 8] ---
    { id: 'artista_profissional', name: 'Artista Profissional', type: 'class', req: 'bardo', description: 'Use +3 dados em testes de performance de arte escolhida.' },
    { id: 'quebra_de_ritmo', name: 'Quebra de Ritmo', type: 'class', req: 'bardo', description: 'Gaste 2 Karma para reduzir ataque sofrido em -2 dados.' },
    { id: 'cativar', name: 'Cativar', type: 'class', req: 'bardo', description: 'Gaste 2 Karma para distrair personagem, focando atenção em você.' },
    { id: 'sugestao', name: 'Sugestão', type: 'class', req: 'bardo', description: 'Gaste 2 Karma para implantar pensamento plausível na mente do alvo.' },
    { id: 'riso_histerico', name: 'Riso Histérico', type: 'class', req: 'bardo', description: 'Gaste 2 Karma e teste Presença. Sucesso causa risada incontrolável.' },
    { id: 'compreender_idiomas', name: 'Compreender Idiomas', type: 'class', req: 'bardo', description: 'Você decifra instantaneamente qualquer língua falada ou escrita.' },
    { id: 'bis', name: 'Bis!', type: 'class', req: 'bardo', description: 'Gaste 2 Karma: Aliado escolhido realiza ataque adicional no turno dele.' },
    { id: 'ilusao_maior', name: 'Ilusão Maior', type: 'class', req: 'bardo', description: 'Gaste 2 Karma para conjurar ilusão imóvel realista até ser tocada.' },

    // --- BRUTO [Pág. 9] ---
    { id: 'duro_na_queda', name: 'Duro na Queda', type: 'class', req: 'bruto', description: 'Seu valor máximo de PV é aumentado em +2.' },
    { id: 'cai_dentro', name: 'Cai Dentro', type: 'class', req: 'bruto', description: '2 Karma: Se alvo atacar outro que não você, usa -2 dados.' },
    { id: 'cargueiro', name: 'Cargueiro', type: 'class', req: 'bruto', description: 'Sua capacidade de carga aumenta em +3.' },
    { id: 'furia', name: 'Fúria', type: 'class', req: 'bruto', description: '2 Karma: +1 dado em testes (exceto Intelecto) por curta duração.' },
    { id: 'rejeitar_fraqueza', name: 'Rejeitar Fraqueza', type: 'class', req: 'bruto', description: 'Uma vez/sessão, negue um fracasso e considere resultado 20.' },
    { id: 'presenca_avassaladora', name: 'Presença Avassaladora', type: 'class', req: 'bruto', description: 'Gaste 1 Karma para +1 dado em testes de Intimidação.' },
    { id: 'pele_resistente', name: 'Pele Resistente', type: 'class', req: 'bruto', description: 'Imune a ataques que causariam apenas 1 de dano.' },
    { id: 'ataque_imprudente', name: 'Ataque Imprudente', type: 'class', req: 'bruto', description: '1 Karma: +2 dados no ataque. Defesa com -1 dado no próximo teste.' },
    { id: 'furia_ii', name: 'Fúria II', type: 'class', req: 'bruto', description: 'Fúria custa 4 Karma, mas tem duração ilimitada.' },
    { id: 'furia_iii', name: 'Fúria III', type: 'class', req: 'bruto', description: 'Fúria volta a custar 2 Karma, mantendo duração ilimitada.' },

    // --- FEITICEIRO [Pág. 9] ---
    { id: 'fome_por_conhecimento', name: 'Fome por Conhecimento', type: 'class', req: 'feiticeiro', description: 'Começa com 1 espaço adicional desbloqueado na árvore.' },
    { id: 'elemento_de_poder', name: 'Elemento de Poder', type: 'class', req: 'feiticeiro', description: 'Escolha um tipo de dano para suas habilidades elementais.' },
    { id: 'maos_magicas', name: 'Mãos Mágicas', type: 'class', req: 'feiticeiro', description: '1 Karma: Conjura mão fantasma que executa tarefas à distância.' },
    { id: 'conjurar_espiritos', name: 'Conjurar Espíritos', type: 'class', req: 'feiticeiro', description: 'Invoca espíritos que atacam (INT+1) por duração curta.' },
    { id: 'forma_animal', name: 'Forma Animal', type: 'class', req: 'feiticeiro', description: 'Gaste 3 Karma para adotar a forma de um animal até fim da cena.' },
    { id: 'falar_com_natureza', name: 'Falar com Natureza', type: 'class', req: 'feiticeiro', description: 'Conversa com animais e plantas para obter info ou favores.' },
    { id: 'forma_animal_ii', name: 'Forma Animal II', type: 'class', req: 'feiticeiro', description: 'Forma Animal passa a custar 2 Karma.' },
    { id: 'projetil_elemental', name: 'Projétil Elemental', type: 'class', req: 'feiticeiro', description: '1 Karma: Ataque (INT+2) à distância com seu Elemento de Poder.' },
    { id: 'toque_elemental', name: 'Toque Elemental', type: 'class', req: 'feiticeiro', description: 'Ataques desarmados usam Intelecto e seu Elemento de Poder.' },
    { id: 'explosao_elemental', name: 'Explosão Elemental', type: 'class', req: 'feiticeiro', description: '2 Karma: Ataque (INT+2) em área média com Elemento de Poder.' },

    // --- COMBATENTE [Pág. 10] ---
    { id: 'posturas_de_luta', name: 'Posturas de Luta', type: 'class', req: 'combatente', description: 'Após acertar ataque, gaste 1 Karma para entrar em Zen ou Frenesi.' },
    { id: 'intuicao_cega', name: 'Intuição Cega', type: 'class', req: 'combatente', description: 'Imune a efeitos de cegueira/invisibilidade para atacar.' },
    { id: 'precisao_critica', name: 'Precisão Crítica', type: 'class', req: 'combatente', description: 'Ataques com resultado 18+ são considerados críticos.' },
    { id: 'protecao', name: 'Proteção', type: 'class', req: 'combatente', description: 'Gaste 2 Karma para reduzir ataque contra aliado próximo em -2 dados.' },
    { id: 'a_favorita', name: 'A Favorita', type: 'class', req: 'combatente', description: 'Recebe +1 dado ao atacar com sua arma favorita escolhida.' },
    { id: 'desarmar', name: 'Desarmar', type: 'class', req: 'combatente', description: '2 Karma e teste de Destreza. Sucesso desarma o inimigo.' },
    { id: 'ataque_especial', name: 'Ataque Especial', type: 'class', req: 'combatente', description: '2 Karma: Realizar ataque com arma Favorita usando +2 dados.' },
    { id: 'ataque_especial_ii', name: 'Ataque Especial II', type: 'class', req: 'combatente', description: 'O Ataque Especial passa a custar apenas 1 Karma.' },
    { id: 'estrategia_de_combate', name: 'Estratégia de Combate', type: 'class', req: 'combatente', description: '1 Karma: Adicione +1 dado aos ataques de aliados (curta duração).' },
    { id: 'inspirar', name: 'Inspirar', type: 'class', req: 'combatente', description: '4 Karma: Aliado próximo rola novamente um teste recém realizado.' },
    { id: 'oficial_comandante', name: 'Oficial Comandante', type: 'class', req: 'combatente', description: '4 Karma: Aliados próximos recebem +1 dado em tudo até fim da cena.' },

    // --- VIGARISTA [Pág. 10] ---
    { id: 'plagio', name: 'Plágio', type: 'class', req: 'vigarista', description: 'Começa com 1 espaço desbloqueado na árvore de outra classe.' },
    { id: 'ataque_furtivo', name: 'Ataque Furtivo', type: 'class', req: 'vigarista', description: 'Receba +1 dado para qualquer ataque furtivo.' },
    { id: 'ataque_furtivo_ii', name: 'Ataque Furtivo II', type: 'class', req: 'vigarista', description: 'Ataques furtivos são críticos a partir do valor 18.' },
    { id: 'ataque_furtivo_iii', name: 'Ataque Furtivo III', type: 'class', req: 'vigarista', description: 'Ataques furtivos são críticos a partir do valor 16.' },
    { id: 'ataque_furtivo_iv', name: 'Ataque Furtivo IV', type: 'class', req: 'vigarista', description: 'Recebe +2 dados para ataques furtivos (ao invés de +1).' },
    { id: 'truque_de_mestre', name: 'Truque de Mestre', type: 'class', req: 'vigarista', description: '3 Karma: Usar habilidade que viu aliado usar na cena.' },
    { id: 'esquiva_sobrenatural', name: 'Esquiva Sobrenatural', type: 'class', req: 'vigarista', description: 'Ao sofrer dano, gaste 3 Karma para reduzi-lo pela metade.' },

    // --- HABILIDADES COMPARTILHADAS (MULTI-CLASSE) ---
    { id: 'flagelador', name: 'Flagelador', type: 'class', req: ['acolito', 'feiticeiro'], description: 'Cause 2 de dano em si mesmo para receber 2 Karma.' },
    { id: 'conexao_espiritual', name: 'Conexão Espiritual', type: 'class', req: ['acolito', 'bardo', 'feiticeiro', 'vigarista'], description: 'Seu valor máx. de Karma aumenta em +1.' },
    { id: 'inquebravel', name: 'Inquebrável', type: 'class', req: ['artifice', 'bruto'], description: 'Ao sofrer dano, gaste 3 Karma para reduzi-lo pela metade.' },
    { id: 'ataque_extra', name: 'Ataque Extra', type: 'class', req: ['atirador', 'bruto', 'combatente'], description: 'Gaste 2 Karma para realizar um ataque adicional no seu turno.' },
    { id: 'ataque_extra_ii', name: 'Ataque Extra II', type: 'class', req: ['atirador', 'bruto', 'combatente'], description: 'Ataque Extra passa a custar 1 Karma.' },
    { id: 'so_pra_garantir', name: 'Só pra Garantir', type: 'class', req: ['atirador', 'vigarista'], description: 'Gaste 1 Karma e receba +1 dado em um teste prestes a fazer.' },
    { id: 'margem_de_ameaca', name: 'Margem de Ameaça', type: 'class', req: ['atirador', 'bruto'], description: 'Seus acertos são críticos a partir do valor 18.' },
    { id: 'passo_nebuloso', name: 'Passo Nebuloso', type: 'class', req: ['bardo', 'vigarista'], description: 'Gaste 2 Karma para se teleportar para qualquer lugar próximo visível.' },
    { id: 'invisibilidade', name: 'Invisibilidade', type: 'class', req: ['bardo', 'feiticeiro', 'vigarista'], description: 'Gaste 2 Karma para ficar invisível por uma curta duração.' },
    { id: 'talento_confiavel', name: 'Talento Confiável', type: 'class', req: ['bardo', 'vigarista'], description: 'Ao falhar teste ajudado por perícia, gaste 2 Karma para rerolar.' },
    { id: 'disfarce', name: 'Disfarce', type: 'class', req: ['bardo', 'vigarista'], description: '2 Karma: Ilusão altera aparência até fim da cena (não engana tato).' },
    { id: 'adrenalina', name: 'Adrenalina', type: 'class', req: ['bruto', 'combatente'], description: '1 Karma: Desloca-se o dobro da distância normal no turno.' },
    { id: 'reflexos_de_combate', name: 'Reflexos de Combate', type: 'class', req: ['combatente', 'vigarista'], description: 'Pode realizar um ataque adicional na 1ª rodada de qualquer combate.' }
];

// ==================================================================================

const handleNumber = (value) => {
    const clean = value.replace(/[^0-9-]/g, '').slice(0, 3);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

// 1. METADADOS E ESTADO PADRÃO
export const SYSTEM_ID = 'ecos_rpg_v1';
export const SYSTEM_NAME = 'ECOS RPG';
export const SYSTEM_DESC = 'Sistema narrativo e estratégico.';

export const defaultState = {
    originId: "",
    classId: "",
    hp: 10,
    hpMax: 10,
    karma: 0,
    karmaMax: 3,
    attributes: { vigor: 1, forca: 1, destreza: 1, intelecto: 1, presenca: 1 },
    
    selectedAbilities: [], 
    customAbilities: [],   

    trainedSkills: [], 
    customSkills: [],

    notes: "", 
    
    // Novo Inventário
    maxLoad: 5,
    inventory: [] // { id, name, desc, weight, carried }
};

// --- WIDGET DE INVENTÁRIO COMPARTILHADO ---
const InventoryWidget = ({ data, updateData, readOnlyMode = false }) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemWeight, setNewItemWeight] = useState(1);
    const [newItemDesc, setNewItemDesc] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Cálculos
    const currentLoad = (data.inventory || [])
        .filter(i => i.carried)
        .reduce((acc, i) => acc + (parseInt(i.weight) || 0), 0);
    
    const maxLoad = data.maxLoad || 5;
    const isOverload = currentLoad > maxLoad;

    const addItem = () => {
        if (!newItemName.trim()) return;
        const newItem = {
            id: Date.now(),
            name: newItemName,
            weight: parseInt(newItemWeight) || 0,
            desc: newItemDesc,
            carried: true
        };
        updateData({ inventory: [...(data.inventory || []), newItem] });
        setNewItemName("");
        setNewItemWeight(1);
        setNewItemDesc("");
        setIsAdding(false);
    };

    const removeItem = (id) => {
        updateData({ inventory: (data.inventory || []).filter(i => i.id !== id) });
    };

    const toggleCarried = (id) => {
        const updated = (data.inventory || []).map(i => {
            if (i.id === id) return { ...i, carried: !i.carried };
            return i;
        });
        updateData({ inventory: updated });
    };

    return (
        <div className="flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden mt-2">
            {/* Header */}
            <div className="bg-white/5 p-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-[#d084ff]" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Inventário</span>
                </div>
                <div className={`text-xs font-rajdhani font-bold flex items-center gap-1 ${isOverload ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                    <Weight size={12}/>
                    <span>{currentLoad} / {maxLoad}</span>
                </div>
            </div>

            {/* Lista / Tabela */}
            <div className="p-2 space-y-1">
                {(data.inventory || []).length === 0 ? (
                    <div className="text-center text-gray-600 text-[10px] py-2 italic">Mochila vazia.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[8px] uppercase text-gray-500 border-b border-white/5">
                                <th className="pb-1 w-6 text-center">Eq.</th>
                                <th className="pb-1 pl-1">Item</th>
                                <th className="pb-1 w-8 text-center">Peso</th>
                                <th className="pb-1 w-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.inventory || []).map(item => (
                                <tr key={item.id} className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <td className="py-1.5 text-center cursor-pointer" onClick={() => toggleCarried(item.id)}>
                                        {item.carried 
                                            ? <CheckSquare size={12} className="text-[#d084ff] mx-auto"/> 
                                            : <Square size={12} className="text-gray-600 mx-auto group-hover:text-gray-400"/>}
                                    </td>
                                    <td className="py-1.5 pl-1">
                                        <div className={`text-[11px] font-bold leading-none ${item.carried ? 'text-white' : 'text-gray-500'}`}>{item.name}</div>
                                        {item.desc && <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{item.desc}</div>}
                                    </td>
                                    <td className="py-1.5 text-center text-[10px] text-gray-400 font-mono">{item.weight}</td>
                                    <td className="py-1.5 text-right">
                                        <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400 p-1"><X size={10}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Adicionar Item */}
            <div className="bg-black/40 p-2 border-t border-white/5">
                {isAdding ? (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex gap-1">
                            <input autoFocus placeholder="Nome do item..." className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-[#d084ff] outline-none"
                                value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <input type="number" placeholder="Kg" className="w-12 bg-black/50 border border-white/10 rounded px-1 py-1 text-xs text-center text-white focus:border-[#d084ff] outline-none"
                                value={newItemWeight} onChange={e => setNewItemWeight(e.target.value)} />
                        </div>
                        <input placeholder="Descrição curta (opcional)..." className="w-full bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-[#d084ff] outline-none"
                            value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                        <div className="flex gap-2">
                             <button onClick={addItem} className="flex-1 bg-[#d084ff]/20 text-[#d084ff] text-[10px] font-bold uppercase py-1 rounded hover:bg-[#d084ff] hover:text-black transition-colors">Confirmar</button>
                             <button onClick={() => setIsAdding(false)} className="px-3 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase py-1 rounded hover:bg-red-500 hover:text-white transition-colors">X</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full py-1 border border-dashed border-gray-700 text-gray-500 hover:border-[#d084ff] hover:text-[#d084ff] rounded text-[10px] uppercase font-bold transition-all flex items-center justify-center gap-1">
                        <Plus size={10} /> Adicionar Item
                    </button>
                )}
            </div>
        </div>
    );
};


// 2. COMPONENTE DE EDIÇÃO
export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();
    
    // UI States - Criação
    const [customAbilityName, setCustomAbilityName] = useState("");
    const [customAbilityDesc, setCustomAbilityDesc] = useState("");
    const [customSkillInput, setCustomSkillInput] = useState("");
    
    // UI States - Edição
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    // UI States - Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("recommended"); 

    // --- Perícias ---
    const toggleSkill = (skillName) => {
        const current = data.trainedSkills || [];
        if (current.includes(skillName)) updateData({ trainedSkills: current.filter(s => s !== skillName) });
        else updateData({ trainedSkills: [...current, skillName] });
    };

    const addCustomSkill = () => {
        if (!customSkillInput.trim()) return;
        updateData({ customSkills: [...(data.customSkills || []), customSkillInput.trim()] });
        setCustomSkillInput("");
    };

    const removeCustomSkill = (skillName) => {
        updateData({ customSkills: (data.customSkills || []).filter(s => s !== skillName) });
    };

    // --- Habilidades ---
    const toggleAbility = (abilityId) => {
        const currentList = data.selectedAbilities || [];
        if (currentList.includes(abilityId)) updateData({ selectedAbilities: currentList.filter(id => id !== abilityId) });
        else updateData({ selectedAbilities: [...currentList, abilityId] });
    };

    const addCustomAbility = () => {
        if (!customAbilityName.trim()) return;
        const newAbility = {
            id: `custom_${Date.now()}`,
            name: customAbilityName,
            description: customAbilityDesc,
            type: 'custom'
        };
        updateData({ customAbilities: [...(data.customAbilities || []), newAbility] });
        setCustomAbilityName("");
        setCustomAbilityDesc("");
    };

    const removeCustomAbility = (id) => {
        updateData({ customAbilities: (data.customAbilities || []).filter(a => a.id !== id) });
    };

    // --- Lógica de Edição ---
    const startEdit = (ability) => {
        setEditingId(ability.id);
        setEditName(ability.name);
        setEditDesc(ability.description);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditDesc("");
    };

    const saveEdit = () => {
        if (!editName.trim()) return;

        const updatedList = (data.customAbilities || []).map(ab => {
            if (ab.id === editingId) {
                return { ...ab, name: editName, description: editDesc };
            }
            return ab;
        });

        updateData({ customAbilities: updatedList });
        cancelEdit();
    };

    const filteredAbilities = useMemo(() => {
        return DATA_ABILITIES.filter(ab => {
            if (filterMode === 'recommended') {
                if (ab.type === 'generic') return true;
                
                // Lógica Multi-Requisito para Origem
                if (ab.type === 'origin') {
                    if (Array.isArray(ab.req)) return ab.req.includes(data.originId);
                    return ab.req === data.originId;
                }
                
                // Lógica Multi-Requisito para Classe
                if (ab.type === 'class') {
                    if (Array.isArray(ab.req)) return ab.req.includes(data.classId);
                    return ab.req === data.classId;
                }
                
                return false;
            }
            if (filterMode === 'all') return true;
            return false;
        }).filter(ab => {
            if (searchTerm.trim() === "") return true;
            const term = searchTerm.toLowerCase();
            return ab.name.toLowerCase().includes(term) || ab.description.toLowerCase().includes(term);
        });
    }, [data.classId, data.originId, filterMode, searchTerm]);

    const FilterBtn = ({ label, mode, icon: Icon }) => (
        <button 
            onClick={() => setFilterMode(mode)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] uppercase font-bold border rounded transition-all
            ${filterMode === mode 
                ? 'bg-[#d084ff]/20 text-white border-[#d084ff] shadow-[0_0_10px_rgba(208,132,255,0.2)]' 
                : 'bg-black/20 text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'}`}
        >
            {Icon && <Icon size={10} />} {label}
        </button>
    );

    return (
        <div className="space-y-5 h-full overflow-y-auto pr-2 scrollbar-thin">
            
            {/* 1. IDENTIDADE */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Classe</label>
                    <select className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-[#d084ff]"
                        value={data.classId || ""} onChange={e => updateData({ classId: e.target.value })}>
                        <option value="">Selecione...</option>
                        {DATA_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-400 mb-0.5 block">Origem</label>
                    <select className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-[#d084ff]"
                        value={data.originId || ""} onChange={e => updateData({ originId: e.target.value })}>
                        <option value="">Selecione...</option>
                        {DATA_ORIGINS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. VITAIS & CARGA */}
            <div className="grid grid-cols-3 gap-2 bg-[#d084ff]/5 p-2 rounded border border-[#d084ff]/20">
                <div>
                    <label className="text-[9px] text-red-400 block text-center font-bold">PV MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-red-400 font-rajdhani font-bold text-lg"
                        value={data.hpMax || 0} onChange={e => updateData({ hpMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-[#d084ff] block text-center font-bold">KARMA MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-[#d084ff] font-rajdhani font-bold text-lg"
                        value={data.karmaMax || 0} onChange={e => updateData({ karmaMax: handleNumber(e.target.value) })}/>
                </div>
                <div>
                    <label className="text-[9px] text-gray-400 block text-center font-bold">CARGA MÁX</label>
                    <input type="text" onFocus={handleFocus}
                        className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center outline-none focus:border-gray-400 font-rajdhani font-bold text-lg"
                        value={data.maxLoad || 5} onChange={e => updateData({ maxLoad: handleNumber(e.target.value) })}/>
                </div>
            </div>

            {/* 3. ATRIBUTOS */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Atributos</label>
                <div className="grid grid-cols-5 gap-1 bg-black/20 p-2 rounded border border-glass-border">
                    {['Vigor', 'Força', 'Destreza', 'Intelecto', 'Presença'].map(attr => (
                        <div key={attr}>
                            <label className="text-[8px] text-[#d084ff] block text-center uppercase tracking-tighter font-bold">{attr.substring(0,3)}</label>
                            <input type="text" onFocus={handleFocus} maxLength={1}
                                className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold outline-none focus:border-[#d084ff]"
                                value={data.attributes?.[attr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")] || 0} 
                                onChange={e => {
                                    const key = attr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                                    updateData({ attributes: { ...data.attributes, [key]: handleNumber(e.target.value) } })
                                }}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. PERÍCIAS */}
            <div className="bg-black/20 border border-glass-border rounded p-2">
                <label className="text-xs text-gray-400 mb-1 block font-bold">Perícias Treinadas</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {DATA_SKILLS_LIST.map(skill => {
                        const isTrained = (data.trainedSkills || []).includes(skill);
                        return (
                            <label key={skill} className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${isTrained ? 'bg-[#d084ff] border-[#d084ff]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                    {isTrained && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                                </div>
                                <span className={`text-xs ${isTrained ? 'text-white font-bold' : 'text-gray-500 group-hover:text-gray-300'}`}>{skill}</span>
                                <input type="checkbox" className="hidden" checked={isTrained} onChange={() => toggleSkill(skill)} />
                            </label>
                        )
                    })}
                </div>
                <div className="border-t border-white/10 pt-2">
                    <div className="flex gap-1 mb-2">
                        <input placeholder="Nova Perícia..." className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-[#d084ff] outline-none"
                            value={customSkillInput} onChange={(e) => setCustomSkillInput(e.target.value)} />
                        <button onClick={addCustomSkill} className="bg-[#d084ff]/20 text-[#d084ff] px-2 rounded hover:bg-[#d084ff] hover:text-black transition-colors"><Plus size={12}/></button>
                    </div>
                    {(data.customSkills || []).map(skill => (
                        <div key={skill} className="flex justify-between items-center px-2 py-1 bg-white/5 rounded mb-1">
                            <span className="text-xs text-[#d084ff]">{skill}</span>
                            <button onClick={() => removeCustomSkill(skill)} className="text-gray-500 hover:text-red-400"><Trash2 size={10}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. HABILIDADES */}
            <div className="space-y-2">
                <label className="text-xs text-gray-400 block font-bold">Banco de Habilidades</label>
                <div className="flex gap-1 p-1 bg-black/20 rounded-lg">
                    <FilterBtn label="Recom." mode="recommended" icon={Filter} />
                    <FilterBtn label="Todas" mode="all" icon={Layers} />
                    <FilterBtn label="Custom" mode="custom" icon={Sparkles} />
                </div>
                {filterMode !== 'custom' ? (
                    <div className="animate-in fade-in duration-300">
                         <div className="relative group mb-2 mt-2">
                            <div className="absolute top-1.5 left-2.5 text-gray-500"><Search size={14} /></div>
                            <input type="text" placeholder="Buscar habilidade..."
                                className="w-full bg-black/50 border border-glass-border rounded-full py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-[#d084ff]"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="bg-black/20 p-1 rounded border border-glass-border max-h-40 overflow-y-auto scrollbar-thin">
                            {filteredAbilities.length === 0 ? <div className="text-center text-gray-600 text-[10px] py-2">Nada encontrado.</div> : 
                            filteredAbilities.map(ab => {
                                const isSelected = (data.selectedAbilities || []).includes(ab.id);
                                return (
                                    <label key={ab.id} className={`flex items-start gap-2 p-2 mb-1 rounded cursor-pointer border transition-all ${isSelected ? 'bg-[#d084ff]/10 border-[#d084ff]/40' : 'border-transparent hover:bg-white/5'}`}>
                                        <input type="checkbox" className="mt-1 accent-[#d084ff]" checked={isSelected} onChange={() => toggleAbility(ab.id)}/>
                                        <div>
                                            <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{ab.name}</div>
                                            <div className="text-[10px] text-gray-500 leading-tight">{ab.description}</div>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="bg-black/20 border border-glass-border rounded p-2 animate-in slide-in-from-right-2 duration-300 mt-2">
                        {(data.customAbilities || []).length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin mb-3">
                                {data.customAbilities.map(ab => {
                                    // MODO EDIÇÃO
                                    if (editingId === ab.id) {
                                        return (
                                            <div key={ab.id} className="bg-black/60 rounded p-1.5 border border-[#d084ff] flex flex-col gap-1.5 animate-in zoom-in-95 duration-200">
                                                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-xs text-white focus:border-[#d084ff] outline-none font-bold"
                                                    placeholder="Nome..." />
                                                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:border-[#d084ff] outline-none resize-none h-12 leading-tight"
                                                    placeholder="Descrição..." />
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-white"><X size={12}/></button>
                                                    <button onClick={saveEdit} className="p-1 bg-[#d084ff]/20 text-[#d084ff] rounded hover:bg-[#d084ff] hover:text-black"><Check size={12}/></button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // MODO VISUALIZAÇÃO
                                    return (
                                        <div key={ab.id} className="group relative flex justify-between items-start bg-white/5 rounded px-2 py-1.5 border border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex-1 pr-6">
                                                <div className="text-xs text-gray-300 font-bold leading-tight">{ab.name}</div>
                                                <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{ab.description}</div>
                                            </div>
                                            
                                            {/* Botões de Ação (Aparecem no Hover) - LADO A LADO */}
                                            <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded p-0.5 backdrop-blur-sm">
                                                <button onClick={() => startEdit(ab)} className="text-gray-400 hover:text-[#d084ff] p-1" title="Editar">
                                                    <Pencil size={10} />
                                                </button>
                                                <button onClick={() => removeCustomAbility(ab.id)} className="text-gray-400 hover:text-red-400 p-1" title="Excluir">
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-gray-600 text-[10px] py-2 italic mb-2">Nenhuma habilidade criada.</div>
                        )}
                        <div className="border-t border-white/10 pt-2 flex flex-col gap-2">
                            <div className="flex items-center gap-1 text-[#d084ff]">
                                <Sparkles size={10}/> 
                                <span className="text-[10px] font-bold uppercase">Criar Nova</span>
                            </div>
                            <input placeholder="Nome..." className="bg-black/50 border border-white/10 rounded p-1.5 text-xs text-white focus:border-[#d084ff] outline-none"
                                value={customAbilityName} onChange={(e) => setCustomAbilityName(e.target.value)} />
                            <textarea placeholder="Descrição do efeito..." className="bg-black/50 border border-white/10 rounded p-1.5 text-xs text-white focus:border-[#d084ff] outline-none resize-none h-12"
                                value={customAbilityDesc} onChange={(e) => setCustomAbilityDesc(e.target.value)} />
                            <button onClick={addCustomAbility} disabled={!customAbilityName.trim()} 
                                className="bg-[#d084ff]/20 hover:bg-[#d084ff] text-[#d084ff] hover:text-black border border-[#d084ff]/50 rounded py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-30">
                                <Plus size={12}/> Salvar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 6. INVENTÁRIO (MANAGER NO EDITOR) */}
            <InventoryWidget data={data} updateData={updateData} />
            
            {/* 7. NOTAS */}
            <div>
                <label className="text-xs text-gray-400 mb-0.5 block">Notas Gerais</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-sm outline-none focus:border-[#d084ff] h-20 resize-none scrollbar-thin"
                    value={data.notes || ''} onChange={e=>updateData({ notes:e.target.value })}/>
            </div>
        </div>
    );
};

// 3. LOGICA DE MERGE PARA VISUALIZAÇÃO
// Define quais habilidades modificam outras para criar uma visualização unificada.
const UPGRADE_RULES = {
    // ID da Melhoria : { ID do Alvo, Função de Modificação }
    'forma_animal_ii': { 
        target: 'forma_animal', 
        modifier: (base) => { base.description = 'Gaste 2 Karma para adotar a forma de um animal até fim da cena.'; } 
    },
    'ataque_especial_ii': { 
        target: 'ataque_especial', 
        modifier: (base) => { base.description = '1 Karma: Realizar ataque com arma Favorita usando +2 dados.'; } 
    },
    'ataque_extra_ii': { 
        target: 'ataque_extra', 
        modifier: (base) => { base.description = 'Gaste 1 Karma para realizar um ataque adicional no seu turno.'; } 
    },
    'furia_ii': { 
        target: 'furia', 
        modifier: (base) => { base.description = '4 Karma: +1 dado em testes (exceto Intelecto) com duração ilimitada.'; } 
    },
    'furia_iii': { 
        target: 'furia', 
        modifier: (base) => { base.description = '2 Karma: +1 dado em testes (exceto Intelecto) com duração ilimitada.'; } 
    },
    // Ataque Furtivo: Lógica Acumulativa
    'ataque_furtivo_iv': {
        target: 'ataque_furtivo',
        modifier: (base) => { base.description = base.description.replace('+1 dado', '+2 dados'); }
    },
    'ataque_furtivo_ii': {
        target: 'ataque_furtivo',
        modifier: (base) => { 
            // CORREÇÃO: Verifica se já existe qualquer menção a "Crítico" (seja 18+ ou 16+)
            if(!base.description.includes('Crítico')) {
                base.description += ' (Crítico 18+)';
            }
        }
    },
    'ataque_furtivo_iii': {
        target: 'ataque_furtivo',
        modifier: (base) => {
            // Remove a versão anterior (18+) se ela existir e adiciona a nova (16+)
            // Se a string 16+ já existir (caso raro de duplicação), não adiciona novamente
            base.description = base.description.replace(' (Crítico 18+)', '');
            
            if(!base.description.includes('(Crítico 16+)')) {
                 base.description += ' (Crítico 16+)';
            }
        }
    }
};

// 4. COMPONENTE DE VISUALIZAÇÃO
// 4. COMPONENTE DE VISUALIZAÇÃO
// 4. COMPONENTE DE VISUALIZAÇÃO
export const Viewer = ({ data, updateData }) => {
    
    const adjustStat = (stat, max, amount) => {
        const current = data[stat] || 0;
        const maximum = data[max] || 0;
        const newVal = Math.min(maximum, Math.max(0, current + amount));
        updateData({ [stat]: newVal });
    };

    const className = DATA_CLASSES.find(c => c.id === data.classId)?.name || "Sem Classe";
    const originName = DATA_ORIGINS.find(o => o.id === data.originId)?.name || "Desconhecido";
    
    // --- LÓGICA DE PROCESSAMENTO DE HABILIDADES (MERGE) ---
    const displayedAbilities = useMemo(() => {
        // 1. Pega todas as habilidades originais
        let rawList = [
            ...(data.selectedAbilities || []).map(id => {
                const item = DATA_ABILITIES.find(a => a.id === id);
                return item ? { ...item } : null;
            }).filter(Boolean),
            ...(data.customAbilities || []).map(item => ({ ...item }))
        ];

        // 2. Identifica upgrades presentes na lista do usuário
        const upgradesPresent = rawList.filter(item => UPGRADE_RULES[item.id]);

        // 3. Aplica modificações
        upgradesPresent.forEach(upgrade => {
            const rule = UPGRADE_RULES[upgrade.id];
            
            // Procura a habilidade alvo na lista do usuário
            const targetAbility = rawList.find(i => i.id === rule.target);

            if (targetAbility) {
                // Se o alvo existe, aplica a mudança na descrição dele
                rule.modifier(targetAbility);
                
                // --- ALTERAÇÃO: Soma +1 ao contador de upgrades ao invés de apenas marcar true ---
                targetAbility._upgradeCount = (targetAbility._upgradeCount || 0) + 1;
                
                // Marca o upgrade para remoção (para não aparecer duplicado)
                upgrade._merged = true;
            }
        });

        // 4. Retorna lista limpa (sem os upgrades que foram fundidos)
        return rawList.filter(i => !i._merged);

    }, [data.selectedAbilities, data.customAbilities]);


    const allSkills = [...(data.trainedSkills || []), ...(data.customSkills || [])].sort();

    return (
        <>
            {/* 0. IDENTIDADE */}
            <div className="flex items-center justify-center gap-2 mb-3 -mt-1">
                <div className="bg-black/40 border border-[#d084ff]/30 rounded-full px-3 py-1 flex items-center gap-2 shadow-[0_0_10px_rgba(208,132,255,0.15)] backdrop-blur-md">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{originName}</span>
                    <span className="text-[#d084ff] text-[8px]">•</span>
                    <span className="text-xs font-bold text-white font-rajdhani uppercase tracking-widest text-shadow-neon">{className}</span>
                </div>
            </div>

            {/* 1. BARRAS VITAIS */}
            <div className="flex gap-2 mb-4 h-[55px]">
                {/* VIDA */}
                <div className="flex-1 flex items-center justify-between bg-red-950/30 border border-red-500/30 rounded-xl p-1 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-900/60 to-red-600/40 z-0 transition-all duration-500 ease-out" 
                         style={{ width: `${Math.min(100, (data.hp / (data.hpMax || 1)) * 100)}%` }} />
                    <button onClick={() => adjustStat('hp', 'hpMax', -1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-red-500/20 text-red-200 hover:text-white transition-colors pb-1">-</button>
                    
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10">
                        <input type="text" maxLength={3} value={data.hp} onChange={(e) => updateData({ hp: handleNumber(e.target.value) })}
                            className="w-full bg-transparent text-3xl font-rajdhani font-bold text-white text-center outline-none drop-shadow-md focus:text-red-300 py-1" />
                        <span className="text-[7px] text-red-300/80 font-bold tracking-[0.2em] uppercase pointer-events-none absolute bottom-1">Vida</span>
                    </div>

                    <button onClick={() => adjustStat('hp', 'hpMax', 1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-red-500/20 text-red-200 hover:text-white transition-colors pb-1">+</button>
                </div>

                {/* KARMA */}
                <div className="flex-1 flex items-center justify-between bg-purple-950/30 border border-purple-500/30 rounded-xl p-1 shadow-[0_0_15px_rgba(208,132,255,0.15)] relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-900/60 to-[#d084ff]/40 z-0 transition-all duration-500 ease-out" 
                         style={{ width: `${Math.min(100, (data.karma / (data.karmaMax || 1)) * 100)}%` }} />
                    <button onClick={() => adjustStat('karma', 'karmaMax', -1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-purple-500/20 text-purple-200 hover:text-white transition-colors pb-1">-</button>
                    
                    <div className="flex flex-col items-center justify-center leading-none flex-1 z-10">
                         <input type="text" maxLength={3} value={data.karma} onChange={(e) => updateData({ karma: handleNumber(e.target.value) })}
                            className="w-full bg-transparent text-3xl font-rajdhani font-bold text-white text-center outline-none drop-shadow-md focus:text-purple-300 py-1" />
                        <span className="text-[7px] text-purple-300/80 font-bold tracking-[0.2em] uppercase pointer-events-none absolute bottom-1">Karma</span>
                    </div>

                    <button onClick={() => adjustStat('karma', 'karmaMax', 1)} className="z-10 w-8 h-full flex items-center justify-center text-xl rounded bg-black/10 hover:bg-purple-500/20 text-purple-200 hover:text-white transition-colors pb-1">+</button>
                </div>
            </div>

            {/* 2. ATRIBUTOS */}
            <div className="grid grid-cols-5 gap-1.5 mb-4">
                {['Vigor', 'Força', 'Destreza', 'Intelecto', 'Presença'].map(attr => (
                        <div key={attr} className="bg-glass border border-white/10 rounded-lg flex flex-col items-center justify-center py-2 relative overflow-hidden hover:border-[#d084ff]/50 transition-colors group">
                        <span className="text-[8px] uppercase text-[#d084ff] font-bold tracking-wider z-10 drop-shadow-[0_0_5px_rgba(208,132,255,0.5)]">{attr.slice(0,3)}</span>
                        <span className="text-xl font-rajdhani font-bold text-white z-10 mt-0.5">
                            {data.attributes?.[attr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "")] || 0}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#d084ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </div>
                ))}
            </div>

            {/* 3. LAYOUT PRINCIPAL */}
            <div className="flex gap-2 flex-1 min-h-[290px]">
                
                {/* COLUNA ESQUERDA: HABILIDADES */}
                <div className="flex-[3] flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden">
                    <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                        <BookOpen size={12} className="text-[#d084ff]" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Habilidades</span>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#d084ff]/20 scrollbar-track-transparent flex-1">
                        {displayedAbilities.length === 0 ? (
                            <div className="text-center text-gray-600 text-[9px] mt-4 italic">Vazio.</div>
                        ) : (
                            displayedAbilities.map((ab, idx) => (
                                <div key={`${ab.id}-${idx}`} className="bg-black/40 border-l-2 border-[#d084ff] rounded-r px-2 py-1.5 relative group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-white">{ab.name}</span>
                                            
                                            {/* --- TAG DE MELHORIA MULTIPLA (ALTERADA) --- */}
                                            {ab._upgradeCount > 0 && (
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-purple-950/50 border border-purple-500/30 text-purple-400">
                                                    {/* Renderiza um ícone para cada nível de upgrade */}
                                                    {Array.from({ length: ab._upgradeCount }).map((_, i) => (
                                                        <ChevronsUp key={i} size={8} />
                                                    ))}
                                                </div>
                                            )}
                                            {/* ------------------------------------------ */}
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-400 leading-snug font-mono mt-0.5">{ab.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUNA DIREITA: PERÍCIAS + NOTAS */}
                <div className="flex-[2] flex flex-col gap-2">
                    
                    {/* CAIXA DE PERÍCIAS */}
                    <div className="flex-1 flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden min-h-[100px]">
                        <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                            <Activity size={12} className="text-[#d084ff]" />
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Perícias</span>
                        </div>
                        <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#d084ff]/20 scrollbar-track-transparent flex-1">
                            {allSkills.length === 0 ? (
                                <div className="text-center text-gray-600 text-[9px] mt-4 italic">Nenhuma treinada.</div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    {allSkills.map(skill => (
                                        <div key={skill} className="flex items-center gap-1.5">
                                            <CheckCircle2 size={10} className="text-[#d084ff]" />
                                            <span className="text-[10px] text-gray-300">{skill}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CAIXA DE NOTAS */}
                    <div className="flex-1 flex flex-col bg-glass border border-glass-border rounded-xl p-0 overflow-hidden min-h-[80px]">
                         <div className="bg-white/5 p-2 border-b border-white/5 flex items-center gap-2">
                            <PenLine size={12} className="text-gray-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notas</span>
                        </div>
                         <div className="p-2 text-[10px] text-gray-300 whitespace-pre-wrap font-mono leading-tight flex-1 overflow-y-auto scrollbar-thin">
                             {data.notes || "..."}
                         </div>
                    </div>

                </div>
            </div>

            {/* 4. INVENTÁRIO */}
            <InventoryWidget data={data} updateData={updateData} />

        </>
    );
};