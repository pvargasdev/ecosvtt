import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Chaves de armazenamento
const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_current_v5';
const STORAGE_ADVENTURES_KEY = 'ecos_vtt_adventures_v1';
const PRESETS_KEY = 'ecos_vtt_presets_v1';
const ACTIVE_PRESET_KEY = 'ecos_vtt_active_preset_id';

const initialState = {
  meta: { system: "ECOS RPG VTT", version: "5.0" },
  characters: [], // Apenas para a Sidebar
};

const GameContext = createContext({});

export const GameProvider = ({ children }) => {
  // ==========================================
  // 1. ESTADO: BARRA LATERAL (PERSONAGENS)
  // ==========================================
  const [characters, setCharacters] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHARACTERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [presets, setPresets] = useState(() => {
    try {
        const saved = localStorage.getItem(PRESETS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activePresetId, setActivePresetId] = useState(() => {
      return localStorage.getItem(ACTIVE_PRESET_KEY) || null;
  });

  // ==========================================
  // 2. ESTADO: VTT (AVENTURAS)
  // ==========================================
  const [adventures, setAdventures] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADVENTURES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeAdventureId, setActiveAdventureId] = useState(null);

  // ==========================================
  // 3. PERSISTÊNCIA
  // ==========================================
  useEffect(() => { localStorage.setItem(STORAGE_CHARACTERS_KEY, JSON.stringify(characters)); }, [characters]);
  useEffect(() => { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); }, [presets]);
  useEffect(() => { localStorage.setItem(STORAGE_ADVENTURES_KEY, JSON.stringify(adventures)); }, [adventures]);
  
  useEffect(() => { 
      if(activePresetId) localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      else localStorage.removeItem(ACTIVE_PRESET_KEY);
  }, [activePresetId]);

  const generateUUID = () => crypto.randomUUID();

  // Helpers de Acesso Rápido
  const activeAdventure = adventures.find(a => a.id === activeAdventureId);
// Use '?.' para evitar erro se activeAdventure for undefined
const activeScene = activeAdventure?.scenes.find(s => s.id === activeAdventure.activeSceneId);

  // ==========================================
  // 4. LÓGICA DE AVENTURAS (VTT)
  // ==========================================

  const createAdventure = useCallback((name) => {
    const newSceneId = generateUUID();
    const newAdventure = {
        id: generateUUID(),
        name: name,
        activeSceneId: newSceneId,
        tokenLibrary: [], // Lista de { id, imageSrc } para monstros/NPCs
        scenes: [
            { 
              id: newSceneId, 
              name: "Cena 1", 
              mapImage: null, 
              mapScale: 1.0, 
              tokens: [] 
            }
        ]
    };
    setAdventures(prev => [...prev, newAdventure]);
    setActiveAdventureId(newAdventure.id);
  }, []);

  const deleteAdventure = useCallback((id) => {
      setAdventures(prev => prev.filter(a => a.id !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
  }, [activeAdventureId]);

  // --- Cenas ---

  const addScene = useCallback((name, mapImageSrc = null) => {
      if (!activeAdventureId) return;
      const newId = generateUUID();
      const newScene = { id: newId, name: name || "Nova Cena", mapImage: mapImageSrc, mapScale: 1.0, tokens: [] };
      
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: [...adv.scenes, newScene],
              activeSceneId: newId // Opcional: Já foca na nova cena
          };
      }));
  }, [activeAdventureId]);

  const updateScene = useCallback((sceneId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s)
          };
      }));
  }, [activeAdventureId]);

  const setActiveScene = useCallback((sceneId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, activeSceneId: sceneId };
      }));
  }, [activeAdventureId]);

  const deleteScene = useCallback((sceneId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          const newScenes = adv.scenes.filter(s => s.id !== sceneId);
          // Se deletou a ativa, muda para a primeira disponível
          let newActive = adv.activeSceneId;
          if (sceneId === adv.activeSceneId) {
              newActive = newScenes.length > 0 ? newScenes[0].id : null;
          }
          return { ...adv, scenes: newScenes, activeSceneId: newActive };
      }));
  }, [activeAdventureId]);

  // --- Biblioteca de Tokens (NPCs) ---

  const addTokenToLibrary = useCallback((imageSrc) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              tokenLibrary: [...adv.tokenLibrary, { id: generateUUID(), imageSrc }]
          };
      }));
  }, [activeAdventureId]);

  // --- Instâncias de Tokens (No Mapa) ---

  const addTokenInstance = useCallback((sceneId, tokenData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: adv.scenes.map(s => {
                  if (s.id !== sceneId) return s;
                  return {
                      ...s,
                      tokens: [...s.tokens, { 
                          id: generateUUID(), 
                          x: 0, y: 0, scale: 1, 
                          ...tokenData 
                      }]
                  };
              })
          };
      }));
  }, [activeAdventureId]);

  const updateTokenInstance = useCallback((sceneId, tokenId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: adv.scenes.map(s => {
                  if (s.id !== sceneId) return s;
                  return {
                      ...s,
                      tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t)
                  };
              })
          };
      }));
  }, [activeAdventureId]);

  const deleteTokenInstance = useCallback((sceneId, tokenId) => {
    if (!activeAdventureId) return;
    setAdventures(prev => prev.map(adv => {
        if (adv.id !== activeAdventureId) return adv;
        return {
            ...adv,
            scenes: adv.scenes.map(s => {
                if (s.id !== sceneId) return s;
                return { ...s, tokens: s.tokens.filter(t => t.id !== tokenId) };
            })
        };
    }));
  }, [activeAdventureId]);


  // ==========================================
  // 5. LÓGICA DE PERSONAGENS (SIDEBAR)
  // ==========================================

  const addCharacter = useCallback((charData) => {
    const newChar = {
      id: generateUUID(),
      name: "Novo Personagem",
      description: "",
      photo: null,
      karma: 0,
      karmaMax: 3,
      attributes: { mente: 0, corpo: 0, destreza: 0, presenca: 0 },
      skills: "",
      damage: { superior: [false], medium: [false, false], inferior: [false, false] },
      ...charData
    };
    setCharacters(prev => [...prev, newChar]);
    return newChar.id;
  }, []);

  const updateCharacter = useCallback((id, updates) => {
    setCharacters(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char));
  }, []);

  const deleteCharacter = useCallback((id) => {
    setCharacters(prev => prev.filter(char => char.id !== id));
  }, []);

  const importCharacters = useCallback((newCharactersArray) => {
    if (!Array.isArray(newCharactersArray)) return;
    setCharacters(prev => [...prev, ...newCharactersArray]);
  }, []);

  const setAllCharacters = useCallback((newCharList) => {
    setCharacters(newCharList);
  }, []);

  // --- Presets (Grupos de Personagens) ---

  const createPreset = useCallback((name) => {
    const newPreset = {
        id: generateUUID(),
        name: name,
        characters: [] 
    };
    setCharacters([]); // Limpa a mesa
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    return newPreset.id;
  }, []);

  const loadPreset = useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setCharacters([...preset.characters]);
    setActivePresetId(presetId);
  }, [presets]);

  const saveToPreset = useCallback((presetId) => {
    setPresets(prev => prev.map(p => {
        if (p.id === presetId) {
            return { ...p, characters: characters }; // Salva o estado atual 'characters'
        }
        return p;
    }));
  }, [characters]);

  const exitPreset = useCallback(() => {
      setActivePresetId(null);
      setCharacters([]); 
  }, []);

  const deletePreset = useCallback((id) => {
      setPresets(prev => prev.filter(p => p.id !== id));
      if (activePresetId === id) {
          setActivePresetId(null);
          setCharacters([]);
      }
  }, [activePresetId]);

  const mergePresets = useCallback((newPresets) => {
      setPresets(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newPresets.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
      });
  }, []);

  // ==========================================
  // 6. VALOR EXPOSTO (API)
  // ==========================================
  const value = {
    // VTT / Aventuras
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, setActiveAdventureId,
    addScene, updateScene, setActiveScene, deleteScene,
    addTokenToLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance,
    
    // Sidebar / Personagens (Compatibilidade)
    gameState: { characters }, // Wrapper para o CharacterSidebar não quebrar
    presets, activePresetId,
    addCharacter, updateCharacter, deleteCharacter, importCharacters, setAllCharacters,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);