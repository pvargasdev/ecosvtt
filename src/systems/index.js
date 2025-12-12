import * as EcosRPG from './ecos_rpg';
import * as Dnd5e from './dnd5e_srd';

export const SYSTEMS = {
    [EcosRPG.SYSTEM_ID]: EcosRPG,
    [Dnd5e.SYSTEM_ID]: Dnd5e,
};

export const getSystem = (id) => {
    return SYSTEMS[id] || EcosRPG;
    
};

export const getSystemDefaultState = (id) => {
    const sys = getSystem(id);
    return sys.defaultState ? JSON.parse(JSON.stringify(sys.defaultState)) : {};
};

// NOVO: Retorna lista para o Modal de Seleção
export const getSystemList = () => {
    return Object.values(SYSTEMS).map(sys => ({
        id: sys.SYSTEM_ID,
        name: sys.SYSTEM_NAME,
        // Você pode adicionar descrições nos arquivos de sistema futuramente
        description: sys.SYSTEM_DESC || "-" 
    }));
};