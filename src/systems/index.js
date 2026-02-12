import * as FiveE from './5e_srd';
import * as EcosRPG from './ecos_rpg';
import * as Guilda from './guilda';
import * as GenericSystem from './generic_system';

export const SYSTEMS = {
    [EcosRPG.SYSTEM_ID]: EcosRPG,
    [Guilda.SYSTEM_ID]: Guilda,
    [FiveE.SYSTEM_ID]: FiveE,
};

export const getSystem = (id) => {
    if (SYSTEMS[id]) return SYSTEMS[id];
    
    return GenericSystem; 
};

export const getSystemList = (customSystems = []) => {
    const staticSystems = Object.values(SYSTEMS).map(sys => ({
        id: sys.SYSTEM_ID,
        name: sys.SYSTEM_NAME,
        description: sys.SYSTEM_DESC || "-" 
    }));

    const dynamicSystems = customSystems.map(sys => ({
        id: sys.id,
        name: sys.name,
        description: "Sistema Customizado"
    }));

    return [...staticSystems, ...dynamicSystems];
};

export const getSystemDefaultState = (id, customBlueprint = null) => {
    const sys = getSystem(id);
    
    if (sys === GenericSystem && customBlueprint) {
        return sys.createInitialState(customBlueprint);
    }

    return sys.defaultState ? JSON.parse(JSON.stringify(sys.defaultState)) : {};
};