import React, { useMemo, useState } from 'react';
import { 
    Shield, Zap, Activity, BookOpen, Plus, Trash2, Search, Filter, 
    Layers, CheckCircle2, Sparkles, PenLine, Package, Weight, X, 
    CheckSquare, Square, Pencil, Check, ChevronsUp
} from 'lucide-react';

const THEME_MAIN = "text-[#d084ff]"; 
const THEME_GLOW = "shadow-[0_0_15px_rgba(208,132,255,0.4)]";

// ==================================================================================

const DATA_ORIGINS = [
    { id: 'constructo', name: 'Constructo', description: 'Seres de corpo mecânico que possuem consciência.' },
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
    { id: 'bardo', name: 'Bardo' },
    { id: 'bruto', name: 'Bruto' },
    { id: 'cacador', name: 'Caçador' },
    { id: 'combatente', name: 'Combatente' },
    { id: 'feiticeiro', name: 'Feiticeiro' },
    { id: 'vigarista', name: 'Vigarista' },
];

const DATA_SKILLS_LIST = [
    'Carisma', 'Enganação', 'Furtividade', 'Intimidação', 
    'Intuição', 'Medicina', 'Misticismo', 'Natureza', 
    'Percepção', 'Persuasão', 'Religião', 'Tecnologia'
];

