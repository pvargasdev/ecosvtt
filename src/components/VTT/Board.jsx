import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { imageDB } from '../../context/db';
import { Plus, Trash2, Import, Upload, Copy, Edit2, X, Check, Monitor, ArrowLeft } from 'lucide-react';

import Pin from './Pins/Pin';
import PinModal from './Pins/PinModal';
import ContextMenu from './Pins/ContextMenu';
import AudioController from '../../components/AudioController';

// --- CONFIGURAÇÕES DE CONTROLE ---
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const PAN_LIMIT = 3000; 
const CAMERA_SMOOTHING = 0.2; 
const ZOOM_SPEED_FACTOR = 0.001; 

const TOKEN_ROTATION_STEP = 30; 
const FADE_DURATION = 600; 

const Board = ({ showUI }) => {
  const { 
    activeAdventureId, activeAdventure, activeScene, 
    activeTool, setActiveTool,
    addTokenInstance, updateTokenInstance, deleteMultipleTokenInstances,
    addFogArea, updateFogArea, deleteMultipleFogAreas,
    importCharacterAsToken, 
    createAdventure, adventures, setActiveAdventureId, deleteAdventure, 
    updateAdventure, duplicateAdventure, 
    updateScene, 
    resetAllData,
    exportAdventure, importAdventure,
    isGMWindow, isGMWindowOpen,
    addPin, updatePin, deletePin, deleteMultiplePins
  } = useGame();

  const containerRef = useRef(null);
  const importInputRef = useRef(null);
  const adventuresListRef = useRef(null);
  
  const clipboardRef = useRef([]);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOverRef = useRef(false);

  const prevAdventuresLength = useRef(adventures.length);

  const animationRef = useRef(null); 
  const viewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  const targetViewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [sliderValue, setSliderValue] = useState(100);

  const [isCreatingAdventure, setIsCreatingAdventure] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [selectedFogIds, setSelectedFogIds] = useState(new Set());
  const [selectedPinIds, setSelectedPinIds] = useState(new Set());

  const [interaction, setInteraction] = useState({ 
    mode: 'IDLE', startX: 0, startY: 0, initialVal: 0, 
    activeTokenId: null, activeFogId: null, activePinId: null, 
    initialViewX: 0, initialViewY: 0, 
    fogStartX: 0, fogStartY: 0,
    initialPositions: {} 
  });
  
  const [fogDrawing, setFogDrawing] = useState({ isDrawing: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const [mapParams, setMapParams] = useState({ url: null, id: null });

  const [contextMenu, setContextMenu] = useState(null);
  const [pinModal, setPinModal] = useState({ open: false, data: null, position: { x: 0, y: 0 } });
  const [newAdvName, setNewAdvName] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); 
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const zoomKeyRef = useRef(0); 
  const zoomSpeedRef = useRef(0.01); 
  const lastZoomTimeRef = useRef(0); 

  const [transitionOpacity, setTransitionOpacity] = useState(1); 
  const [displayScene, setDisplayScene] = useState(null); 

  const forceSetView = (newView) => {
      setView(newView);
      targetViewRef.current = newView;
      viewRef.current = newView;
      setSliderValue(Math.round(newView.scale * 100));
  };

  useEffect(() => {
      if (!displayScene || isGMWindow) return;
      const saveTimer = setTimeout(() => {
          updateScene(displayScene.id, { savedView: view });
      }, 1000); 
      return () => clearTimeout(saveTimer);
  }, [view, displayScene?.id, isGMWindow]); 

  useEffect(() => {
      if (!displayScene && activeScene) {
          setDisplayScene(activeScene);
          if (activeScene.savedView) {
              forceSetView(activeScene.savedView);
          } else {
              forceSetView({ x: 0, y: 0, scale: 1 });
          }
          setTimeout(() => setTransitionOpacity(0), 100); 
          return;
      }

      if (!activeScene) {
          setDisplayScene(null);
          return;
      }

      if (displayScene && activeScene.id !== displayScene.id) {
          if (!isGMWindow) {
              updateScene(displayScene.id, { savedView: view });
          }
          setTransitionOpacity(1);
          const timer = setTimeout(() => {
              setDisplayScene(activeScene);
              if (activeScene.savedView) {
                  forceSetView(activeScene.savedView);
              } else {
                  forceSetView({ x: 0, y: 0, scale: 1 });
              }
              setTimeout(() => {
                  setTransitionOpacity(0);
              }, 100);
          }, FADE_DURATION);
          return () => clearTimeout(timer);
      } else {
          setDisplayScene(activeScene);
      }
  }, [activeScene, displayScene]); 

  useEffect(() => {
    if (adventures.length > prevAdventuresLength.current && adventuresListRef.current) {
        adventuresListRef.current.scrollTop = adventuresListRef.current.scrollHeight;
    }
    prevAdventuresLength.current = adventures.length;
  }, [adventures.length]); 

  useEffect(() => {
    const currentPercent = Math.round(view.scale * 100);
    if (Math.abs(sliderValue - currentPercent) > 1 && !animationRef.current) setSliderValue(currentPercent);
    if (!animationRef.current) { targetViewRef.current = { ...view }; viewRef.current = { ...view }; }
  }, [view.scale, view.x, view.y]);

  useEffect(() => {
      if (!displayScene) return;
      const loadMap = async () => {
          if (displayScene.mapImageId !== mapParams.id) {
              if (displayScene.mapImageId) {
                  const blob = await imageDB.getImage(displayScene.mapImageId);
                  if (blob) setMapParams({ url: URL.createObjectURL(blob), id: displayScene.mapImageId });
              } else setMapParams({ url: null, id: null });
          } else if (displayScene.mapImage && !displayScene.mapImageId && !mapParams.url) {
               setMapParams({ url: displayScene.mapImage, id: 'legacy' });
          }
      };
      loadMap();
  }, [displayScene, mapParams.id, mapParams.url]);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  // --- CONTROLE DE TECLADO ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);

        // FLIP E ROTAÇÃO
        if (selectedIds.size > 0 && activeScene && (e.ctrlKey || e.metaKey)) {
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) updateTokenInstance(activeScene.id, id, { mirrorX: !t.mirrorX });
                });
            }
            if (e.key === 'q' || e.key === 'Q') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentRot = t.rotation || 0;
                        updateTokenInstance(activeScene.id, id, { rotation: currentRot - TOKEN_ROTATION_STEP });
                    }
                });
            }
            if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentRot = t.rotation || 0;
                        updateTokenInstance(activeScene.id, id, { rotation: currentRot + TOKEN_ROTATION_STEP });
                    }
                });
            }

            // --- REDIMENSIONAMENTO VIA TECLADO (NOVO) ---
            if (e.key === '=' || e.key === '+') { // Ctrl + (+)
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        // Calcula 10% a mais
                        const currentScale = t.scale || 1;
                        // Arredonda para 1 casa decimal para evitar erros de ponto flutuante
                        let newScale = Math.round((currentScale + 0.1) * 10) / 10;
                        if (newScale > MAX_SCALE) newScale = MAX_SCALE;
                        updateTokenInstance(activeScene.id, id, { scale: newScale });
                    }
                });
            }

            if (e.key === '-' || e.key === '_') { // Ctrl + (-)
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        // Calcula 10% a menos
                        const currentScale = t.scale || 1;
                        let newScale = Math.round((currentScale - 0.1) * 10) / 10;
                        if (newScale < MIN_SCALE) newScale = MIN_SCALE;
                        updateTokenInstance(activeScene.id, id, { scale: newScale });
                    }
                });
            }
        }

        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            if (selectedIds.size > 0 && activeScene) {
                deleteMultipleTokenInstances(activeScene?.id, Array.from(selectedIds));
                setSelectedIds(new Set());
            }
            if (selectedFogIds.size > 0 && activeScene) {
                deleteMultipleFogAreas(activeScene?.id, Array.from(selectedFogIds));
                setSelectedFogIds(new Set());
            }
            if (selectedPinIds.size > 0 && activeScene) {
                deleteMultiplePins(activeScene.id, Array.from(selectedPinIds));
                setSelectedPinIds(new Set());
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (selectedIds.size > 0 && activeScene) {
                const tokensToCopy = activeScene.tokens.filter(t => selectedIds.has(t.id));
                if (tokensToCopy.length > 0) clipboardRef.current = tokensToCopy;
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            if (clipboardRef.current.length > 0 && activeScene) {
                if (isMouseOverRef.current && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const mouseX = mousePosRef.current.x - rect.left;
                    const mouseY = mousePosRef.current.y - rect.top;
                    const worldMouseX = (mouseX - targetViewRef.current.x) / targetViewRef.current.scale;
                    const worldMouseY = (mouseY - targetViewRef.current.y) / targetViewRef.current.scale;

                    let sumX = 0, sumY = 0;
                    clipboardRef.current.forEach(t => { sumX += t.x; sumY += t.y; });
                    const centerX = sumX / clipboardRef.current.length;
                    const centerY = sumY / clipboardRef.current.length;

                    clipboardRef.current.forEach(token => {
                        const { id, ...tokenData } = token;
                        addTokenInstance(activeScene.id, {
                            ...tokenData,
                            x: worldMouseX + (tokenData.x - centerX),
                            y: worldMouseY + (tokenData.y - centerY)
                        });
                    });
                } else {
                    clipboardRef.current.forEach(token => {
                        const { id, ...tokenData } = token;
                        addTokenInstance(activeScene.id, { ...tokenData, x: tokenData.x + 20, y: tokenData.y + 20 });
                    });
                }
            }
        }

        if (['ArrowUp', 'ArrowDown'].includes(e.key) && !e.repeat) {
            e.preventDefault();
            zoomKeyRef.current = e.key === 'ArrowUp' ? 1 : -1;
            zoomSpeedRef.current = 0.01;
            lastZoomTimeRef.current = Date.now();
        }
    };
    const handleKeyUp = (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (e.code === 'Space') setIsSpacePressed(false);
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) { zoomKeyRef.current = 0; zoomSpeedRef.current = 0.01; }
    };
    
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [selectedIds, selectedFogIds, selectedPinIds, activeScene, deleteMultipleTokenInstances, deleteMultipleFogAreas, deleteMultiplePins, setActiveTool, addTokenInstance, updateTokenInstance]);

  const animateCamera = useCallback(() => {
      const target = targetViewRef.current;
      const current = viewRef.current;
      const diffScale = target.scale - current.scale;
      const diffX = target.x - current.x;
      const diffY = target.y - current.y;
      if (Math.abs(diffScale) < 0.0001 && Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1) {
          animationRef.current = null;
          viewRef.current = target;
          setView(target);
          return;
      }
      const nextState = { scale: current.scale + (diffScale * CAMERA_SMOOTHING), x: current.x + (diffX * CAMERA_SMOOTHING), y: current.y + (diffY * CAMERA_SMOOTHING) };
      viewRef.current = nextState;
      setView(nextState);
      animationRef.current = requestAnimationFrame(animateCamera);
  }, []);

  const startAnimation = useCallback(() => { if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(animateCamera); }, [animateCamera]);

  const applyKeyboardZoom = useCallback(() => {
    if (zoomKeyRef.current === 0) return;
    const now = Date.now();
    if (now - lastZoomTimeRef.current > 100) zoomSpeedRef.current = Math.min(zoomSpeedRef.current * 1.1, 0.05);
    const zoomAmount = zoomKeyRef.current * zoomSpeedRef.current;
    const currentTarget = targetViewRef.current;
    const rawNewScale = Math.min(Math.max(MIN_SCALE, currentTarget.scale * (1 + zoomAmount)), MAX_SCALE);
    if (Math.abs(rawNewScale - currentTarget.scale) < 0.001) return;
    const node = containerRef.current;
    if (node) {
        const rect = node.getBoundingClientRect();
        const ratio = rawNewScale / currentTarget.scale;
        let newX = (rect.width/2) - ((rect.width/2) - currentTarget.x) * ratio;
        let newY = (rect.height/2) - ((rect.height/2) - currentTarget.y) * ratio;
        const limit = PAN_LIMIT * rawNewScale;
        targetViewRef.current = { scale: rawNewScale, x: Math.min(Math.max(newX, -limit), limit), y: Math.min(Math.max(newY, -limit), limit) };
        setSliderValue(Math.round(rawNewScale * 100));
        startAnimation();
    }
    lastZoomTimeRef.current = now;
  }, [startAnimation]);

  useEffect(() => { let frameId; const loop = () => { if (zoomKeyRef.current !== 0) applyKeyboardZoom(); frameId = requestAnimationFrame(loop); }; frameId = requestAnimationFrame(loop); return () => cancelAnimationFrame(frameId); }, [applyKeyboardZoom]);

  const handleSliderZoom = (e) => {
      const val = parseFloat(e.target.value);
      setSliderValue(val);
      const newScale = val / 100;
      const node = containerRef.current;
      if (node) {
          const rect = node.getBoundingClientRect();
          const ratio = newScale / targetViewRef.current.scale;
          let newX = (rect.width/2) - ((rect.width/2) - targetViewRef.current.x) * ratio;
          let newY = (rect.height/2) - ((rect.height/2) - targetViewRef.current.y) * ratio;
          targetViewRef.current = { scale: newScale, x: newX, y: newY };
          startAnimation();
      }
  };

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => {
        if (e.target.closest('.overflow-y-auto')) return;
        e.preventDefault(); 
        const delta = -e.deltaY; 
        const scaleAmount = delta * ZOOM_SPEED_FACTOR; 
        const currentTarget = targetViewRef.current;
        const rawNewScale = Math.min(Math.max(MIN_SCALE, currentTarget.scale * (1 + scaleAmount)), MAX_SCALE);
        if (Math.abs(rawNewScale - currentTarget.scale) < 0.0001) return;
        const rect = node.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const ratio = rawNewScale / currentTarget.scale;
        let newX = mouseX - (mouseX - currentTarget.x) * ratio;
        let newY = mouseY - (mouseY - currentTarget.y) * ratio;
        const limit = PAN_LIMIT * rawNewScale;
        targetViewRef.current = { scale: rawNewScale, x: Math.min(Math.max(newX, -limit), limit), y: Math.min(Math.max(newY, -limit), limit) };
        setSliderValue(Math.round(rawNewScale * 100));
        startAnimation();
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [startAnimation, activeAdventureId]);

  const handleAuxClick = (e) => { if (e.button === 1) e.preventDefault(); };

  const handleBoardDoubleClick = (e) => {
      if (activeTool !== 'select') return;
      const rect = containerRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - view.x) / view.scale;
      const worldY = (e.clientY - rect.top - view.y) / view.scale;
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, worldX, worldY });
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.vtt-ui-layer')) return;
    if (contextMenu) setContextMenu(null);
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
        setInteraction({ mode: 'PANNING', startX: e.clientX, startY: e.clientY, initialViewX: targetViewRef.current.x, initialViewY: targetViewRef.current.y });
        return;
    }
    const isClickingElement = e.target.closest('.token') || e.target.closest('.fog-area') || e.target.closest('.pin-marker');
    if (!isClickingElement && (!e.ctrlKey && !e.metaKey)) {
        if (activeTool === 'select') { setSelectedIds(new Set()); setSelectedFogIds(new Set()); setSelectedPinIds(new Set()); }
        else if (activeTool === 'fogOfWar') { setSelectedFogIds(new Set()); setSelectedIds(new Set()); }
    }
    if (activeTool === 'fogOfWar' && e.button === 0 && !isClickingElement) {
        const rect = containerRef.current.getBoundingClientRect();
        const wX = (e.clientX - rect.left - view.x) / view.scale;
        const wY = (e.clientY - rect.top - view.y) / view.scale;
        setFogDrawing({ isDrawing: true, startX: wX, startY: wY, currentX: wX, currentY: wY });
    }
  };

  const handleTokenDown = (e, id) => {
    if (e.button === 1 || e.button === 2 || isSpacePressed || activeTool !== 'select') return;
    e.stopPropagation();

    if (activeScene && activeScene.tokens) {
        const currentIndex = activeScene.tokens.findIndex(t => t.id === id);
        if (currentIndex !== -1 && currentIndex !== activeScene.tokens.length - 1) {
            const newTokens = [...activeScene.tokens];
            const [movedToken] = newTokens.splice(currentIndex, 1); 
            newTokens.push(movedToken); 
            updateScene(activeScene.id, { tokens: newTokens });
        }
    }
    
    const isMultiSelect = e.ctrlKey || e.metaKey;
    if (isMultiSelect) {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
        setSelectedIds(newSelection);
    } else { if (!selectedIds.has(id)) setSelectedIds(new Set([id])); }
    setSelectedFogIds(new Set()); setSelectedPinIds(new Set());
    setInteraction({ mode: 'DRAGGING', activeTokenId: id, startX: e.clientX, startY: e.clientY });
  };

  const handleFogDown = (e, id) => {
    if (e.button === 1 || e.button === 2 || activeTool !== 'select') return;
    e.stopPropagation();
    const isMultiSelect = e.ctrlKey || e.metaKey;
    if (isMultiSelect) {
        const newSelection = new Set(selectedFogIds);
        if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
        setSelectedFogIds(newSelection);
    } else { if (!selectedFogIds.has(id)) setSelectedFogIds(new Set([id])); }
    setSelectedIds(new Set()); setSelectedPinIds(new Set());
    setInteraction({ mode: 'DRAGGING_FOG', activeFogId: id, startX: e.clientX, startY: e.clientY });
  };

  const handlePinDown = (e, id) => {
    if (e.button === 1 || e.button === 2 || activeTool !== 'select') return;
    e.stopPropagation();
    const isMultiSelect = e.ctrlKey || e.metaKey;
    let newSelection = new Set(selectedPinIds);
    if (isMultiSelect) { if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id); } else { if (!newSelection.has(id)) newSelection = new Set([id]); }
    setSelectedPinIds(newSelection); setSelectedIds(new Set()); setSelectedFogIds(new Set());
    const initialPositions = {};
    if (activeScene?.pins) {
        newSelection.forEach(pinId => { const pin = activeScene.pins.find(p => p.id === pinId); if (pin) initialPositions[pinId] = { x: pin.x, y: pin.y }; });
    }
    setInteraction({ mode: 'DRAGGING_PIN', activePinId: id, startX: e.clientX, startY: e.clientY, initialPositions });
  };

  const handleMouseMove = (e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
        const rect = containerRef.current.getBoundingClientRect();
        const wX = (e.clientX - rect.left - view.x) / view.scale;
        const wY = (e.clientY - rect.top - view.y) / view.scale;
        setFogDrawing(prev => ({ ...prev, currentX: wX, currentY: wY }));
        return;
    }
    if (interaction.mode === 'PANNING') {
        const dX = e.clientX - interaction.startX;
        const dY = e.clientY - interaction.startY;
        const limit = PAN_LIMIT * targetViewRef.current.scale;
        targetViewRef.current = { ...targetViewRef.current, x: Math.min(Math.max(interaction.initialViewX + dX, -limit), limit), y: Math.min(Math.max(interaction.initialViewY + dY, -limit), limit) };
        startAnimation();
    } else if (interaction.mode === 'DRAGGING' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        selectedIds.forEach(id => { const t = activeScene.tokens.find(x => x.id === id); if (t) updateTokenInstance(activeScene.id, id, { x: t.x + dx, y: t.y + dy }); });
        setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
    } else if (interaction.mode === 'DRAGGING_FOG' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        selectedFogIds.forEach(fogId => { const fog = activeScene.fogOfWar?.find(f => f.id === fogId); if (fog) updateFogArea(activeScene.id, fogId, { x: fog.x + dx, y: fog.y + dy }); });
        setInteraction(p => ({ ...p, startX: e.clientX, startY: e.clientY }));
    } else if (interaction.mode === 'DRAGGING_PIN' && activeScene) {
        const dx = (e.clientX - interaction.startX) / view.scale;
        const dy = (e.clientY - interaction.startY) / view.scale;
        Object.keys(interaction.initialPositions).forEach(pinId => { const initialPos = interaction.initialPositions[pinId]; if (initialPos) { updatePin(activeScene.id, pinId, { x: initialPos.x + dx, y: initialPos.y + dy }); } });
    }
  };

  const handleMouseUp = () => {
      if (fogDrawing.isDrawing && activeTool === 'fogOfWar') {
          const { startX, startY, currentX, currentY } = fogDrawing;
          const w = currentX - startX;
          const h = currentY - startY;
          if (Math.abs(w) > 10 && Math.abs(h) > 10 && activeScene) {
              addFogArea(activeScene.id, { x: Math.min(startX, currentX), y: Math.min(startY, currentY), width: Math.abs(w), height: Math.abs(h), color: 'rgba(0, 0, 0, 0.85)' });
          }
          setFogDrawing({ isDrawing: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
      }
      setInteraction({ mode: 'IDLE', activeTokenId: null, activeFogId: null, activePinId: null, initialPositions: {} });
  };

  const handleDrop = async (e) => {
      e.preventDefault();
      try {
          const dataString = e.dataTransfer.getData('application/json');
          if (!dataString) return;
          const json = JSON.parse(dataString);
          const rect = containerRef.current.getBoundingClientRect();
          const wX = (e.clientX - rect.left - view.x) / view.scale;
          const wY = (e.clientY - rect.top - view.y) / view.scale;
          if (json.type === 'library_token' && activeScene) {
             addTokenInstance(activeScene.id, { x: wX - 35, y: wY - 35, imageId: json.imageId, imageSrc: json.imageSrc });
          } else if (json.type === 'character_drag' && activeScene) {
              const imageId = await importCharacterAsToken(json.characterId);
              if (imageId) addTokenInstance(activeScene.id, { x: wX - 35, y: wY - 35, imageId: imageId });
          }
      } catch(e){ console.error("Drop Error:", e); }
  };

  const handlePinSave = (data) => {
      if (data.id) updatePin(activeScene.id, data.id, data);
      else addPin(activeScene.id, data);
  };

  const openPinModal = (data = null, coords = null) => {
      setPinModal({ open: true, data: data, position: coords || { x: 0, y: 0 } });
      setContextMenu(null);
  };

  // --- RENDER ---
  if (!activeAdventureId || !activeAdventure) {
      if (isGMWindow) {
          return (
            <div className="w-full h-full bg-[#15151a] flex flex-col items-center justify-center text-white p-6">
                <Monitor size={64} className="text-neon-green mb-4 opacity-50 animate-pulse"/>
                <h1 className="text-2xl font-rajdhani font-bold text-neon-green tracking-widest mb-2">TELA DO MESTRE</h1>
                <p className="text-text-muted">Aguardando seleção de aventura na tela principal...</p>
            </div>
          );
      }
      return (
        <div className="w-full h-full bg-ecos-bg flex flex-col items-center justify-center p-6 text-white relative z-50">
            <style>{`@keyframes enter-slide { 0% { opacity: 0; transform: translateY(-15px) scale(0.95); max-height: 0; margin-bottom: 0; } 40% { max-height: 60px; margin-bottom: 0.5rem; } 100% { opacity: 1; transform: translateY(0) scale(1); max-height: 60px; margin-bottom: 0.5rem; } } .animate-enter { animation: enter-slide 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }`}</style>
            <h1 className="text-5xl font-rajdhani font-bold text-neon-green mb-8 tracking-widest">TABULEIRO</h1>
            <div className="bg-glass border border-glass-border rounded-xl p-6 shadow-2xl w-full max-w-lg relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Suas Aventuras</h2>
                    {window.electron && ( <button onClick={() => window.electron.openGMWindow()} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition border ${isGMWindowOpen ? 'bg-neon-green/20 text-neon-green border-neon-green shadow-[0_0_10px_rgba(0,255,0,0.3)]' : 'bg-white/5 text-text-muted border-glass-border hover:text-white hover:bg-white/10'}`} title="Abrir janela secundária para o Mestre"><Monitor size={14} />{isGMWindowOpen ? 'TELA DO MESTRE ATIVA' : 'ABRIR TELA DO MESTRE'}</button> )}
                </div>
                <div ref={adventuresListRef} className="relative min-h-[120px] max-h-[300px] overflow-y-auto space-y-2 mb-4 scrollbar-thin pr-2 scroll-smooth">
                    {adventures.length === 0 && ( <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-text-muted text-sm animate-pulse">Nenhuma aventura criada.</p></div> )}
                    {adventures.map(adv => (
                        <div key={adv.id} onClick={() => { if(renamingId !== adv.id) setActiveAdventureId(adv.id); }} className={`animate-enter group flex justify-between items-center p-3 rounded bg-white/5 border border-transparent transition-all ${renamingId === adv.id ? 'bg-white/10' : 'hover:bg-neon-green/10 hover:border-neon-green/30 cursor-pointer'}`}>
                            {renamingId === adv.id ? (
                                <div className="flex flex-1 items-center gap-2 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                                    <input autoFocus className="flex-1 bg-black/50 border border-white/50 rounded px-2 py-1 text-white text-sm outline-none" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }} />
                                    <button onClick={() => setRenamingId(null)} className="p-1 rounded bg-black/40 hover:bg-white/20 text-text-muted hover:text-white transition"><X size={16}/></button>
                                    <button onClick={() => { updateAdventure(adv.id, { name: renameValue }); setRenamingId(null); }} className="p-1 rounded bg-neon-green hover:bg-white text-black transition"><Check size={16}/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="truncate font-medium">{adv.name}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e)=>{e.stopPropagation(); exportAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-neon-blue transition"><Upload size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); duplicateAdventure(adv.id)}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-white transition"><Copy size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setRenamingId(adv.id); setRenameValue(adv.name);}} className="p-1.5 rounded hover:bg-white/20 text-text-muted hover:text-yellow-400 transition"><Edit2 size={14}/></button>
                                        <button onClick={(e)=>{e.stopPropagation(); setDeleteModal(adv.id);}} className="p-1.5 rounded hover:bg-red-500/20 text-text-muted hover:text-red-500 transition"><Trash2 size={14}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="pt-4 border-t border-glass-border">
                    {!isCreatingAdventure ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsCreatingAdventure(true)} className="flex-1 py-3 bg-neon-green/10 border border-neon-green/40 text-neon-green font-bold rounded-lg hover:bg-neon-green hover:text-black hover:shadow-[0_0_15px_rgba(0,255,0,0.4)] transition-all flex items-center justify-center gap-2 group"><Plus size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform"/> NOVA AVENTURA</button>
                            <div className="relative">
                                <button onClick={() => importInputRef.current?.click()} className="h-full px-4 bg-glass border border-glass-border text-text-muted hover:text-white rounded-lg hover:bg-white/10 transition flex items-center justify-center"><Import size={20}/></button>
                                <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const file = e.target.files[0]; if(file) importAdventure(file); e.target.value = null; }}/>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <input autoFocus placeholder="Nome da Aventura..." className="w-full bg-[#15151a] border border-neon-green text-white placeholder-white/20 rounded-lg p-3 outline-none" value={newAdvName} onChange={e => setNewAdvName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const finalName = newAdvName.trim() === "" ? "Nova Aventura" : newAdvName; createAdventure(finalName); setNewAdvName(""); setIsCreatingAdventure(false); } if (e.key === 'Escape') setIsCreatingAdventure(false); }} />
                            <div className="flex items-center justify-end gap-3 px-1">
                                <button onClick={() => setIsCreatingAdventure(false)} className="text-xs font-medium text-zinc-500 hover:text-white transition-colors px-2 py-1">CANCELAR</button>
                                <button onClick={() => { const finalName = newAdvName.trim() === "" ? "Nova Aventura" : newAdvName; createAdventure(finalName); setNewAdvName(""); setIsCreatingAdventure(false); }} className="flex items-center gap-2 px-5 py-1.5 bg-neon-green text-black font-bold rounded-md text-xs hover:bg-white hover:scale-105 active:scale-95 transition-all"><Check size={14} strokeWidth={3}/> CRIAR</button>
                            </div>
                        </div>
                    )}
                </div>
                {deleteModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl animate-in fade-in">
                        <div className="bg-ecos-bg border border-glass-border p-5 rounded-lg shadow-2xl w-3/4 max-w-sm text-center">
                            <h3 className="text-lg font-bold text-white mb-2">Excluir Aventura?</h3>
                            <div className="flex gap-2 justify-center mt-4">
                                <button onClick={() => setDeleteModal(null)} className="px-4 py-2 rounded bg-glass border border-glass-border text-white hover:bg-white/10 text-sm">Cancelar</button>
                                <button onClick={() => { deleteAdventure(deleteModal); setDeleteModal(null); }} className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 text-sm">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div 
        className={`w-full h-full relative overflow-hidden bg-[#15151a] transition-colors duration-300 ${activeTool === 'fogOfWar' ? 'cursor-crosshair' : 'cursor-default'}`} 
        ref={containerRef}
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={(e) => { isMouseOverRef.current = false; handleMouseUp(e); }} 
        onMouseEnter={() => { isMouseOverRef.current = true; }} 
        onDoubleClick={handleBoardDoubleClick} 
        onDrop={handleDrop} 
        onDragOver={e => e.preventDefault()}
        onAuxClick={handleAuxClick} 
    >
        <AudioController /> 

        {isGMWindow && <div className="absolute top-4 left-4 z-50 bg-neon-green/20 border border-neon-green px-3 py-1 rounded text-neon-green font-bold font-rajdhani text-sm pointer-events-none select-none">VISÃO DO MESTRE</div>}

        <div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
             <div className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />
            
            {mapParams.url && <div style={{ transform: `scale(${displayScene?.mapScale || 1})`, transformOrigin: '0 0' }}><img src={mapParams.url} className="max-w-none pointer-events-none select-none opacity-90 shadow-2xl" alt="Map Layer"/></div>}
            
            {displayScene?.tokens.map(t => {
            const isBeingDragged = interaction.mode === 'DRAGGING' && selectedIds.has(t.id);

            return (
                <Token 
                    key={t.id} 
                    data={t} 
                    isDragging={isBeingDragged} 
                    isSelected={selectedIds.has(t.id)} 
                    onMouseDown={handleTokenDown} 
                />
            );
        })}
            
            {displayScene?.pins?.map(pin => {
                if (!isGMWindow && pin.visibleToPlayers === false) return null;
                return (
                    <Pin 
                        key={pin.id} 
                        data={pin} 
                        viewScale={view.scale}
                        isGM={isGMWindow} 
                        isSelected={selectedPinIds.has(pin.id)} 
                        onMouseDown={handlePinDown}
                        onDoubleClick={() => openPinModal(pin)}
                    />
                );
            })}

            {fogDrawing.isDrawing && (
                <div className="absolute pointer-events-none fog-area" style={{ left: Math.min(fogDrawing.startX, fogDrawing.currentX), top: Math.min(fogDrawing.startY, fogDrawing.currentY), width: Math.abs(fogDrawing.currentX - fogDrawing.startX), height: Math.abs(fogDrawing.currentY - fogDrawing.startY), backgroundColor: 'rgba(0, 0, 0, 0.7)', border: '2px dashed rgba(255, 255, 255, 0.3)', zIndex: 15 }} />
            )}
            
            {displayScene?.fogOfWar?.map(fog => (
                <div key={fog.id} className={`fog-area absolute ${selectedFogIds.has(fog.id) ? 'ring-2 ring-yellow-400' : ''} ${activeTool === 'select' ? 'cursor-move' : 'cursor-default'}`}
                    style={{
                        left: fog.x, top: fog.y, width: fog.width, height: fog.height,
                        backgroundColor: isGMWindow ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 1)',
                        pointerEvents: (isGMWindow && activeTool !== 'fogOfWar') ? 'none' : 'auto',
                        zIndex: 15,
                    }}
                    onMouseDown={(e) => handleFogDown(e, fog.id)}
                />
            ))}
        </div>
        
        <div 
            className="absolute inset-0 bg-black pointer-events-none z-40"
            style={{ 
                opacity: transitionOpacity, 
                transition: `opacity ${FADE_DURATION}ms ease-in-out` 
            }}
        />

        <div className="vtt-ui-layer absolute inset-0 pointer-events-none z-[50]" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <VTTLayout 
                zoomValue={sliderValue} 
                onZoomChange={handleSliderZoom} 
                activeTool={activeTool} 
                setActiveTool={setActiveTool}
                showUI={showUI}
            />
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onOptionClick={(opt) => { if (opt === 'add_pin') openPinModal(null, { x: contextMenu.worldX, y: contextMenu.worldY }); setContextMenu(null); }} onClose={() => setContextMenu(null)} />}
            {pinModal.open && <PinModal initialData={pinModal.data} position={pinModal.position} onSave={handlePinSave} onClose={() => setPinModal({ open: false, data: null, position: { x: 0, y: 0 } })} />}
        </div>

    </div>
  );
};
export default Board;