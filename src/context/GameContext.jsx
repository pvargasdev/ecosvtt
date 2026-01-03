import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { imageDB } from './db';
import { audioDB } from './audioDb'; 
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
  
  // O estado activeAdventureId interno (não exposto diretamente para evitar set direto sem limpeza)
  const [internalActiveAdventureId, setInternalActiveAdventureId] = useState(null);
  
  const [isGMWindowOpen, setIsGMWindowOpen] = useState(false);

  // --- CONTROLE DE SINCRONIZAÇÃO ---
  const broadcastChannel = useRef(null);
  const isRemoteUpdate = useRef(false); 
  
  const stateRef = useRef({ adventures, characters, presets, activeAdventureId: internalActiveAdventureId, isDataLoaded });

  useEffect(() => {
    stateRef.current = { adventures, characters, presets, activeAdventureId: internalActiveAdventureId, isDataLoaded };
  }, [adventures, characters, presets, internalActiveAdventureId, isDataLoaded]);

  const handleIncomingMessage = useCallback((type, data) => {
      if (type === 'REQUEST_FULL_SYNC') {
          const current = stateRef.current;
          if (!isGMWindow && current.isDataLoaded) {
              const payload = { 
                  adventures: current.adventures, 
                  characters: current.characters, 
                  presets: current.presets, 
                  activeAdventureId: current.activeAdventureId
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
              setAdventures(data.adventures || []);
              setCharacters(data.characters || []);
              setPresets(data.presets || []);
              setInternalActiveAdventureId(urlAdvId || data.activeAdventureId);
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
          case 'SYNC_ACTIVE_ADV_ID': setInternalActiveAdventureId(data); break;
          case 'TRIGGER_SFX': window.dispatchEvent(new CustomEvent('ecos-sfx-trigger', { detail: data })); break;
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

      // [FIX] Antes de salvar, garantimos que activeTrack.isPlaying seja false no disco
      // Isso previne que ao recarregar a página, a música volte tocando sozinha.
      let dataToSave = data;
      if (key === STORAGE_ADVENTURES_KEY && Array.isArray(data)) {
          dataToSave = data.map(adv => {
              if (adv.soundboard && adv.soundboard.activeTrack) {
                  return {
                      ...adv,
                      soundboard: {
                          ...adv.soundboard,
                          activeTrack: null // Nunca salva a música ativa no disco
                      }
                  };
              }
              return adv;
          });
      }

      if (window.electron) {
          const cleanData = JSON.parse(JSON.stringify(dataToSave));
          await window.electron.writeJson(key, cleanData);
      } else {
          try { localStorage.setItem(key, JSON.stringify(dataToSave)); } 
          catch (e) { if (e.name === 'QuotaExceededError') console.error("LocalStorage cheio."); }
      }
  };

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
      if (isGMWindow) return;

      const init = async () => {
          const loadedChars = await loadData(STORAGE_CHARACTERS_KEY) || [];
          const loadedPresets = await loadData(PRESETS_KEY) || [];
          let loadedAdventures = await loadData(STORAGE_ADVENTURES_KEY) || [];
          
          // [FIX CRÍTICO] LOAD TIME SANITIZATION
          // Garante que, ao dar F5, nenhuma aventura venha com activeTrack preenchido.
          loadedAdventures = loadedAdventures.map(adv => {
              if (adv.soundboard) {
                  return {
                      ...adv,
                      soundboard: {
                          ...adv.soundboard,
                          activeTrack: null, // Força nulo
                          playlists: adv.soundboard.playlists.map(pl => ({
                             ...pl,
                             tracks: pl.tracks.map(t => ({ ...t, isPlaying: false })) // Reseta tracks individuais
                          }))
                      }
                  };
              }
              return adv;
          });

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

          setIsDataLoaded(true);
      };

      init();
  }, [isGMWindow]);
  
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
      if (isDataLoaded) broadcast('SYNC_ACTIVE_ADV_ID', internalActiveAdventureId);
  }, [internalActiveAdventureId, isDataLoaded]);

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


  // --- SOUNDBOARD STATE DERIVADO ---
  const defaultSoundboardState = {
      playlists: [],     
      sfxGrid: [],       
      activeTrack: null, 
      masterVolume: { music: 0.5, sfx: 1.0 },
      fadeSettings: { fadeIn: 2000, fadeOut: 2000, crossfade: true }
  };

  const generateUUID = () => crypto.randomUUID();
  const activeAdventure = adventures.find(a => a.id === internalActiveAdventureId);
  const activeScene = activeAdventure?.scenes.find(s => s.id === activeAdventure.activeSceneId);
  
  const soundboard = activeAdventure?.soundboard || defaultSoundboardState;

  // --- ACTIONS GERAIS ---

  // [FIX CRÍTICO] OVERRIDE DE setActiveAdventureId
  // Esta função substitui o setter padrão. Ela limpa o áudio ANTES de mudar a aventura.
  const setActiveAdventureId = useCallback((adventureId) => {
      if (adventureId === null) {
          // Se estiver saindo (voltando pro menu), apenas sai.
          // Opcional: Parar música ao voltar pro menu?
          // Se quiser parar ao sair:
          if (internalActiveAdventureId) {
             setAdventures(prev => prev.map(adv => {
                if (adv.id === internalActiveAdventureId && adv.soundboard?.activeTrack) {
                    return { ...adv, soundboard: { ...adv.soundboard, activeTrack: null } };
                }
                return adv;
             }));
          }
          setInternalActiveAdventureId(null);
          return;
      }

      // Se estiver ENTRANDO em uma aventura:
      setAdventures(prev => {
          return prev.map(adv => {
              // 1. Limpa a aventura que estava ativa antes (se houver)
              if (adv.id === internalActiveAdventureId && adv.soundboard?.activeTrack) {
                  return { ...adv, soundboard: { ...adv.soundboard, activeTrack: null } };
              }
              // 2. Limpa a aventura que VAI ser ativada (garante silêncio no início)
              if (adv.id === adventureId) {
                  // Mesmo se tiver algo salvo, resetamos para NULL aqui
                  return { 
                      ...adv, 
                      soundboard: { 
                          ...(adv.soundboard || defaultSoundboardState), 
                          activeTrack: null, // SILÊNCIO FORÇADO
                          playlists: (adv.soundboard?.playlists || []).map(pl => ({
                             ...pl,
                             tracks: pl.tracks.map(t => ({...t, isPlaying: false}))
                          }))
                      } 
                  };
              }
              return adv;
          });
      });

      // Só depois de limpar os dados, mudamos o ID ativo.
      setInternalActiveAdventureId(adventureId);
      
      // Evento de segurança para forçar engines externos a pararem
      window.dispatchEvent(new CustomEvent('ecos-audio-stop-all'));

  }, [internalActiveAdventureId]);

  const handleImageUpload = async (file) => {
      if (!file) return null;
      try { return await imageDB.saveImage(file); } catch (e) { console.error(e); return null; }
  };

  const setActiveAdvSoundboard = (updateFn) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          const currentSB = adv.soundboard || defaultSoundboardState;
          const newSB = typeof updateFn === 'function' ? updateFn(currentSB) : updateFn;
          return { ...adv, soundboard: newSB };
      }));
  };

  const createAdventure = useCallback((name) => {
    const newSceneId = generateUUID();
    const newAdventure = {
        id: generateUUID(), name: name, activeSceneId: newSceneId, tokenLibrary: [], 
        scenes: [{ id: newSceneId, name: "Cena 1", mapImageId: null, mapScale: 1.0, tokens: [], fogOfWar: [], pins: [] }],
        soundboard: { ...defaultSoundboardState } 
    };
    setAdventures(prev => [...prev, newAdventure]);
  }, []);

  const deleteAdventure = useCallback((id) => {
      setAdventures(prev => prev.filter(a => a.id !== id));
      if (internalActiveAdventureId === id) setInternalActiveAdventureId(null);
  }, [internalActiveAdventureId]);

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

  const exportAdventure = useCallback(async (advId) => {
      const adv = adventures.find(a => a.id === advId);
      if (!adv) return;
      
      const zip = new JSZip();
      zip.file("adventure.json", JSON.stringify(adv));
      
      // --- IMAGENS ---
      const imgFolder = zip.folder("images");
      const imageIds = new Set();
      
      adv.scenes.forEach(scene => {
          if (scene.mapImageId) imageIds.add(scene.mapImageId);
          scene.tokens.forEach(t => { if (t.imageId) imageIds.add(t.imageId); });
      });
      if (adv.tokenLibrary) {
          adv.tokenLibrary.forEach(t => { if (t.imageId) imageIds.add(t.imageId); });
      }
      // Importa avatar dos personagens se houver token linkado (Opcional, mas recomendado)
      // (Mantido a lógica original das imagens para brevidade)
      
      for (const id of imageIds) {
          const blob = await imageDB.getImage(id);
          if (blob) imgFolder.file(id, blob);
      }

      // --- ÁUDIO COM MANIFESTO ---
      const audioFolder = zip.folder("audio");
      const audioIds = new Set();

      // 1. Identificar todos os IDs de áudio usados
      if (adv.soundboard) {
          if (adv.soundboard.playlists) {
              adv.soundboard.playlists.forEach(pl => {
                  pl.tracks.forEach(t => { if (t.fileId) audioIds.add(t.fileId); });
              });
          }
          if (adv.soundboard.sfxGrid) {
              adv.soundboard.sfxGrid.forEach(sfx => { if (sfx.fileId) audioIds.add(sfx.fileId); });
          }
          if (adv.soundboard.activeTrack?.fileId) {
              audioIds.add(adv.soundboard.activeTrack.fileId);
          }
      }

      // 2. Buscar metadados reais do banco para criar o manifesto
      // Precisamos saber o Nome Original e a Categoria (music/sfx)
      const allAudioMeta = await audioDB.getAllAudioMetadata();
      const audioManifest = {};

      for (const id of audioIds) {
          const blob = await audioDB.getAudio(id);
          if (blob) {
              audioFolder.file(id, blob);
              
              // Encontra os metadados deste arquivo
              const meta = allAudioMeta.find(m => m.id === id);
              if (meta) {
                  audioManifest[id] = {
                      name: meta.name,
                      category: meta.category || 'music' // Fallback
                  };
              }
          }
      }

      // 3. Salva o manifesto no ZIP
      zip.file("audio_manifest.json", JSON.stringify(audioManifest));

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
          
          // Sanitização básica
          advData.scenes = advData.scenes.map(scene => ({ 
              ...scene, 
              fogOfWar: scene.fogOfWar || [], 
              pins: scene.pins || [] 
          }));
          
          if (!advData.soundboard) {
              advData.soundboard = { ...defaultSoundboardState };
          }

          // --- IMPORTAÇÃO DE IMAGENS ---
          const imgFolder = zip.folder("images");
          if (imgFolder) {
              const images = [];
              imgFolder.forEach((relativePath, file) => images.push({ id: relativePath, file }));
              for (const img of images) {
                  const blob = await img.file.async("blob");
                  await imageDB.saveImage(blob, img.id); 
              }
          }

          // --- IMPORTAÇÃO DE ÁUDIO COM MANIFESTO ---
          const audioFolder = zip.folder("audio");
          const manifestFile = zip.file("audio_manifest.json");
          let audioManifest = {};
          
          // Tenta ler o manifesto se existir
          if (manifestFile) {
              try {
                  audioManifest = JSON.parse(await manifestFile.async("string"));
              } catch (e) {
                  console.warn("Erro ao ler manifesto de áudio, usando padrão.", e);
              }
          }

          if (audioFolder) {
                const audios = [];
                audioFolder.forEach((relativePath, file) => audios.push({ id: relativePath, file }));
                
                for (const aud of audios) {
                    const blob = await aud.file.async("blob");
                    
                    // Busca metadados do manifesto ou usa defaults
                    const meta = audioManifest[aud.id] || {};
                    
                    // Nome: Usa o original do manifesto OU cria um genérico
                    const originalName = meta.name || `Importado ${aud.id.substring(0,8)}`;
                    
                    // Categoria: Usa a original (sfx/music) OU assume 'music'
                    const category = meta.category || 'music';

                    // Recria o arquivo com o nome correto
                    const fileWithMeta = new File([blob], originalName, { type: blob.type });

                    // Salva com a categoria correta
                    await audioDB.saveAudio(fileWithMeta, category, aud.id);
                }
            }

          const newAdv = { ...advData, id: generateUUID(), name: `${advData.name}` };
          setAdventures(prev => [...prev, newAdv]);
      } catch (e) { console.error(e); alert("Erro ao importar aventura: " + e.message); }
  }, []);

  const updateSoundboard = useCallback((updates) => { setActiveAdvSoundboard(prev => ({ ...prev, ...updates })); }, [internalActiveAdventureId]);
  const addPlaylist = useCallback((name) => { setActiveAdvSoundboard(prev => ({ ...prev, playlists: [...prev.playlists, { id: generateUUID(), name, tracks: [] }] })); }, [internalActiveAdventureId]);
  
  const getAudioDurationFromId = async (id) => {
      const blob = await audioDB.getAudio(id);
      if(!blob) return 0;
      return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => { URL.revokeObjectURL(objectUrl); resolve(audio.duration); };
        audio.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(0); };
      });
  };

  const deleteGlobalAudio = useCallback(async (id) => {
      await audioDB.deleteAudio(id);
      // Nota: Isso não remove automaticamente as referências nas playlists existentes para evitar complexidade excessiva de sync agora.
      // O áudio apenas não tocará.
  }, []);

  const addTrackToPlaylist = useCallback(async (playlistId, fileOrId, forcedDuration = 0) => {
      let fileId = fileOrId;
      let title = "Faixa Importada";
      let duration = forcedDuration;

      // 1. Arquivo NOVO (Upload) -> Salva como 'music'
      if (typeof fileOrId === 'object' && fileOrId instanceof File) {
          title = fileOrId.name.replace(/\.[^/.]+$/, "");
          fileId = await audioDB.saveAudio(fileOrId, 'music'); // Categoria explícita
          if (!forcedDuration) duration = await getAudioDurationFromId(fileId);
      } 
      // 2. ID Existente (Biblioteca)
      else if (typeof fileOrId === 'string') {
          const meta = (await audioDB.getAllAudioMetadata()).find(f => f.id === fileId);
          if (meta) title = meta.name.replace(/\.[^/.]+$/, "");
          if (!forcedDuration) duration = await getAudioDurationFromId(fileId);
      }

      if(!fileId) return;

      const newTrack = { id: generateUUID(), title, fileId, duration };

      setActiveAdvSoundboard(prev => ({ 
          ...prev, 
          playlists: prev.playlists.map(pl => pl.id === playlistId ? { ...pl, tracks: [...pl.tracks, newTrack] } : pl) 
      }));
  }, [internalActiveAdventureId]);

  const addSfx = useCallback(async (fileOrId, parentId = null) => {
      let fileId = fileOrId;
      let name = "SFX";

      // 1. Arquivo Novo -> Salva como 'sfx'
      if (typeof fileOrId === 'object' && fileOrId instanceof File) {
          name = fileOrId.name.replace(/\.[^/.]+$/, "").substring(0, 12);
          fileId = await audioDB.saveAudio(fileOrId, 'sfx'); // Categoria explícita
      } 
      // 2. ID Existente
      else if (typeof fileOrId === 'string') {
          const meta = (await audioDB.getAllAudioMetadata()).find(f => f.id === fileId);
          if (meta) name = meta.name.replace(/\.[^/.]+$/, "").substring(0, 12);
      }

      if(!fileId) return;

      const newSfx = { 
          id: generateUUID(), name, fileId, volume: 1.0, color: '#d084ff', icon: 'Zap', type: 'sfx', parentId: parentId || null
      };
      setActiveAdvSoundboard(prev => ({ ...prev, sfxGrid: [...(prev.sfxGrid || []), newSfx] }));
  }, [internalActiveAdventureId]);

  const removeTrack = useCallback((playlistId, trackId) => {
      setActiveAdvSoundboard(prev => ({ ...prev, playlists: prev.playlists.map(pl => pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) } : pl) }));
  }, [internalActiveAdventureId]);

  const reorderPlaylist = useCallback((playlistId, newTracksOrder) => {
      setActiveAdvSoundboard(prev => ({
          ...prev,
          playlists: prev.playlists.map(pl =>
              pl.id === playlistId ? { ...pl, tracks: newTracksOrder } : pl
          )
      }));
  }, [internalActiveAdventureId]);

  const playTrack = useCallback((track, playlistId) => {
      setActiveAdvSoundboard(prev => ({
          ...prev,
          activeTrack: { 
              ...track, 
              playlistId, 
              isPlaying: (track.isPlaying !== undefined) ? track.isPlaying : true, 
              progress: (prev.activeTrack?.id === track.id) ? prev.activeTrack.progress : 0 
          }
      }));
  }, [internalActiveAdventureId]);

  const stopTrack = useCallback(() => { 
      setActiveAdvSoundboard(prev => ({ 
          ...prev, 
          activeTrack: prev.activeTrack ? { ...prev.activeTrack, isPlaying: false } : null 
      })); 
  }, [internalActiveAdventureId]);

  const removeSfx = useCallback((id) => {
      setActiveAdvSoundboard(prev => {
          const grid = prev.sfxGrid || [];
          const idsToDelete = new Set([id]);
          const findChildren = (parentId) => {
              grid.filter(item => item.parentId === parentId).forEach(c => {
                  idsToDelete.add(c.id);
                  if (c.type === 'folder') findChildren(c.id);
              });
          };
          const target = grid.find(i => i.id === id);
          if (target && target.type === 'folder') findChildren(id);
          return { ...prev, sfxGrid: grid.filter(s => !idsToDelete.has(s.id)) };
      });
  }, [internalActiveAdventureId]);

  const updateSfx = useCallback((id, updates) => {
      setActiveAdvSoundboard(prev => ({ ...prev, sfxGrid: (prev.sfxGrid || []).map(s => s.id === id ? { ...s, ...updates } : s) }));
  }, [internalActiveAdventureId]);

  const reorderSfx = useCallback((newSfxOrder) => {
      setActiveAdvSoundboard(prev => ({
          ...prev,
          sfxGrid: newSfxOrder
      }));
  }, [internalActiveAdventureId]);

  const setSfxMasterVolume = useCallback((val) => {
      setActiveAdvSoundboard(prev => ({ ...prev, masterVolume: { ...(prev.masterVolume || {}), sfx: val } }));
  }, [internalActiveAdventureId]);

  const setMusicVolume = useCallback((val) => {
      setActiveAdvSoundboard(prev => ({ ...prev, masterVolume: { ...(prev.masterVolume || {}), music: val } }));
  }, [internalActiveAdventureId]);

  const triggerSfxRemote = useCallback((sfxItem) => {
      broadcast('TRIGGER_SFX', sfxItem);
      window.dispatchEvent(new CustomEvent('ecos-sfx-trigger', { detail: sfxItem }));
  }, [broadcast]);

  const addScene = useCallback((name) => {
      if (!internalActiveAdventureId) return;
      const newId = generateUUID();
      const newScene = { id: newId, name: name || "Nova Cena", mapImageId: null, mapScale: 1.0, tokens: [], fogOfWar: [], pins: [] };
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : { ...adv, scenes: [...adv.scenes, newScene] }));
  }, [internalActiveAdventureId]);

  const duplicateScene = useCallback((sceneId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          const originalScene = adv.scenes.find(s => s.id === sceneId);
          if (!originalScene) return adv;
          const copy = JSON.parse(JSON.stringify(originalScene));
          copy.id = generateUUID();
          copy.name = `${copy.name} (Cópia)`;
          copy.tokens = copy.tokens.map(t => ({ ...t, id: generateUUID() }));
          copy.fogOfWar = copy.fogOfWar.map(f => ({ ...f, id: generateUUID() }));
          copy.pins = copy.pins.map(p => ({ ...p, id: generateUUID() }));
          return { ...adv, scenes: [...adv.scenes, copy] };
      }));
  }, [internalActiveAdventureId]);

  const updateSceneMap = useCallback(async (sceneId, file) => {
      if (!internalActiveAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : { ...adv, scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, mapImageId: imageId } : s) }));
  }, [internalActiveAdventureId]);

  const updateScene = useCallback((sceneId, updates) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : { ...adv, scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s) }));
  }, [internalActiveAdventureId]);

  const setActiveScene = useCallback((sceneId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : { ...adv, activeSceneId: sceneId }));
  }, [internalActiveAdventureId]);

  const deleteScene = useCallback((sceneId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          const newScenes = adv.scenes.filter(s => s.id !== sceneId);
          let newActive = adv.activeSceneId;
          if (sceneId === adv.activeSceneId) newActive = newScenes.length > 0 ? newScenes[0].id : null;
          return { ...adv, scenes: newScenes, activeSceneId: newActive };
      }));
  }, [internalActiveAdventureId]);

  const addFogArea = useCallback((sceneId, fogData) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: [...(s.fogOfWar || []), { id: generateUUID(), ...fogData }] }) };
      }));
  }, [internalActiveAdventureId]);

  const updateFogArea = useCallback((sceneId, fogId, updates) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).map(f => f.id === fogId ? { ...f, ...updates } : f) }) };
      }));
  }, [internalActiveAdventureId]);

  const deleteFogArea = useCallback((sceneId, fogId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).filter(f => f.id !== fogId) }) };
      }));
  }, [internalActiveAdventureId]);

  const deleteMultipleFogAreas = useCallback((sceneId, fogIdsArray) => {
      if (!internalActiveAdventureId) return;
      const idsSet = new Set(fogIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, fogOfWar: (s.fogOfWar || []).filter(f => !idsSet.has(f.id)) }) };
      }));
  }, [internalActiveAdventureId]);

  const addPin = useCallback((sceneId, pinData) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, pins: [...(s.pins || []), { ...pinData, id: generateUUID() }] }) };
      }));
  }, [internalActiveAdventureId]);

  const updatePin = useCallback((sceneId, pinId, updates) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, pins: (s.pins || []).map(p => p.id === pinId ? { ...p, ...updates } : p) }) };
      }));
  }, [internalActiveAdventureId]);

  const deletePin = useCallback((sceneId, pinId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, pins: (s.pins || []).filter(p => p.id !== pinId) }) };
      }));
  }, [internalActiveAdventureId]);

  const deleteMultiplePins = useCallback((sceneId, pinIdsArray) => {
      if (!internalActiveAdventureId) return;
      const idsSet = new Set(pinIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, pins: (s.pins || []).filter(p => !idsSet.has(p.id)) }) };
      }));
  }, [internalActiveAdventureId]);

  const addTokenToLibrary = useCallback(async (file, parentId = null) => {
      if (!internalActiveAdventureId || !file) return;
      const imageId = await handleImageUpload(file);
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : { 
          ...adv, 
          tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId, type: 'token', parentId: parentId || null }] 
      }));
  }, [internalActiveAdventureId]);

  const addFolder = useCallback((name, parentId = null) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => adv.id !== internalActiveAdventureId ? adv : {
          ...adv,
          tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), name: name || "Nova Pasta", type: 'folder', parentId: parentId || null }]
      }));
  }, [internalActiveAdventureId]);

  const moveLibraryItem = useCallback((itemId, targetFolderId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, tokenLibrary: adv.tokenLibrary.map(item => item.id === itemId ? { ...item, parentId: targetFolderId } : item) };
      }));
  }, [internalActiveAdventureId]);

  const renameLibraryItem = useCallback((itemId, newName) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, tokenLibrary: adv.tokenLibrary.map(item => item.id === itemId ? { ...item, name: newName } : item) };
      }));
  }, [internalActiveAdventureId]);

  const deleteLibraryItem = useCallback((itemId) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => {
          const adv = prev.find(a => a.id === internalActiveAdventureId);
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
          if (targetItem && targetItem.type === 'folder') { findChildren(itemId); }
          return prev.map(a => a.id !== internalActiveAdventureId ? a : { ...a, tokenLibrary: a.tokenLibrary.filter(t => !idsToDelete.has(t.id)) });
      });
  }, [internalActiveAdventureId]);
  const removeTokenFromLibrary = deleteLibraryItem;

  const addTokenInstance = useCallback((sceneId, tokenData) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: [...s.tokens, { id: generateUUID(), x: 0, y: 0, scale: 1, ...tokenData }] }) };
      }));
  }, [internalActiveAdventureId]);

  const updateTokenInstance = useCallback((sceneId, tokenId, updates) => {
      if (!internalActiveAdventureId) return;
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id === sceneId ? { ...s, tokens: s.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) } : s) };
      }));
  }, [internalActiveAdventureId]);

  const deleteTokenInstance = useCallback((sceneId, tokenId) => {
    if (!internalActiveAdventureId) return;
    setAdventures(prev => prev.map(adv => {
        if (adv.id !== internalActiveAdventureId) return adv;
        return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: s.tokens.filter(t => t.id !== tokenId) }) };
    }));
  }, [internalActiveAdventureId]);

  const deleteMultipleTokenInstances = useCallback((sceneId, tokenIdsArray) => {
      if (!internalActiveAdventureId) return;
      const idsSet = new Set(tokenIdsArray);
      setAdventures(prev => prev.map(adv => {
          if (adv.id !== internalActiveAdventureId) return adv;
          return { ...adv, scenes: adv.scenes.map(s => s.id !== sceneId ? s : { ...s, tokens: s.tokens.filter(t => !idsSet.has(t.id)) }) };
      }));
  }, [internalActiveAdventureId]);

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
        if (imageId && internalActiveAdventureId) {
           setAdventures(prev => prev.map(adv => {
               if (adv.id !== internalActiveAdventureId) return adv;
               const exists = adv.tokenLibrary?.some(t => t.imageId === imageId);
               if (exists) return adv;
               return { ...adv, tokenLibrary: [...(adv.tokenLibrary || []), { id: generateUUID(), imageId, type: 'token', parentId: null }] };
           }));
        }
        return imageId;
    } catch (e) { console.error("Erro import char token:", e); return null; }
  }, [characters, internalActiveAdventureId]);

  const addCharacter = useCallback((charData) => {
    const systemId = charData.systemId || 'ecos_rpg_v1';
    const defaults = getSystemDefaultState(systemId);
    const newChar = { id: generateUUID(), systemId: systemId, name: "Novo Personagem", photo: null, ...defaults, ...charData };
    setCharacters(prev => [...prev, newChar]);
    return newChar.id;
  }, []);
  const updateCharacter = useCallback((id, updates) => setCharacters(prev => prev.map(char => char.id === id ? { ...char, ...updates } : char)), []);
  const deleteCharacter = useCallback((id) => setCharacters(prev => prev.filter(char => char.id !== id)), []);
  const setAllCharacters = useCallback((list) => setCharacters(list), []);

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
          const newCharacters = presetData.characters.map(char => ({ ...char, id: generateUUID() }));
          const newPreset = { ...presetData, id: newPresetId, name: `${presetData.name}`, characters: newCharacters };
          setPresets(prev => [...prev, newPreset]);
      } catch (e) { console.error(e); alert("Erro ao importar grupo."); }
  }, []);

  const createPreset = useCallback((name) => {
    const newPreset = { id: generateUUID(), name, characters: [] };
    setCharacters([]); setPresets(prev => [...prev, newPreset]); return newPreset.id;
  }, []);
  const loadPreset = useCallback((pid) => { const p = presets.find(x => x.id === pid); if(p) { setCharacters([...p.characters]); setActivePresetId(pid); } }, [presets]);
  const saveToPreset = useCallback((pid) => { setPresets(prev => prev.map(p => p.id === pid ? { ...p, characters } : p)); }, [characters]);
  const exitPreset = useCallback(() => { setActivePresetId(null); setCharacters([]); }, []);
  const deletePreset = useCallback((id) => { setPresets(prev => prev.filter(p => p.id !== id)); if(activePresetId === id) { setActivePresetId(null); setCharacters([]); } }, [activePresetId]);
  const mergePresets = useCallback((list) => { setPresets(prev => { const ids = new Set(prev.map(p => p.id)); return [...prev, ...list.filter(p => !ids.has(p.id))]; }); }, []);
  const updatePreset = useCallback((id, updates) => { setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)); }, []);
  
  const resetAllData = async () => { 
      if (!window.electron) { localStorage.clear(); await imageDB.clearAll(); }
      window.location.reload(); 
  };

  const value = {
    isGMWindow, isGMWindowOpen,
    adventures, activeAdventureId: internalActiveAdventureId, activeAdventure, activeScene,
    createAdventure, deleteAdventure, updateAdventure, duplicateAdventure, setActiveAdventureId,
    exportAdventure, importAdventure,
    soundboard, updateSoundboard, addPlaylist, addTrackToPlaylist, removeTrack, reorderPlaylist, playTrack, stopTrack, setMusicVolume,
    addSfx, removeSfx, updateSfx, reorderSfx, setSfxMasterVolume, triggerSfxRemote,
    addScene, duplicateScene, updateScene, updateSceneMap, setActiveScene, deleteScene,
    activeTool, setActiveTool, addFogArea, updateFogArea, deleteFogArea, deleteMultipleFogAreas,
    addTokenToLibrary, removeTokenFromLibrary, addTokenInstance, updateTokenInstance, deleteTokenInstance, deleteMultipleTokenInstances, importCharacterAsToken,
    addFolder, moveLibraryItem, renameLibraryItem, deleteLibraryItem, 
    addPin, updatePin, deletePin, deleteMultiplePins,
    gameState: { characters }, addCharacter, updateCharacter, deleteCharacter, setAllCharacters,
    presets, activePresetId, createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset, updatePreset, exportPreset, importPreset,
    resetAllData, getAudioDurationFromId, deleteGlobalAudio
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);