const DATA_ABILITIES = [
    // --- HABILIDADES DE ORIGEM [Pág. 25] ---
    { id: 'corpo_maquina', name: 'Corpo de Máquina', type: 'origin', req: 'constructo', description: 'Você possui resistência a dano de Raio e de Fogo.' },
    { id: 'serenidade', name: 'Serenidade', type: 'origin', req: 'elfo', description: 'Seu valor máximo de Karma é aumentado em +1.' },
    { id: 'espirito_civico', name: 'Espírito Cívico', type: 'origin', req: 'pequenino', description: 'Até 2 vezes por sessão, ajude alguém sem gastar Karma.' },
    { id: 'determinacao_versatil', name: 'Determinação Versátil', type: 'origin', req: 'humano', description: 'Uma vez por sessão, adicione +2 dados para qualquer teste.' },
    { id: 'parrudo', name: 'Parrudo', type: 'origin', req: 'meio_orc', description: 'Imune a efeitos de veneno, toxina ou atordoamento.' },
    { id: 'nascido_do_inferno', name: 'Nascido do Inferno', type: 'origin', req: 'tiefling', description: 'Você possui imunidade contra chamas e calor intenso.' },
    { id: 'heranca_vampirica', name: 'Herança Vampírica', type: 'origin', req: 'vampiro', description: 'Sugar sangue cura 1 PV. Sofre 1 dano sob luz do Sol.' },

    // --- ACÓLITO [Pág. 28] ---
    { id: 'patrono', name: 'Patrono', type: 'class', req: 'acolito', description: 'Uma vez, suplique por ajuda de sua entidade em grande necessidade.' },
    { id: 'maos_que_curam', name: 'Mãos que Curam', type: 'class', req: 'acolito', cost: 2, description: '2 Karma: Cura 2 PV de você ou de um aliado próximo.' },
    { id: 'iluminacao', name: 'Iluminação', type: 'class', req: 'acolito', description: 'Faz um objeto brilhar em uma luz forte até o fim da cena.' },
    { id: 'aura_de_protecao', name: 'Aura de Proteção', type: 'class', req: 'acolito', description: 'Aliados próximos recebem +1 dado para resistir a efeitos mentais.' },
    { id: 'cura_em_massa', name: 'Cura em Massa', type: 'class', req: 'acolito', cost: 4, description: '4 Karma: Cura 2 PV de todos os aliados próximos.' },
    { id: 'vingador', name: 'Vingador', type: 'class', req: 'acolito', description: 'Dano duplo contra inimigo que colocou aliado em Morrendo.' },
    { id: 'punicao', name: 'Punição', type: 'class', req: 'acolito', cost: 2, description: '3 Karma: Concede +3 dados para uma rolagem de ataque.' },
    { id: 'vinculo', name: 'Vínculo', type: 'class', req: 'acolito', description: 'Transfere para você um dano sofrido por um aliado próximo.' },
    { id: 'acordo_sobrenatural', name: 'Acordo Sobrenatural', type: 'class', req: 'acolito', description: 'Você imediatamente recebe 3 Karma, mas sofre 2 de dano.' },
    { id: 'amaldicoado', name: 'Amaldiçoado', type: 'class', req: 'acolito', description: 'Karma Máx +3, mas PV Máx -3.' },
    { id: 'sugar_vitalidade', name: 'Sugar Vitalidade', type: 'class', req: 'acolito', description: 'Ao causar 3+ dano em um ataque, você cura 1 PV.' },

    // --- ARTÍFICE [Pág. 30] ---
    { id: 'bolsa_de_tralhas', name: 'Bolsa de Tralhas', type: 'class', req: 'artifice', description: '2x/Sessão: Retira item útil improvisado da bolsa (desfaz após uso).' },
    { id: 'exoesqueleto', name: 'Exoesqueleto', type: 'class', req: 'artifice', description: 'Permite saltos irreais até o fim da cena.' },
    { id: 'inquebravel', name: 'Inquebrável', type: 'class', req: ['artifice', 'bruto'], cost: 3, description: '3 Karma: Reduz um dano sofrido pela metade.' },
    { id: 'drone_sentinela', name: 'Drone Sentinela', type: 'class', req: 'artifice', description: 'Cria drone: +2 dados em testes de Percepção até o fim da cena.' },
    { id: 'mente_astuta', name: 'Mente Astuta', type: 'class', req: 'artifice', description: 'Use Intelecto em vez de Destreza ou Força em um ataque.' },
    { id: 'drone_sentinela_ii', name: 'Drone Sentinela II', type: 'class', req: 'artifice', cost: 1, description: '1 Karma (Drone Ativo): Concede +2 dados para um ataque.' },
    { id: 'drone_sentinela_iii', name: 'Drone Sentinela III', type: 'class', req: 'artifice', description: 'Drone se destrói para anular o próximo dano que você receberia.' },
    { id: 'margem_de_acerto', name: 'Margem de Acerto', type: 'class', req: ['artifice', 'bruto', 'cacador', 'combatente'], description: 'Seus acertos são críticos a partir do valor 19.' },
    { id: 'projetil_teleguiado', name: 'Projétil Teleguiado', type: 'class', req: 'artifice', description: 'Projétil curva, permitindo acertar alvo atrás de cobertura.' },
    { id: 'margem_de_acerto_ii', name: 'Margem de Acerto II', type: 'class', req: ['artifice', 'bruto', 'cacador', 'combatente'], description: 'Seus acertos são críticos a partir do valor 18.' },
    { id: 'ricochete', name: 'Ricochete', type: 'class', req: 'artifice', description: 'Projétil ricocheteia, acertando outro alvo próximo.' },
    { id: 'tiro_elemental', name: 'Tiro Elemental', type: 'class', req: 'artifice', description: 'Altera o tipo de dano de um ataque à distância.' },
    { id: 'scanner', name: 'Scanner', type: 'class', req: 'artifice', description: 'Vê localização de seres a até 10m (mesmo através de paredes) até fim da cena.' },
    { id: 'sobrecarga', name: 'Sobrecarga', type: 'class', req: 'artifice', description: '+2 dados em Tecnologia. Se falhar, sofre 2 de dano.' },
    { id: 'raio_omega', name: 'Raio Ômega', type: 'class', req: 'artifice', description: 'Ataque à distância (DES+2 Raio) que acerta todos em linha reta.' },

    // --- BARDO [Pág. 32] ---
    { id: 'artista_profissional', name: 'Artista Profissional', type: 'class', req: 'bardo', description: 'Use +3 dados em testes de performance de arte escolhida.' },
    { id: 'ilusao', name: 'Ilusão', type: 'class', req: ['bardo', 'feiticeiro'], description: 'Conjura ilusão imóvel realista, durando até ser tocada.' },
    { id: 'passo_nebuloso', name: 'Passo Nebuloso', type: 'class', req: ['bardo', 'vigarista'], cost: 2, description: '2 Karma: Teleporta para qualquer lugar próximo visível.' },
    { id: 'disfarce', name: 'Disfarce', type: 'class', req: ['bardo', 'vigarista'], description: 'Ilusão altera aparência até fim da cena (não engana tato).' },
    { id: 'invisibilidade', name: 'Invisibilidade', type: 'class', req: ['bardo', 'feiticeiro', 'vigarista'], cost: 2, description: '2 Karma: Fica invisível por uma curta duração.' },
    { id: 'insulto_afiado', name: 'Insulto Afiado', type: 'class', req: 'bardo', description: 'Alvo próximo sofre -1 dado no próximo ataque contra você ou aliado.' },
    { id: 'silencio', name: 'Silêncio', type: 'class', req: 'bardo', description: 'Esfera de silêncio absoluto anula sons em área próxima.' },
    { id: 'talento_confiavel', name: 'Talento Confiável', type: 'class', req: ['bardo', 'vigarista'], cost: 2, description: '2 Karma: Role novamente teste auxiliado por perícia.' },
    { id: 'inspirar', name: 'Inspirar', type: 'class', req: ['bardo', 'combatente'], cost: 4, description: '4 Karma: Aliado próximo rola novamente teste recém realizado.' },
    { id: 'bis', name: 'Bis!', type: 'class', req: 'bardo', description: 'Aliado escolhido realiza ataque adicional no turno dele.' },
    { id: 'cativar', name: 'Cativar', type: 'class', req: 'bardo', cost: 2, description: '2 Karma: Distrai alvo, fazendo ele prestar atenção só em você.' },
    { id: 'sugestao', name: 'Sugestão', type: 'class', req: 'bardo', description: 'Implanta pensamento plausível na mente do alvo.' },
    { id: 'riso_histerico', name: 'Riso Histérico', type: 'class', req: 'bardo', cost: 2, description: '2 Karma: Teste vs Alvo. Sucesso causa risada incontrolável.' },

    // --- BRUTO [Pág. 34] ---
    { id: 'duro_na_queda', name: 'Duro na Queda', type: 'class', req: 'bruto', description: 'Seu valor máximo de PV é aumentado em +2.' },
    { id: 'cai_dentro', name: 'Cai Dentro', type: 'class', req: ['bruto', 'combatente'], cost: 3, description: '3 Karma: Alvo usa -2 dados se atacar outro que não você.' },
    { id: 'pele_resistente', name: 'Pele Resistente', type: 'class', req: 'bruto', description: 'Imune a ataques que causariam apenas 1 de dano.' },
    { id: 'adrenalina', name: 'Adrenalina', type: 'class', req: ['bruto', 'combatente'], description: 'Desloca-se o dobro da distância normal por duração breve.' },
    { id: 'ataque_extra', name: 'Ataque Extra', type: 'class', req: ['bruto', 'cacador', 'combatente'], cost: 2, description: '2 Karma: Realiza um ataque adicional no seu turno.' },
    { id: 'ataque_imprudente', name: 'Ataque Imprudente', type: 'class', req: 'bruto', description: '+2 dados no ataque, mas -1 dado na sua próxima defesa.' },
    { id: 'ataque_extra_ii', name: 'Ataque Extra II', type: 'class', req: ['bruto', 'cacador', 'combatente'], description: 'Ataque Extra passa a custar apenas 1 Karma.' },
    { id: 'furia', name: 'Fúria', type: 'class', req: 'bruto', cost: 2, description: '2 Karma: +1 dado para ataques por duração curta.' },
    { id: 'presenca_avassaladora', name: 'Presença Avassaladora', type: 'class', req: 'bruto', description: '+1 dado em um teste de Intimidação.' },
    { id: 'furia_ii', name: 'Fúria II', type: 'class', req: 'bruto', description: 'Fúria dura até fim da cena, mas custa 4 Karma.' },
    { id: 'furia_iii', name: 'Fúria III', type: 'class', req: 'bruto', description: 'Fúria volta a custar 2 Karma (mantendo duração de cena).' },
    { id: 'cargueiro', name: 'Cargueiro', type: 'class', req: 'bruto', description: 'Sua Capacidade de Carga aumenta em +2.' },
    { id: 'cargueiro_ii', name: 'Cargueiro II', type: 'class', req: 'bruto', description: 'Sua Capacidade de Carga aumenta em +2 adicionais.' },
    { id: 'rejeitar_fraqueza', name: 'Rejeitar Fraqueza', type: 'class', req: 'bruto', description: 'Role novamente um teste recém realizado.' },

    // --- CAÇADOR [Pág. 36] ---
    { id: 'olho_de_aguia', name: 'Olho de Águia', type: 'class', req: 'cacador', description: 'Ignora penalidade por distância estendida (1 nível).' },
    { id: 'ataques_sucessivos', name: 'Ataques Sucessivos', type: 'class', req: 'cacador', description: 'Após matar um alvo, faça dois ataques adicionais.' },
    { id: 'so_pra_garantir', name: 'Só pra Garantir', type: 'class', req: ['cacador', 'vigarista'], description: 'Receba +1 dado em um teste que está prestes a fazer.' },
    { id: 'brecha_na_guarda', name: 'Brecha na Guarda', type: 'class', req: 'cacador', description: 'Quando aliado ataca, você ataca o mesmo alvo imediatamente.' },
    { id: 'interrupcao', name: 'Interrupção', type: 'class', req: 'cacador', description: 'Ataque oponente antes dele atacar. Se causar 3+ dano, anula o dele.' },
    { id: 'roleta_russa', name: 'Roleta Russa', type: 'class', req: 'cacador', description: 'Dado extra: Par (dano duplo), Ímpar (ataque anulado).' },
    { id: 'advertencia', name: 'Advertência', type: 'class', req: 'cacador', description: 'Teste Presença vs Alvo. Sucesso atordoa o alvo.' },
    { id: 'camuflagem', name: 'Camuflagem', type: 'class', req: 'cacador', description: 'Camuflagem perfeita em ambiente natural/cobertura até mover.' },
    { id: 'disparo_perfurante', name: 'Disparo Perfurante', type: 'class', req: 'cacador', description: 'Projétil atravessa alvo, acertando um segundo atrás dele.' },
    { id: 'ponto_fraco', name: 'Ponto Fraco', type: 'class', req: 'cacador', description: 'Escolha alvo. Até fim da cena, seus ataques nele usam +1 dado.' },
    { id: 'mira_estabilizada', name: 'Mira Estabilizada', type: 'class', req: 'cacador', description: 'Se não mover, recebe +1 dado para ataque à distância no próximo turno.' },
    { id: 'caindo_com_estilo', name: 'Caindo com Estilo', type: 'class', req: 'cacador', description: 'Ao entrar em Morrendo, realiza ataque com dano duplicado.' },
    { id: 'critico_letal', name: 'Crítico Letal', type: 'class', req: ['cacador', 'combatente'], description: 'Acertos críticos valem como 3 danos (ao invés de 2).' },

    // --- COMBATENTE [Pág. 38] ---
    { id: 'a_favorita', name: 'A Favorita', type: 'class', req: 'combatente', description: 'Recebe +1 dado ao atacar com sua arma favorita escolhida.' },
    { id: 'passo_das_nuvens', name: 'Passo das Nuvens', type: 'class', req: 'combatente', description: 'Corre por superfícies verticais sem cair por breve duração.' },
    { id: 'ataque_especial', name: 'Ataque Especial', type: 'class', req: 'combatente', cost: 2, description: '3 Karma: Adiciona +2 dados em uma rolagem de ataque.' },
    { id: 'protecao', name: 'Proteção', type: 'class', req: 'combatente', description: 'Reduz em -2 dados um ataque contra aliado próximo.' },
    { id: 'ataque_especial_ii', name: 'Ataque Especial II', type: 'class', req: 'combatente', description: 'Ataque Especial passa a custar apenas 2 Karma.' },
    { id: 'reflexos_de_combate', name: 'Reflexos de Combate', type: 'class', req: ['combatente', 'vigarista'], description: 'Ataque adicional na 1ª rodada de qualquer combate.' },
    { id: 'estrategia_de_defesa', name: 'Estratégia de Defesa', type: 'class', req: 'combatente', description: 'Aliados próximos recebem +1 dado em Defesa até fim da cena.' },
    { id: 'grito_de_guerra', name: 'Grito de Guerra', type: 'class', req: 'combatente', description: 'Aliados próximos recebem +1 dado em Ataque até fim da cena.' },
    { id: 'inspirar_ii', name: 'Inspirar II', type: 'class', req: 'combatente', description: 'Inspirar passa a custar apenas 3 Karma.' },

    // --- FEITICEIRO [Pág. 40] ---
    { id: 'fome_por_conhecimento', name: 'Fome por Conhecimento', type: 'class', req: 'feiticeiro', description: 'Começa com "Projétil Elemental" desbloqueado.' },
    { id: 'projetil_elemental', name: 'Projétil Elemental', type: 'class', req: 'feiticeiro', description: 'Ataque desarmado (INT+1) à distância, dano à escolha.' },
    { id: 'projetil_poderoso', name: 'Projétil Poderoso', type: 'class', req: 'feiticeiro', cost: 2, description: '2 Karma: +2 dados para ataque à distância desarmado.' },
    { id: 'ataque_elemental', name: 'Ataque Elemental', type: 'class', req: 'feiticeiro', description: 'Ataques corpo a corpo causam tipo de dano à escolha.' },
    { id: 'explosao_elemental', name: 'Explosão Elemental', type: 'class', req: 'feiticeiro', description: 'Converte ataque desarmado em área média.' },
    { id: 'maos_magicas', name: 'Mãos Mágicas', type: 'class', req: 'feiticeiro', description: 'Conjura mão fantasma que executa tarefas à distância.' },
    { id: 'conjurar_espiritos', name: 'Conjurar Espíritos', type: 'class', req: 'feiticeiro', cost: 2, description: '2 Karma: Espírito aliado ataca (INT+1) por duração curta.' },
    { id: 'flagelo', name: 'Flagelo', type: 'class', req: 'feiticeiro', description: 'Recebe 3 Karma, mas sofre 2 de dano.' },
    { id: 'forma_animal', name: 'Forma Animal', type: 'class', req: 'feiticeiro', description: 'Adota forma de animal tocado hoje (até fim da cena).' },
    { id: 'falar_com_natureza', name: 'Falar com Natureza', type: 'class', req: 'feiticeiro', description: 'Conversa com animais e plantas.' },
    { id: 'forma_animal_ii', name: 'Forma Animal II', type: 'class', req: 'feiticeiro', description: 'Forma Animal passa a custar apenas 2 Karma.' },
    { id: 'constricao', name: 'Constrição', type: 'class', req: 'feiticeiro', description: 'Teste vs Alvo. Sucesso prende alvo em vinhas.' },

    // --- VIGARISTA [Pág. 42] ---
    { id: 'plagio', name: 'Plágio', type: 'class', req: 'vigarista', description: 'Recebe habilidade Grau 1 de outra classe.' },
    { id: 'ataque_furtivo', name: 'Ataque Furtivo', type: 'class', req: 'vigarista', description: 'Receba +1 dado para qualquer ataque furtivo.' },
    { id: 'ataque_furtivo_ii', name: 'Ataque Furtivo II', type: 'class', req: 'vigarista', description: 'Ataques furtivos são críticos a partir do valor 18.' },
    { id: 'ataque_furtivo_iii', name: 'Ataque Furtivo III', type: 'class', req: 'vigarista', description: 'Recebe +2 dados para ataques furtivos (ao invés de +1).' },
    { id: 'ataque_furtivo_iv', name: 'Ataque Furtivo IV', type: 'class', req: 'vigarista', description: 'Ataques furtivos são críticos a partir do valor 16.' },
    { id: 'esquiva_sobrenatural', name: 'Esquiva Sobrenatural', type: 'class', req: 'vigarista', cost: 2, description: '2 Karma: Reduz ataque sofrido em -2 dados.' },
    { id: 'truque_de_mestre', name: 'Truque de Mestre', type: 'class', req: 'vigarista', description: 'Realiza habilidade que viu aliado usar na cena.' },

    // --- HABILIDADES COMPARTILHADAS ---
    { id: 'iniciado_combatente', name: 'Iniciado Combatente', type: 'class', req: ['acolito', 'artifice', 'feiticeiro'], description: 'Desbloqueia uma habilidade de Combatente Grau 1.' },
    { id: 'iniciado_combatente_ii', name: 'Iniciado Combatente II', type: 'class', req: ['acolito', 'artifice', 'feiticeiro'], description: 'Desbloqueia outra habilidade de Combatente Grau 1.' },
    { id: 'iniciado_feiticeiro', name: 'Iniciado Feiticeiro', type: 'class', req: ['acolito', 'bardo', 'vigarista'], description: 'Desbloqueia uma habilidade de Feiticeiro Grau 1.' },
    { id: 'iniciado_feiticeiro_ii', name: 'Iniciado Feiticeiro II', type: 'class', req: ['acolito', 'bardo', 'vigarista'], description: 'Desbloqueia outra habilidade de Feiticeiro Grau 1.' },
    { id: 'conexao_espiritual', name: 'Conexão Espiritual', type: 'class', req: ['acolito', 'bardo', 'vigarista'], description: 'Seu valor máx. de Karma aumenta em +1.' },
    { id: 'conexao_espiritual_ii', name: 'Conexão Espiritual II', type: 'class', req: ['acolito', 'bardo', 'vigarista'], description: 'Seu valor máx. de Karma aumenta em +1 adicional.' },
];

