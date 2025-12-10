import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { imageDB } from './db'; // Importe o arquivo criado acima

// Chaves de armazenamento
const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_v6'; // Versão nova para evitar conflito
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
  // 2. PERSISTÊNCIA (OTIMIZADA)
  // ==========================================
  
  // Função segura para salvar no localStorage (trata o erro de Quota)
  const safeSave = (key, data) => {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
          if (e.name === 'QuotaExceededError') {
              console.error("ERRO CRÍTICO: LocalStorage cheio. Limpe dados antigos.");
              alert("Atenção: Espaço de armazenamento cheio! As alterações recentes não foram salvas. Tente excluir aventuras antigas.");
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
  // 3. GERENCIAMENTO DE IMAGENS (ASYNC)
  // ==========================================

  // Processa upload e salva no IndexedDB, retornando apenas o ID para o State
  const handleImageUpload = async (file) => {
      if (!file) return null;
      try {
          const id = await imageDB.saveImage(file);
          return id; // Retorna UUID, não Base64
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
      // TODO: Idealmente deletaríamos as imagens do DB também, mas por segurança mantemos por enquanto
      setAdventures(prev => prev.filter(a => a.id !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
  }, [activeAdventureId]);

  // --- Cenas ---

  // Alterado para receber ID de imagem, não a imagem em si
  const addScene = useCallback((name) => {
      if (!activeAdventureId) return;
      const newId = generateUUID();
      const newScene = { id: newId, name: name || "Nova Cena", mapImageId: null, mapScale: 1.0, tokens: [] };
      
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: [...adv.scenes, newScene], activeSceneId: newId };
      }));
  }, [activeAdventureId]);

  // Função helper para atualizar Background
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
      // tokenData espera receber { imageId, x, y, ... }
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

  // --- Characters & Presets (Mantidos igual) ---
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

  // --- RESET TOTAL (Solução de Emergência) ---
  const resetAllData = async () => {
      localStorage.clear();
      await imageDB.clearAll();
      window.location.reload();
  };

  const value = {
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, setActiveAdventureId,
    addScene, updateScene, updateSceneMap, setActiveScene, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance,
    gameState: { characters },
    presets, activePresetId,
    addCharacter, updateCharacter, deleteCharacter, importCharacters, setAllCharacters,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset,
    resetAllData // Exposto para ser usado em botões de emergência
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);