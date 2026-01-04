import * as EcosRPG from './ecos_rpg';
import * as Guilda from './guilda';
import * as Dnd5e from './dnd5e_srd';
import * as OrdemP from './ordem_paranormal';
import * as OrdemHorror from './ordem_horror';
import * as Vamp from './vampiro';

export const SYSTEMS = {
    [EcosRPG.SYSTEM_ID]: EcosRPG,
    [Guilda.SYSTEM_ID]: Guilda,
    [Dnd5e.SYSTEM_ID]: Dnd5e,
    [OrdemP.SYSTEM_ID]: OrdemP,
    [OrdemHorror.SYSTEM_ID]: OrdemHorror,
    [Vamp.SYSTEM_ID]: Vamp,
};

export const getSystem = (id) => {
    return SYSTEMS[id] || EcosRPG;
    
};

export const getSystemDefaultState = (id) => {
    const sys = getSystem(id);
    return sys.defaultState ? JSON.parse(JSON.stringify(sys.defaultState)) : {};
};

export const getSystemList = () => {
    return Object.values(SYSTEMS).map(sys => ({
        id: sys.SYSTEM_ID,
        name: sys.SYSTEM_NAME,
        description: sys.SYSTEM_DESC || "-" 
    }));
};