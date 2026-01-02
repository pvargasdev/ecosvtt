import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { imageDB } from './db';
import JSZip from 'jszip'; 
import { saveAs } from 'file-saver'; 
import { getSystemDefaultState } from '../systems'; 

const STORAGE_CHARACTERS_KEY = 'ecos_vtt_chars_v6';
const STORAGE_ADVENTURES_KEY = 'ecos_vtt_adventures_v3'; 
const PRESETS_KEY = 'ecos_vtt_presets_v1';
const ACTIVE_PRESET_KEY = 'ecos_vtt_active_preset_id';
const ACTIVE_TOOL_KEY = 'ecos_vtt_active_tool';

const GameContext = createContext({});

export const GameProvider = ({ children }) => {
  // --- DETECÇÃO DE MODO ---
  const queryParams = new URLSearchParams(window.location.search);
  const isGMWindow = queryParams.get('mode') === 'gm';
  const urlAdvId = queryParams.get('advId');

  // --- ESTADOS ---
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [characters, setCharacters] = useState([]);
  const [presets, setPresets] = useState([]);
  const [adventures, setAdventures] = useState([]);
  
  const [activePresetId, setActivePresetId] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [activeAdventureId, setActiveAdventureId] = useState(null);

  const [soundboard, setSoundboard] = useState({
      playlists: [],     // Array de { id, name, tracks: [{id, title, fileId, duration}] }
      sfxGrid: [],       // Array de { id, name, fileId, volume, color, icon }
      activeTrack: null, // { id, playlistId, fileId, isPlaying, volume, progress, duration }
      masterVolume: { music: 0.5, sfx: 1.0 },
      fadeSettings: { fadeIn: 2000, fadeOut: 2000, crossfade: true }
  });
  
  const [isGMWindowOpen, setIsGMWindowOpen] = useState(false);

  // --- CONTROLE DE SINCRONIZAÇÃO ---
  const broadcastChannel = useRef(null);
  const isRemoteUpdate = useRef(false); 
  
  const stateRef = useRef({ adventures, characters, presets, activeAdventureId, isDataLoaded });

  useEffect(() => {
    stateRef.current = { adventures, characters, presets, activeAdventureId, isDataLoaded };
  }, [adventures, characters, presets, activeAdventureId, isDataLoaded]);

  const handleIncomingMessage = useCallback((type, data) => {
      if (type === 'REQUEST_FULL_SYNC') {
          const current = stateRef.current;
          if (!isGMWindow && current.isDataLoaded) {
              const payload = { 
                  adventures: current.adventures, 
                  characters: current.characters, 
                  presets: current.presets, 
                  activeAdventureId: current.activeAdventureId,
                  soundboard: current.soundboard
              };
              if (window.electron) {
                  window.electron.sendSync('FULL_SYNC_RESPONSE', payload);
              } else if (broadcastChannel.current) {
                  broadcastChannel.current.postMessage({ type: 'FULL_SYNC_RESPONSE', data: payload });
              }
          }
          return;
      }

      if (type === 'FULL_SYNC_RESPONSE') {
          if (isGMWindow) {
              isRemoteUpdate.current = true;
              setAdventures(data.adventures);
              setCharacters(data.characters);
              setPresets(data.presets);
              setSoundboard(data.soundboard || {});
              setActiveAdventureId(urlAdvId || data.activeAdventureId);
              setIsDataLoaded(true); 
              setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          }
          return;
      }

      isRemoteUpdate.current = true;
      switch (type) {
          case 'SYNC_ADVENTURES': setAdventures(data); break;
          case 'SYNC_CHARACTERS': setCharacters(data); break;
          case 'SYNC_PRESETS': setPresets(data); break;
          case 'SYNC_ACTIVE_ADV_ID': setActiveAdventureId(data); break;
          case 'SYNC_SOUNDBOARD': setSoundboard(data); break;
      }
      setTimeout(() => { isRemoteUpdate.current = false; }, 50);
  }, [isGMWindow, urlAdvId]); 

  useEffect(() => {
      broadcastChannel.current = new BroadcastChannel('ecos_vtt_sync');
      broadcastChannel.current.onmessage = (event) => {
          handleIncomingMessage(event.data.type, event.data.data);
      };

      if (window.electron && window.electron.onSync) {
          window.electron.onSync(({ type, data }) => {
              handleIncomingMessage(type, data);
          });
      }

      if (isGMWindow) {
          if (window.electron && window.electron.sendSync) {
              window.electron.sendSync('REQUEST_FULL_SYNC', null);
          } else {
              broadcastChannel.current.postMessage({ type: 'REQUEST_FULL_SYNC' });
          }
      }

      if (!isGMWindow && window.electron?.onGMStatusChange) {
          window.electron.onGMStatusChange((isOpen) => setIsGMWindowOpen(isOpen));
      }

      return () => {
          if (broadcastChannel.current) broadcastChannel.current.close();
      };
  }, [handleIncomingMessage, isGMWindow]); 

  const broadcast = (type, data) => {
      if (!isRemoteUpdate.current && isDataLoaded) {
          if (window.electron && window.electron.sendSync) {
              window.electron.sendSync(type, data);
          } 
          else if (broadcastChannel.current) {
              broadcastChannel.current.postMessage({ type, data });
          }
      }
  };

  // --- FUNÇÕES DE ARMAZENAMENTO ---
  const loadData = async (key) => {
      if (window.electron) {
          try { return await window.electron.readJson(key); } catch { return null; }
      } else {
          try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
      }
  };

  const saveData = async (key, data) => {
      if (!isDataLoaded) return; 
      if (isGMWindow) return;

      if (window.electron) {
          const cleanData = JSON.parse(JSON.stringify(data));
          await window.electron.writeJson(key, cleanData);
      } else {
          try { localStorage.setItem(key, JSON.stringify(data)); } 
          catch (e) { if (e.name === 'QuotaExceededError') console.error("LocalStorage cheio."); }
      }
  };

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
      if (isGMWindow) return;

      const init = async () => {
          const loadedChars = await loadData(STORAGE_CHARACTERS_KEY) || [];
          const loadedPresets = await loadData(PRESETS_KEY) || [];
          const loadedAdventures = await loadData(STORAGE_ADVENTURES_KEY) || [];
          const loadedSoundboard = await loadData('ecos_vtt_soundboard_v1') || {
              playlists: [], sfxGrid: [], activeTrack: null, masterVolume: { music: 0.5, sfx: 1.0 }, fadeSettings: { fadeIn: 2000, fadeOut: 2000, crossfade: true }
          };
          
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

          setCharacters(loadedChars);
          setPresets(loadedPresets);
          setAdventures(loadedAdventures);
          setActiveTool(loadedTool);
          setActivePresetId(loadedActivePreset);
          setSoundboard(loadedSoundboard);

          setIsDataLoaded(true);
      };

      init();
  }, [isGMWindow]);
  
  useEffect(() => {
      // Salva no localStorage ou arquivo JSON
      saveData('ecos_vtt_soundboard_v1', soundboard);
      // Envia para a outra janela
      broadcast('SYNC_SOUNDBOARD', soundboard);
  }, [soundboard, isDataLoaded]);

  // --- EFEITOS DE SALVAMENTO E SYNC ---
  useEffect(() => { 
      saveData(STORAGE_CHARACTERS_KEY, characters);
      broadcast('SYNC_CHARACTERS', characters); 
  }, [characters, isDataLoaded]);

  useEffect(() => { 
      saveData(PRESETS_KEY, presets);
      broadcast('SYNC_PRESETS', presets);
  }, [presets, isDataLoaded]);

  useEffect(() => { 
      saveData(STORAGE_ADVENTURES_KEY, adventures);
      broadcast('SYNC_ADVENTURES', adventures);
  }, [adventures, isDataLoaded]);

  useEffect(() => {
      if (isDataLoaded) broadcast('SYNC_ACTIVE_ADV_ID', activeAdventureId);
  }, [activeAdventureId, isDataLoaded]);

  useEffect(() => {
      if (!isDataLoaded || isGMWindow) return;
      if (window.electron) {
          window.electron.writeJson('ecos_settings', { activeTool, activePresetId });
      } else {
          if (activePresetId) localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
          else localStorage.removeItem(ACTIVE_PRESET_KEY);
          localStorage.setItem(ACTIVE_TOOL_KEY, activeTool);
      }
  }, [activePresetId, activeTool, isDataLoaded]);


  // --- LÓGICA DO JOGO ---

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
        scenes: [{ id: newSceneId, name: "Cena 1", mapImageId: null, mapScale: 1.0, tokens: [], fogOfWar: [], pins: [] }]
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

  // --- EXPORT / IMPORT ADVENTURE ---
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
          advData.scenes = advData.scenes.map(scene => ({ ...scene, fogOfWar: scene.fogOfWar || [], pins: scene.pins || [] }));
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

  // --- SCENE / TOKEN / FOG CRUD ---
  const addScene = useCallback((name) => {
      if (!activeAdventureId) return;
      const newId = generateUUID();
      const newScene = { id: newId, name: name || "Nova Cena", mapImageId: null, mapScale: 1.0, tokens: [], fogOfWar: [], pins: [] };
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { ...adv, scenes: [...adv.scenes, newScene] }));
  }, [activeAdventureId]);

  // NOVO: Duplicar Cena
  const duplicateScene = useCallback((sceneId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          
          const originalScene = adv.scenes.find(s => s.id === sceneId);
          if (!originalScene) return adv;

          // Cria cópia profunda
          const copy = JSON.parse(JSON.stringify(originalScene));
          
          // Regenera ID da Cena
          copy.id = generateUUID();
          copy.name = `${copy.name} (Cópia)`;

          // Regenera IDs internos para evitar conflito de referência
          copy.tokens = copy.tokens.map(t => ({ ...t, id: generateUUID() }));
          copy.fogOfWar = copy.fogOfWar.map(f => ({ ...f, id: generateUUID() }));
          copy.pins = copy.pins.map(p => ({ ...p, id: generateUUID() }));

          return { ...adv, scenes: [...adv.scenes, copy] };
      }));
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

  const addFogArea = useCallback((sceneId, fogData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: [...(s.fogOfWar || []), { id: generateUUID(), ...fogData }] }) };
      }));
  }, [activeAdventureId]);

  const updateFogArea = useCallback((sceneId, fogId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).map(f => f.id === fogId ? { ...f, ...updates } : f) }) };
      }));
  }, [activeAdventureId]);

  const deleteFogArea = useCallback((sceneId, fogId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).filter(f => f.id !== fogId) }) };
      }));
  }, [activeAdventureId]);

  const deleteMultipleFogAreas = useCallback((sceneId, fogIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(fogIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).filter(f => !idsSet.has(f.id)) }) };
      }));
  }, [activeAdventureId]);

  const addPin = useCallback((sceneId, pinData) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  pins: [...(s.pins || []), { ...pinData, id: generateUUID() }] 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const updatePin = useCallback((sceneId, pinId, updates) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  pins: (s.pins || []).map(p => p.id === pinId ? { ...p, ...updates } : p) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const deletePin = useCallback((sceneId, pinId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  pins: (s.pins || []).filter(p => p.id !== pinId) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  const deleteMultiplePins = useCallback((sceneId, pinIdsArray) => {
      if (!activeAdventureId) return;
      const idsSet = new Set(pinIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => s.id !== sceneId ? s : { 
                  ...s, 
                  pins: (s.pins || []).filter(p => !idsSet.has(p.id)) 
              }) 
          };
      }));
  }, [activeAdventureId]);

  // --- TOKEN LIBRARY & FOLDERS ---
  
  const addTokenToLibrary = useCallback(async (file, parentId = null) => {
      if (!activeAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : { 
          ...adv, 
          tokenLibrary: [...(adv.tokenLibrary || []), { 
              id: generateUUID(), 
              imageId, 
              type: 'token', 
              parentId: parentId || null 
          }] 
      }));
  }, [activeAdventureId]);

  const addFolder = useCallback((name, parentId = null) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== activeAdventureId ? adv : {
          ...adv,
          tokenLibrary: [...(adv.tokenLibrary || []), {
              id: generateUUID(),
              name: name || "Nova Pasta",
              type: 'folder',
              parentId: parentId || null
          }]
      }));
  }, [activeAdventureId]);

  const moveLibraryItem = useCallback((itemId, targetFolderId) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              tokenLibrary: adv.tokenLibrary.map(item => 
                  item.id === itemId ? { ...item, parentId: targetFolderId } : item
              )
          };
      }));
  }, [activeAdventureId]);

  const renameLibraryItem = useCallback((itemId, newName) => {
      if (!activeAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== activeAdventureId) return adv;
          return {
              ...adv,
              tokenLibrary: adv.tokenLibrary.map(item => 
                  item.id === itemId ? { ...item, name: newName } : item
              )
          };
      }));
  }, [activeAdventureId]);

  const deleteLibraryItem = useCallback((itemId) => {
      if (!activeAdventureId) return;
      
      setAdventures(prev => {
          const adv = prev.find(a => a.id === activeAdventureId);
          if (!adv) return prev;

          let idsToDelete = new Set([itemId]);

          const findChildren = (parentId) => {
              const children = adv.tokenLibrary.filter(t => t.parentId === parentId);
              children.forEach(c => {
                  idsToDelete.add(c.id);
                  if (c.type === 'folder') findChildren(c.id);
              });
          };

          const targetItem = adv.tokenLibrary.find(t => t.id === itemId);
          if (targetItem && targetItem.type === 'folder') {
              findChildren(itemId);
          }

          return prev.map(a => a.id !== activeAdventureId ? a : {
              ...a,
              tokenLibrary: a.tokenLibrary.filter(t => !idsToDelete.has(t.id))
          });
      });
  }, [activeAdventureId]);

  const removeTokenFromLibrary = deleteLibraryItem;


  // --- TOKEN INSTANCES ON MAP ---
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
          return { 
              ...adv, 
              scenes: adv.scenes.map(s => 
                  s.id === sceneId 
                  ? { ...s, tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) } 
                  : s
              ) 
          };
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
               return { ...adv, tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId, type: 'token', parentId: null }] };
           }));
        }
        return imageId;
    } catch (e) { console.error("Erro import char token:", e); return null; }
  }, [characters, activeAdventureId]);


  // --- CHARACTERS ---
  const addCharacter = useCallback((charData) => {
    const systemId = charData.systemId || 'ecos_rpg_v1';
    const defaults = getSystemDefaultState(systemId);
    const newChar = {
      id: generateUUID(), 
      systemId: systemId, 
      name: "Novo Personagem", 
      photo: null, 
      ...defaults, 
      ...charData 
    };
    
    setCharacters(prev => [...prev, newChar]);
    return newChar.id;
  }, []);
  
  const updateCharacter = useCallback((id, updates) => setCharacters(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char)), []);
  const deleteCharacter = useCallback((id) => setCharacters(prev => prev.filter(char => char.id !== id)), []);
  const setAllCharacters = useCallback((list) => setCharacters(list), []);

  // --- PRESETS ---
  const exportPreset = useCallback(async (presetId) => {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;
      const zip = new JSZip();
      zip.file("preset.json", JSON.stringify(preset));
      const imgFolder = zip.folder("images");
      const imageIds = new Set();
      preset.characters.forEach(char => {
          if (char.photo && !char.photo.startsWith('data:')) {
              imageIds.add(char.photo);
          }
      });
      for (const id of imageIds) {
          const blob = await imageDB.getImage(id);
          if (blob) imgFolder.file(id, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `grupo_${preset.name.replace(/\s+/g, '_')}.zip`);
  }, [presets]);

  const importPreset = useCallback(async (file) => {
      if (!file) return;
      try {
          const zip = await JSZip.loadAsync(file);
          const jsonFile = zip.file("preset.json");
          if (!jsonFile) throw new Error("Arquivo de grupo inválido");
          const presetData = JSON.parse(await jsonFile.async("string"));
          const imgFolder = zip.folder("images");
          if (imgFolder) {
              const images = [];
              imgFolder.forEach((relativePath, file) => images.push({ id: relativePath, file }));
              for (const img of images) {
                  const blob = await img.file.async("blob");
                  await imageDB.saveImage(blob, img.id); 
              }
          }
          const newPresetId = generateUUID();
          const newCharacters = presetData.characters.map(char => ({
              ...char,
              id: generateUUID() 
          }));
          const newPreset = { ...presetData, id: newPresetId, name: `${presetData.name}`, characters: newCharacters };
          setPresets(prev => [...prev, newPreset]);
      } catch (e) { console.error(e); alert("Erro ao importar grupo."); }
  }, []);

  const createPreset = useCallback((name) => {
    const newPreset = { id: generateUUID(), name, characters: [] };
    setCharacters([]); setPresets(prev => [...prev, newPreset]); return newPreset.id;
  }, []);
  
  const loadPreset = useCallback((pid) => { 
      const p = presets.find(x => x.id === pid); 
      if(p) { setCharacters([...p.characters]); setActivePresetId(pid); } 
  }, [presets]);
  
  const saveToPreset = useCallback((pid) => { 
      setPresets(prev => prev.map(p => p.id === pid ? { ...p, characters } : p)); 
  }, [characters]);
  
  const exitPreset = useCallback(() => { setActivePresetId(null); setCharacters([]); }, []);
  
  const deletePreset = useCallback((id) => { 
      setPresets(prev => prev.filter(p => p.id !== id)); 
      if(activePresetId === id) { setActivePresetId(null); setCharacters([]); } 
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
      } else {
          localStorage.clear(); 
          await imageDB.clearAll(); 
      }
      window.location.reload(); 
  };

  // --- SOUNDBOARD ACTIONS ---
  
  const updateSoundboard = useCallback((updates) => {
      setSoundboard(prev => ({ ...prev, ...updates }));
  }, []);

  const addPlaylist = useCallback((name) => {
      setSoundboard(prev => ({
          ...prev,
          playlists: [...prev.playlists, { id: generateUUID(), name, tracks: [] }]
      }));
  }, []);

  const addTrackToPlaylist = useCallback(async (playlistId, file, duration = 0) => {
      const fileId = await audioDB.saveAudio(file);
      if(!fileId) return;
      
      const newTrack = {
          id: generateUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extensão
          fileId,
          duration
      };

      setSoundboard(prev => ({
          ...prev,
          playlists: prev.playlists.map(pl => 
              pl.id === playlistId ? { ...pl, tracks: [...pl.tracks, newTrack] } : pl
          )
      }));
  }, []);

  const removeTrack = useCallback((playlistId, trackId) => {
      setSoundboard(prev => ({
          ...prev,
          playlists: prev.playlists.map(pl => 
              pl.id === playlistId 
              ? { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) } 
              : pl
          )
      }));
      // Nota: Idealmente deletaríamos do audioDB também se não for usado em outro lugar
  }, []);

  // Esta função apenas atualiza o ESTADO de que algo deve tocar. 
  // O AudioEngine (que faremos na próxima etapa) reagirá a essa mudança de estado.
  const playTrack = useCallback((track, playlistId) => {
      setSoundboard(prev => ({
          ...prev,
          activeTrack: { 
              ...track, 
              playlistId, 
              isPlaying: true, 
              // Mantém progresso se for a mesma faixa pausada, senão 0
              progress: (prev.activeTrack?.id === track.id) ? prev.activeTrack.progress : 0 
          }
      }));
  }, []);

  const stopTrack = useCallback(() => {
      setSoundboard(prev => ({
          ...prev,
          activeTrack: prev.activeTrack ? { ...prev.activeTrack, isPlaying: false } : null
      }));
  }, []);
  
  const setMusicVolume = useCallback((val) => {
      setSoundboard(prev => ({ ...prev, masterVolume: { ...prev.masterVolume, music: val } }));
  }, []);

  const value = {
    isGMWindow, isGMWindowOpen,
    adventures, activeAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, updateAdventure, duplicateAdventure, setActiveAdventureId,
    exportAdventure, importAdventure,
    addScene, duplicateScene, updateScene, updateSceneMap, setActiveScene, deleteScene, // duplicateScene adicionado
    activeTool, setActiveTool, addFogArea, updateFogArea, deleteFogArea, deleteMultipleFogAreas,
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance, deleteMultipleTokenInstances, importCharacterAsToken,
    addFolder, moveLibraryItem, renameLibraryItem, deleteLibraryItem, 
    addPin, updatePin, deletePin, deleteMultiplePins,
    gameState: { characters }, addCharacter, updateCharacter, deleteCharacter, setAllCharacters,
    presets, activePresetId, createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset, updatePreset, exportPreset, importPreset,
    soundboard, updateSoundboard, addPlaylist, addTrackToPlaylist, removeTrack, playTrack, stopTrack, setMusicVolume,
    resetAllData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);