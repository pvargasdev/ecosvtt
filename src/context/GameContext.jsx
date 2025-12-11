import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { imageDB } from './db';
import JSZip from 'jszip'; 
import { saveAs } from 'file-saver'; 

const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_v6';
const STORAGE_ADVENTURES_KEY = 'ecos_vtt_adventures_v2';
const PRESETS_KEY = 'ecos_vtt_presets_v1';
const ACTIVE_PRESET_KEY = 'ecos_vtt_active_preset_id';

const GameContext = createContext({});

export const GameProvider = ({ children }) => {
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

  const safeSave = (key, data) => {
      try { localStorage.setItem(key, JSON.stringify(data)); } 
      catch (e) { if (e.name === 'QuotaExceededError') console.error("ERRO CRÍTICO: LocalStorage cheio."); }
  };
  
  useEffect(() => { safeSave(STORAGE_CHARACTERS_KEY, characters); }, [characters]);
  useEffect(() => { safeSave(PRESETS_KEY, presets); }, [presets]);
  useEffect(() => { safeSave(STORAGE_ADVENTURES_KEY, adventures); }, [adventures]);
  
  useEffect(() => { 
      if(activePresetId) localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      else localStorage.removeItem(ACTIVE_PRESET_KEY);
  }, [activePresetId]);

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
        scenes: [{ id: newSceneId, name: "Cena 1", mapImageId: null, mapScale: 1.0, tokens: [] }]
    };
    setAdventures(prev => [...prev, newAdventure]);
    setActiveAdventureId(newAdventure.id);
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
      const newScene = { id: newId, name: name || "Nova Cena", mapImageId: null, mapScale: 1.0, tokens: [] };
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, scenes: [...adv.scenes, newScene], activeSceneId: newId }));
  }, [activeAdventureId]);

  const updateSceneMap = useCallback(async (sceneId, file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, mapImageId: imageId } : s) }));
  }, [activeAdventureId]);

  const updateScene = useCallback((sceneId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s) }));
  }, [activeAdventureId]);

  const setActiveScene = useCallback((sceneId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, activeSceneId: sceneId }));
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

  const addTokenToLibrary = useCallback(async (file) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId }] }));
  }, [activeAdventureId]);

  const removeTokenFromLibrary = useCallback((tokenId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, tokenLibrary: adv.tokenLibrary.filter(t => t.id !== tokenId) }));
  }, [activeAdventureId]);

  const addTokenInstance = useCallback((sceneId, tokenData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: [...s.tokens, { id: generateUUID(), x: 0, y: 0, scale: 1, ...tokenData }] }) };
      }));
  }, [activeAdventureId]);

  const updateTokenInstance = useCallback((sceneId, tokenId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) }) };
      }));
  }, [activeAdventureId]);

  const deleteTokenInstance = useCallback((sceneId, tokenId) => {
    if (!activeAdventureId) return;
    setAdventures(prev => prev.map(adv => {
        if (adv.id !== activeAdventureId) return adv;
        return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: s.tokens.filter(t => t.id !== tokenId) }) };
    }));
  }, [activeAdventureId]);

  const deleteMultipleTokenInstances = useCallback((sceneId, tokenIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(tokenIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: s.tokens.filter(t => !idsSet.has(t.id)) }) };
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

  const addCharacter = useCallback((charData) => {
    const newChar = {
      id: generateUUID(), name: "Novo Personagem", description: "", photo: null, karma: 0, karmaMax: 3,
      attributes: { mente: 0, corpo: 0, destreza: 0, presenca: 0 }, 
      skills: "", 
      traumas: "", // CAMPO NOVO ADICIONADO AQUI
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
  const resetAllData = async () => { localStorage.clear(); await imageDB.clearAll(); window.location.reload(); };

  const value = {
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, updateAdventure, duplicateAdventure, setActiveAdventureId,
    exportAdventure, importAdventure,
    addScene, updateScene, updateSceneMap, setActiveScene, deleteScene,
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance, deleteMultipleTokenInstances,
    importCharacterAsToken, 
    gameState: { characters },
    presets, activePresetId,
    addCharacter, updateCharacter, deleteCharacter, importCharacters, setAllCharacters,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset,
    resetAllData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);