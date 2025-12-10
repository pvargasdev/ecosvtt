import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { imageDB } from './db';

// Chaves de armazenamento
const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_v6';
const STORAGE_ADVENTURES_KEY = 'ecos_vtt_adventures_v2';
const PRESETS_KEY = 'ecos_vtt_presets_v1';
const ACTIVE_PRESET_KEY = 'ecos_vtt_active_preset_id';

const GameContext = createContext({});

export const GameProvider = ({ children }) => {
  // ==========================================
  // 1. ESTADO
  // ==========================================
  const [characters, setCharacters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CHARACTERS_KEY)) || []; } catch (e) { return []; }
  });

  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; } catch (e) { return []; }
  });

  const [activePresetId, setActivePresetId] = useState(() => localStorage.getItem(ACTIVE_PRESET_KEY) || null);

  const [adventures, setAdventures] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_ADVENTURES_KEY)) || []; } catch (e) { return []; }
  });

  const [activeAdventureId, setActiveAdventureId] = useState(null);

  // ==========================================
  // 2. PERSISTÊNCIA
  // ==========================================
  
  const safeSave = (key, data) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
          if (e.name === 'QuotaExceededError') {
              console.error("ERRO CRÍTICO: LocalStorage cheio.");
          }
      }
  };

  useEffect(() => { safeSave(STORAGE_CHARACTERS_KEY, characters); }, [characters]);
  useEffect(() => { safeSave(PRESETS_KEY, presets); }, [presets]);
  useEffect(() => { safeSave(STORAGE_ADVENTURES_KEY, adventures); }, [adventures]);
  
  useEffect(() => { 
      if(activePresetId) localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      else localStorage.removeItem(ACTIVE_PRESET_KEY);
  }, [activePresetId]);

  const generateUUID = () => crypto.randomUUID();

  // Helpers
  const activeAdventure = adventures.find(a => a.id === activeAdventureId);
  const activeScene = activeAdventure?.scenes.find(s => s.id === activeAdventure.activeSceneId);

  // ==========================================
  // 3. GERENCIAMENTO DE IMAGENS
  // ==========================================

  const handleImageUpload = async (file) => {
      if (!file) return null;
      try {
          const id = await imageDB.saveImage(file);
          return id;
      } catch (e) {
          console.error(e);
          return null;
      }
  };

  // ==========================================
  // 4. LÓGICA DE AVENTURAS
  // ==========================================

  const createAdventure = useCallback((name) => {
    const newSceneId = generateUUID();
    const newAdventure = {
        id: generateUUID(),
        name: name,
        activeSceneId: newSceneId,
        tokenLibrary: [], 
        scenes: [{ id: newSceneId, name: "Cena 1", mapImageId: null, mapScale: 1.0, tokens: [] }]
    };
    setAdventures(prev => [...prev, newAdventure]);
    setActiveAdventureId(newAdventure.id);
  }, []);

  const deleteAdventure = useCallback((id) => {
      setAdventures(prev => prev.filter(a => a.id !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
  }, [activeAdventureId]);

  // --- Cenas ---

  const addScene = useCallback((name) => {
      if (!activeAdventureId) return;
      const newId = generateUUID();
      const newScene = { id: newId, name: name || "Nova Cena", mapImageId: null, mapScale: 1.0, tokens: [] };
      
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: [...adv.scenes, newScene], activeSceneId: newId };
      }));
  }, [activeAdventureId]);

  const updateSceneMap = useCallback(async (sceneId, file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, mapImageId: imageId } : s)
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
          let newActive = adv.activeSceneId;
          if (sceneId === adv.activeSceneId) newActive = newScenes.length > 0 ? newScenes[0].id : null;
          return { ...adv, scenes: newScenes, activeSceneId: newActive };
      }));
  }, [activeAdventureId]);

  // --- Biblioteca de Tokens ---

  const addTokenToLibrary = useCallback(async (file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);

      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId }]
          };
      }));
  }, [activeAdventureId]);

  const removeTokenFromLibrary = useCallback((tokenId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, tokenLibrary: adv.tokenLibrary.filter(t => t.id !== tokenId) };
      }));
  }, [activeAdventureId]);

  // --- Instâncias de Tokens ---

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
                      tokens: [...s.tokens, { id: generateUUID(), x: 0, y: 0, scale: 1, ...tokenData }]
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
                  return { ...s, tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) };
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

  const importCharacterAsToken = useCallback(async (characterId) => {
      const char = characters.find(c => c.id === characterId);
      if (!char || !char.photo) return null;

      // Se a foto já for um ID do banco de imagens (sistema novo), retorna ele mesmo
      // Mas se for base64 (sistema antigo/atual de chars), precisamos salvar no ImageDB
      
      // Tentativa simples: Salvar o conteúdo da foto (seja base64 ou blob) no ImageDB
      // A função saveImage do db.js lida com File ou Blob. Base64 precisa de conversão.
      
      let imageId = null;

      try {
          // Verifica se é Base64
          if (char.photo.startsWith('data:')) {
              const res = await fetch(char.photo);
              const blob = await res.blob();
              imageId = await imageDB.saveImage(blob);
          } else {
              // Assume que já é um ID ou URL válida que trataremos como upload novo para garantir
              // Nota: Se você já salva IDs no char.photo, basta retornar char.photo
              // Aqui assumo que char.photo é Base64 na maioria dos casos
              imageId = await imageDB.saveImage(char.photo); 
          }

          if (imageId && activeAdventureId) {
             // Adiciona à biblioteca da aventura atual se não existir
             setAdventures(prev => prev.map(adv => {
                 if (adv.id !== activeAdventureId) return adv;
                 
                 // Evita duplicatas na biblioteca visual
                 const exists = adv.tokenLibrary?.some(t => t.imageId === imageId);
                 if (exists) return adv;

                 return {
                     ...adv,
                     tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId }]
                 };
             }));
          }

          return imageId;
      } catch (e) {
          console.error("Erro ao importar token do personagem:", e);
          return null;
      }
  }, [characters, activeAdventureId, generateUUID]);

  // NOVO: Deletar múltiplos tokens de uma vez
  const deleteMultipleTokenInstances = useCallback((sceneId, tokenIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(tokenIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              scenes: adv.scenes.map(s => {
                  if (s.id !== sceneId) return s;
                  return { ...s, tokens: s.tokens.filter(t => !idsSet.has(t.id)) };
              })
          };
      }));
  }, [activeAdventureId]);

  // --- Characters & Presets ---
  const addCharacter = useCallback((charData) => {
    const newChar = {
      id: generateUUID(), name: "Novo Personagem", description: "", photo: null, karma: 0, karmaMax: 3,
      attributes: { mente: 0, corpo: 0, destreza: 0, presenca: 0 }, skills: "",
      damage: { superior: [false], medium: [false, false], inferior: [false, false] }, ...charData
    };
    setCharacters(prev => [...prev, newChar]);
    return newChar.id;
  }, []);
  const updateCharacter = useCallback((id, updates) => setCharacters(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char)), []);
  const deleteCharacter = useCallback((id) => setCharacters(prev => prev.filter(char => char.id !== id)), []);
  const importCharacters = useCallback((list) => { if(Array.isArray(list)) setCharacters(prev => [...prev, ...list]); }, []);
  const setAllCharacters = useCallback((list) => setCharacters(list), []);
  const createPreset = useCallback((name) => {
    const newPreset = { id: generateUUID(), name, characters: [] };
    setCharacters([]); setPresets(prev => [...prev, newPreset]); setActivePresetId(newPreset.id); return newPreset.id;
  }, []);
  const loadPreset = useCallback((pid) => { const p = presets.find(x => x.id === pid); if(p) { setCharacters([...p.characters]); setActivePresetId(pid); } }, [presets]);
  const saveToPreset = useCallback((pid) => { setPresets(prev => prev.map(p => p.id === pid ? { ...p, characters } : p)); }, [characters]);
  const exitPreset = useCallback(() => { setActivePresetId(null); setCharacters([]); }, []);
  const deletePreset = useCallback((id) => { setPresets(prev => prev.filter(p => p.id !== id)); if(activePresetId === id) { setActivePresetId(null); setCharacters([]); } }, [activePresetId]);
  const mergePresets = useCallback((list) => { setPresets(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev, ...list.filter(p => !ids.has(p.id))]; }); }, []);

  const resetAllData = async () => {
      localStorage.clear();
      await imageDB.clearAll();
      window.location.reload();
  };

  const value = {
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, setActiveAdventureId,
    addScene, updateScene, updateSceneMap, setActiveScene, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance, deleteMultipleTokenInstances, importCharacterAsToken,
    gameState: { characters },
    presets, activePresetId,
    addCharacter, updateCharacter, deleteCharacter, importCharacters, setAllCharacters,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset,
    resetAllData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);