const handleNumber = (value) => {
    const clean = value.toString().replace(/[^0-9-]/g, '').slice(0, 3);
    return clean === '' || clean === '-' ? 0 : parseInt(clean);
};

export const SYSTEM_ID = 'ecos_rpg_v1';
export const SYSTEM_NAME = 'ECOS RPG';
export const SYSTEM_DESC = 'Versão 0.6.0.1';

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
    
    maxLoad: 5,
    inventory: []
};

const InventoryWidget = ({ data, updateData, readOnlyMode = false }) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemWeight, setNewItemWeight] = useState(1);
    const [newItemDesc, setNewItemDesc] = useState("");
    const [isAdding, setIsAdding] = useState(false);

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

export const Editor = ({ data, updateData }) => {
    const handleFocus = (e) => e.target.select();
    
    const [customAbilityName, setCustomAbilityName] = useState("");
    const [customAbilityDesc, setCustomAbilityDesc] = useState("");
    const [customSkillInput, setCustomSkillInput] = useState("");
    
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("recommended"); 

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
                
                if (ab.type === 'origin') {
                    if (Array.isArray(ab.req)) return ab.req.includes(data.originId);
                    return ab.req === data.originId;
                }
                
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

                                    return (
                                        <div key={ab.id} className="group relative flex justify-between items-start bg-white/5 rounded px-2 py-1.5 border border-white/5 hover:border-white/10 transition-all">
                                            <div className="flex-1 pr-6">
                                                <div className="text-xs text-gray-300 font-bold leading-tight">{ab.name}</div>
                                                <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{ab.description}</div>
                                            </div>
                                            
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

const UPGRADE_RULES = {
    'forma_animal_ii': { 
        target: 'forma_animal', 
        modifier: (base) => { base.description = 'Forma Animal passa a custar apenas 2 Karma.'; } 
    },
    'ataque_especial_ii': { 
        target: 'ataque_especial', 
        modifier: (base) => { base.description = '1 Karma: Adiciona +2 dados em uma rolagem de ataque.'; } 
    },
    'ataque_extra_ii': { 
        target: 'ataque_extra', 
        modifier: (base) => { base.description = '1 Karma: Realiza um ataque adicional no seu turno.'; } 
    },
    'inspirar_ii': {
        target: 'inspirar',
        modifier: (base) => { base.description = '3 Karma: Aliado próximo rola novamente teste recém realizado.'; }
    },
    'furia_ii': { 
        target: 'furia', 
        modifier: (base) => { base.description = '4 Karma: Fúria dura até fim da cena.'; } 
    },
    'furia_iii': { 
        target: 'furia', 
        modifier: (base) => { base.description = '2 Karma: Fúria dura até fim da cena.'; } 
    },
    'drone_sentinela_ii': {
        target: 'drone_sentinela',
        modifier: (base) => { base.description += ' (Ativo 1K: +2 dados no ataque).'; }
    },
    'drone_sentinela_iii': {
        target: 'drone_sentinela',
        modifier: (base) => { base.description += ' (Sacrifício: Anula dano).'; }
    },
    'cargueiro_ii': {
        target: 'cargueiro',
        modifier: (base) => { base.description = 'Sua Capacidade de Carga aumenta em +4.'; }
    },
    'ataque_furtivo_iv': {
        target: 'ataque_furtivo',
        modifier: (base) => { 
             base.description = base.description.replace('(Crítico 18+)', '');
             base.description += ' (Crítico 16+)';
        }
    },
    'ataque_furtivo_ii': {
        target: 'ataque_furtivo',
        modifier: (base) => { 
            if(!base.description.includes('Crítico')) {
                base.description += ' (Crítico 18+)';
            }
        }
    },
    'ataque_furtivo_iii': {
        target: 'ataque_furtivo',
        modifier: (base) => {
             base.description = base.description.replace('+1 dado', '+2 dados');
        }
    }
};

export const Viewer = ({ data, updateData }) => {
    
    const adjustStat = (stat, max, amount) => {
        const current = data[stat] || 0;
        const maximum = data[max] || 0;
        const newVal = Math.min(maximum, Math.max(0, current + amount));
        updateData({ [stat]: newVal });
    };

    const className = DATA_CLASSES.find(c => c.id === data.classId)?.name || "Sem Classe";
    const originName = DATA_ORIGINS.find(o => o.id === data.originId)?.name || "Sem Origem";
    
    const displayedAbilities = useMemo(() => {
        let rawList = [
            ...(data.selectedAbilities || []).map(id => {
                const item = DATA_ABILITIES.find(a => a.id === id);
                return item ? { ...item } : null;
            }).filter(Boolean),
            ...(data.customAbilities || []).map(item => ({ ...item }))
        ];

        const upgradesPresent = rawList.filter(item => UPGRADE_RULES[item.id]);

        upgradesPresent.forEach(upgrade => {
            const rule = UPGRADE_RULES[upgrade.id];
            const targetAbility = rawList.find(i => i.id === rule.target);

            if (targetAbility) {
                rule.modifier(targetAbility);
                targetAbility._upgradeCount = (targetAbility._upgradeCount || 0) + 1;
                upgrade._merged = true;
            }
        });

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
                                            
                                            {ab._upgradeCount > 0 && (
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-purple-950/50 border border-purple-500/30 text-purple-400">
                                                    {Array.from({ length: ab._upgradeCount }).map((_, i) => (
                                                        <ChevronsUp key={i} size={8} />
                                                    ))}
                                                </div>
                                            )}
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