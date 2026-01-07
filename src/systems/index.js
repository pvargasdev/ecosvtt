import * as EcosRPG from './ecos_rpg';
import * as Guilda from './guilda';
import * as Dnd5e from './dnd5e_srd';
import * as OrdemP from './ordem_paranormal';
import * as OrdemHorror from './ordem_horror';
import * as Vamp from './vampiro';
import * as GenericSystem from './generic_system';

export const SYSTEMS = {
    [EcosRPG.SYSTEM_ID]: EcosRPG,
    [Guilda.SYSTEM_ID]: Guilda,
    [Dnd5e.SYSTEM_ID]: Dnd5e,
    [OrdemP.SYSTEM_ID]: OrdemP,
    [OrdemHorror.SYSTEM_ID]: OrdemHorror,
    [Vamp.SYSTEM_ID]: Vamp,
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