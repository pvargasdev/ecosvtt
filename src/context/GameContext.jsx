import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { imageDB } from './db';
import JSZip from 'jszip'; 
import { saveAs } from 'file-saver'; 

const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_v6';
const STORAGE_ADVENTURES_KEY = 'ecos_vtt_adventures_v3'; 
const PRESETS_KEY = 'ecos_vtt_presets_v1';
const ACTIVE_PRESET_KEY = 'ecos_vtt_active_preset_id';
const ACTIVE_TOOL_KEY = 'ecos_vtt_active_tool';

const GameContext = createContext({});

export const GameProvider = ({ children }) => {
  // --- ESTADOS (Iniciam vazios para permitir carga assíncrona) ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [characters, setCharacters] = useState([]);
  const [presets, setPresets] = useState([]);
  const [adventures, setAdventures] = useState([]);
  
  const [activePresetId, setActivePresetId] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [activeAdventureId, setActiveAdventureId] = useState(null);

  // --- FUNÇÕES DE ARMAZENAMENTO HÍBRIDO ---
  
  // Ler dados (Disco ou LocalStorage)
  const loadData = async (key) => {
      if (window.electron) {
          try { return await window.electron.readJson(key); } catch { return null; }
      } else {
          try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
      }
  };

  // Salvar dados (Disco ou LocalStorage)
  const saveData = async (key, data) => {
      if (!isDataLoaded) return; // PROTEÇÃO CRÍTICA: Não salvar antes de carregar

      if (window.electron) {
          // Deep clone para garantir pureza dos dados ao passar pela ponte
          const cleanData = JSON.parse(JSON.stringify(data));
          await window.electron.writeJson(key, cleanData);
      } else {
          try { localStorage.setItem(key, JSON.stringify(data)); } 
          catch (e) { if (e.name === 'QuotaExceededError') console.error("LocalStorage cheio."); }
      }
  };

  // --- CARREGAMENTO INICIAL (MOUNT) ---
  useEffect(() => {
      const init = async () => {
          // Carrega as estruturas principais
          const loadedChars = await loadData(STORAGE_CHARACTERS_KEY) || [];
          const loadedPresets = await loadData(PRESETS_KEY) || [];
          const loadedAdventures = await loadData(STORAGE_ADVENTURES_KEY) || [];
          
          // Carrega configurações simples
          let loadedTool = 'select';
          let loadedActivePreset = null;

          if (window.electron) {
              const settings = await window.electron.readJson('ecos_settings') || {};
              loadedTool = settings.activeTool || 'select';
              loadedActivePreset = settings.activePresetId || null;
          } else {
              loadedTool = localStorage.getItem(ACTIVE_TOOL_KEY) || 'select';
              loadedActivePreset = localStorage.getItem(ACTIVE_PRESET_KEY) || null;
          }

          // Atualiza Estado
          setCharacters(loadedChars);
          setPresets(loadedPresets);
          setAdventures(loadedAdventures);
          setActiveTool(loadedTool);
          setActivePresetId(loadedActivePreset);

          // Libera o salvamento automático
          setIsDataLoaded(true);
      };

      init();
  }, []);

  // --- EFEITOS DE SALVAMENTO AUTOMÁTICO ---
  // Só executam se isDataLoaded for true
  
  useEffect(() => { saveData(STORAGE_CHARACTERS_KEY, characters); }, [characters, isDataLoaded]);
  useEffect(() => { saveData(PRESETS_KEY, presets); }, [presets, isDataLoaded]);
  useEffect(() => { saveData(STORAGE_ADVENTURES_KEY, adventures); }, [adventures, isDataLoaded]);

  // Persistência de Configurações
  useEffect(() => {
      if (!isDataLoaded) return;
      if (window.electron) {
          window.electron.writeJson('ecos_settings', { activeTool, activePresetId });
      } else {
          if (activePresetId) localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
          else localStorage.removeItem(ACTIVE_PRESET_KEY);
          localStorage.setItem(ACTIVE_TOOL_KEY, activeTool);
      }
  }, [activePresetId, activeTool, isDataLoaded]);


  // --- LÓGICA DO JOGO (PRESERVADA INTEGRALMENTE) ---

  const generateUUID = () => crypto.randomUUID();
  const activeAdventure = adventures.find(a => a.id === activeAdventureId);
  const activeScene = activeAdventure?.scenes.find(s => s.id === activeAdventure.activeSceneId);

  const handleImageUpload = async (file) => {
      if (!file) return null;
      try { return await imageDB.saveImage(file); } catch (e) { console.error(e); return null; }
  };

  // --- ADVENTURE CRUD ---
  const createAdventure = useCallback((name) => {
    const newSceneId = generateUUID();
    const newAdventure = {
        id: generateUUID(), name: name, activeSceneId: newSceneId, tokenLibrary: [], 
        scenes: [{ id: newSceneId, name: "Cena 1", mapImageId: null, mapScale: 1.0, tokens: [], fogOfWar: [] }]
    };
    setAdventures(prev => [...prev, newAdventure]);
  }, []);

  const deleteAdventure = useCallback((id) => {
      setAdventures(prev => prev.filter(a => a.id !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
  }, [activeAdventureId]);

  const updateAdventure = useCallback((id, updates) => {
    setAdventures(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const duplicateAdventure = useCallback((id) => {
      const original = adventures.find(a => a.id === id);
      if (!original) return;
      const copy = JSON.parse(JSON.stringify(original));
      copy.id = generateUUID();
      copy.name = `${copy.name} (Cópia)`;
      setAdventures(prev => [...prev, copy]);
  }, [adventures]);

  // --- EXPORT / IMPORT ---
  const exportAdventure = useCallback(async (advId) => {
      const adv = adventures.find(a => a.id === advId);
      if (!adv) return;

      const zip = new JSZip();
      zip.file("adventure.json", JSON.stringify(adv));
      const imgFolder = zip.folder("images");

      const imageIds = new Set();
      adv.scenes.forEach(scene => {
          if (scene.mapImageId) imageIds.add(scene.mapImageId);
          scene.tokens.forEach(t => { if (t.imageId) imageIds.add(t.imageId); });
      });
      if (adv.tokenLibrary) {
          adv.tokenLibrary.forEach(t => { if (t.imageId) imageIds.add(t.imageId); });
      }

      for (const id of imageIds) {
          const blob = await imageDB.getImage(id);
          if (blob) imgFolder.file(id, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `adventure_${adv.name.replace(/\s+/g, '_')}.zip`);
  }, [adventures]);

  const importAdventure = useCallback(async (file) => {
      if (!file) return;
      try {
          const zip = await JSZip.loadAsync(file);
          const jsonFile = zip.file("adventure.json");
          if (!jsonFile) throw new Error("Arquivo inválido");
          
          const advData = JSON.parse(await jsonFile.async("string"));
          advData.scenes = advData.scenes.map(scene => ({
              ...scene,
              fogOfWar: scene.fogOfWar || []
          }));
          
          const imgFolder = zip.folder("images");
          if (imgFolder) {
              const images = [];
              imgFolder.forEach((relativePath, file) => images.push({ id: relativePath, file }));
              for (const img of images) {
                  const blob = await img.file.async("blob");
                  await imageDB.saveImage(blob, img.id); 
              }
          }
          const newAdv = { ...advData, id: generateUUID(), name: `${advData.name}` };
          setAdventures(prev => [...prev, newAdv]);
      } catch (e) { console.error(e); alert("Erro ao importar aventura."); }
  }, []);

  // --- SCENE / TOKEN CRUD ---
  const addScene = useCallback((name) => {
      if (!activeAdventureId) return;
      const newId = generateUUID();
      const newScene = { 
          id: newId, 
          name: name || "Nova Cena", 
          mapImageId: null, 
          mapScale: 1.0, 
          tokens: [],
          fogOfWar: [] 
      };
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          scenes: [...adv.scenes, newScene], 
          activeSceneId: newId 
      }));
  }, [activeAdventureId]);

  const updateSceneMap = useCallback(async (sceneId, file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, mapImageId: imageId } : s) 
      }));
  }, [activeAdventureId]);

  const updateScene = useCallback((sceneId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s) 
      }));
  }, [activeAdventureId]);

  const setActiveScene = useCallback((sceneId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          activeSceneId: sceneId 
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

  // --- FOG OF WAR CRUD ---
  const addFogArea = useCallback((sceneId, fogData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  fogOfWar: [...(s.fogOfWar || []), { id: generateUUID(), ...fogData }] 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const updateFogArea = useCallback((sceneId, fogId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  fogOfWar: (s.fogOfWar || []).map(f => f.id === fogId ? { ...f, ...updates } : f) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const deleteFogArea = useCallback((sceneId, fogId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  fogOfWar: (s.fogOfWar || []).filter(f => f.id !== fogId) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const deleteMultipleFogAreas = useCallback((sceneId, fogIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(fogIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  fogOfWar: (s.fogOfWar || []).filter(f => !idsSet.has(f.id)) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  // --- TOKEN LIBRARY ---
  const addTokenToLibrary = useCallback(async (file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId }] 
      }));
  }, [activeAdventureId]);

  const removeTokenFromLibrary = useCallback((tokenId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          tokenLibrary: adv.tokenLibrary.filter(t => t.id !== tokenId) 
      }));
  }, [activeAdventureId]);

  const addTokenInstance = useCallback((sceneId, tokenData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  tokens: [...s.tokens, { id: generateUUID(), x: 0, y: 0, scale: 1, ...tokenData }] 
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
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) 
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
            scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                ...s, 
                tokens: s.tokens.filter(t => t.id !== tokenId) 
            }) 
        };
    }));
  }, [activeAdventureId]);

  const deleteMultipleTokenInstances = useCallback((sceneId, tokenIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(tokenIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  tokens: s.tokens.filter(t => !idsSet.has(t.id)) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const importCharacterAsToken = useCallback(async (characterId) => {
    const char = characters.find(c => c.id === characterId);
    if (!char || !char.photo) return null;
    try {
        let imageId = null;
        if (char.photo.startsWith('data:')) {
            const res = await fetch(char.photo);
            const blob = await res.blob();
            imageId = await imageDB.saveImage(blob);
        } else { imageId = await imageDB.saveImage(char.photo); }
        if (imageId && activeAdventureId) {
           setAdventures(prev => prev.map(adv => {
               if (adv.id !== activeAdventureId) return adv;
               const exists = adv.tokenLibrary?.some(t => t.imageId === imageId);
               if (exists) return adv;
               return { ...adv, tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId }] };
           }));
        }
        return imageId;
    } catch (e) { console.error("Erro import char token:", e); return null; }
  }, [characters, activeAdventureId]);

  // --- CHARACTERS ---
  const addCharacter = useCallback((charData) => {
    const newChar = {
      id: generateUUID(), name: "Novo Personagem", description: "", photo: null, karma: 0, karmaMax: 3,
      attributes: { mente: 0, corpo: 0, destreza: 0, presenca: 0 }, 
      skills: "", 
      traumas: "",
      damage: { superior: [false], medium: [false, false], inferior: [false, false] }, ...charData
    };
    setCharacters(prev => [...prev, newChar]);
    return newChar.id;
  }, []);
  
  const updateCharacter = useCallback((id, updates) => setCharacters(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char)), []);
  const deleteCharacter = useCallback((id) => setCharacters(prev => prev.filter(char => char.id !== id)), []);
  const importCharacters = useCallback((list) => { if(Array.isArray(list)) setCharacters(prev => [...prev, ...list]); }, []);
  const setAllCharacters = useCallback((list) => setCharacters(list), []);

  // --- PRESETS ---
  const createPreset = useCallback((name) => {
    const newPreset = { id: generateUUID(), name, characters: [] };
    setCharacters([]); setPresets(prev => [...prev, newPreset]); return newPreset.id;
  }, []);
  
  const loadPreset = useCallback((pid) => { 
      const p = presets.find(x => x.id === pid); 
      if(p) { 
          setCharacters([...p.characters]); 
          setActivePresetId(pid); 
      } 
  }, [presets]);
  
  const saveToPreset = useCallback((pid) => { 
      setPresets(prev => prev.map(p => p.id === pid ? { ...p, characters } : p)); 
  }, [characters]);
  
  const exitPreset = useCallback(() => { 
      setActivePresetId(null); 
      setCharacters([]); 
  }, []);
  
  const deletePreset = useCallback((id) => { 
      setPresets(prev => prev.filter(p => p.id !== id)); 
      if(activePresetId === id) { 
          setActivePresetId(null); 
          setCharacters([]); 
      } 
  }, [activePresetId]);
  
  const mergePresets = useCallback((list) => { 
      setPresets(prev => { 
          const ids = new Set(prev.map(p => p.id)); 
          return [...prev, ...list.filter(p => !ids.has(p.id))]; 
      }); 
  }, []);

  const updatePreset = useCallback((id, updates) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);
  
  const resetAllData = async () => { 
      if (window.electron) {
          // No futuro: Chamar comando do electron para limpar pasta de dados
      } else {
          localStorage.clear(); 
          await imageDB.clearAll(); 
      }
      window.location.reload(); 
  };

  const value = {
    // Aventuras
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, updateAdventure, duplicateAdventure, setActiveAdventureId,
    exportAdventure, importAdventure,
    
    // Cenas
    addScene, updateScene, updateSceneMap, setActiveScene, deleteScene,
    
    // Fog of War
    activeTool, setActiveTool,
    addFogArea, updateFogArea, deleteFogArea, deleteMultipleFogAreas,
    
    // Tokens
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, 
    deleteTokenInstance, deleteMultipleTokenInstances, importCharacterAsToken,
    
    // Personagens
    gameState: { characters },
    addCharacter, updateCharacter, deleteCharacter, importCharacters, setAllCharacters,
    
    // Presets
    presets, activePresetId,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset, updatePreset,
    
    // Utilitários
    resetAllData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);