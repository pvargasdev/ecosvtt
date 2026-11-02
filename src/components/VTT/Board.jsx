import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import Token from './Token';
import { VTTLayout } from './VTTLayout';
import { imageDB } from '../../context/db';
import { Plus, Trash2, Import, Upload, Copy, Edit2, X, Check, Monitor, ArrowLeft, Loader2 } from 'lucide-react';

import Pin from './Pins/Pin';
import PinModal from './Pins/PinModal';
import ContextMenu from './Pins/ContextMenu';
import AudioController from '../../components/AudioController';
import MainMenu from '../../components/MainMenu/MainMenu';
import { useTranslation } from '../../i18n';
import { useNetwork } from '../../network';
import PlayerHUD from '../Network/PlayerHUD';
import LightingLayer from '../Lighting/LightingLayer';
import LightingEditor from '../Lighting/LightingEditor';
import LightPropertiesPanel from '../Lighting/LightPropertiesPanel';
import LightingHints from '../Lighting/LightingHints';
import WallPanel from '../Lighting/WallPanel';
import { getLighting } from '../../lighting/model';
import { newId as newLightingId } from '../../lighting/geometry';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;
const PAN_LIMIT = 3000; // área navegável quando a cena não tem mapa
const PAN_PADDING = 200; // folga (em px do mundo) ao redor do conteúdo da cena
const CAMERA_SMOOTHING = 0.2;
const ZOOM_SPEED_FACTOR = 0.001;
const PINCH_ZOOM_SPEED = 0.02;
const TRACKPAD_GESTURE_GAP = 150; // ms sem eventos de wheel para considerar um novo gesto
const DRAW_MAX_DIMENSION = 4096; // resolução máxima da camada de desenho
const TOKEN_BASE_SIZE = 70;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Só campos onde se digita texto devem "engolir" atalhos (Delete, Ctrl+C...).
// Controles como sliders e seletores de cor continuam deixando os atalhos passarem.
const TEXT_INPUT_TYPES = new Set(['text', 'number', 'search', 'email', 'password', 'url', 'tel']);
const isTypingTarget = (el) => {
    if (!el) return false;
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((el.type || 'text').toLowerCase());
};

// Chromium não diferencia mouse de touchpad no evento wheel, então usamos heurística:
// roda do mouse gera deltas em múltiplos de 120 (wheelDelta) sem eixo X; touchpad gera
// deltas pequenos/fracionados e frequentemente com X.
const looksLikeTrackpad = (e) => {
    if (e.deltaMode !== 0) return false;
    if (e.deltaX !== 0) return true;
    if (typeof e.wheelDeltaY === 'number' && e.wheelDeltaY !== 0) return Math.abs(e.wheelDeltaY) % 120 !== 0;
    return !Number.isInteger(e.deltaY);
};

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
    addPin, updatePin, deletePin, deleteMultiplePins,
    brushSize, brushColor, updateSceneDrawing, updateSceneLighting
  } = useGame();
  const t = useTranslation();
  const { isPlayer, isHost, shareView } = useNetwork();
  // Numa sala online, a tela do mestre (host) é a tela de mestre: vê através da fog.
  const seesAsGM = isGMWindow || isHost;

  const containerRef = useRef(null);
  const importInputRef = useRef(null);
  const adventuresListRef = useRef(null);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const drawRatioRef = useRef(1); // resolução da camada de desenho / resolução da imagem
  const lastSavedLayerRef = useRef(null);

  const boundsRef = useRef(null);
  const wheelGestureRef = useRef({ lastTime: 0, isTrackpad: false });

  const cursorRef = useRef(null);
  
  const clipboardRef = useRef(null); // { tokens, fogs, pins, lights, segments }
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOverRef = useRef(false);

  const prevAdventuresLength = useRef(adventures.length);

  const animationRef = useRef(null); 
  const viewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  const targetViewRef = useRef({ x: 0, y: 0, scale: 1 }); 
  
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [sliderValue, setSliderValue] = useState(100);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isCreatingAdventure, setIsCreatingAdventure] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [selectedFogIds, setSelectedFogIds] = useState(new Set());
  const [selectedPinIds, setSelectedPinIds] = useState(new Set());

  const [exportingId, setExportingId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

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
  const [mapSize, setMapSize] = useState({ url: null, w: 0, h: 0 });
  const [mapPreview, setMapPreview] = useState(null); // miniatura exibida enquanto o mapa baixa (jogador)
  const mapLoadingRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [pinModal, setPinModal] = useState({ open: false, data: null, position: { x: 0, y: 0 } });
  const [newAdvName, setNewAdvName] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); 
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [ghostPins, setGhostPins] = useState([]);

  const zoomKeyRef = useRef(0); 
  const zoomSpeedRef = useRef(0.01); 
  const lastZoomTimeRef = useRef(0); 

  const [transitionOpacity, setTransitionOpacity] = useState(1); 
  const [displayScene, setDisplayScene] = useState(null); 

  const [isResizingBrush, setIsResizingBrush] = useState(false);

  // Iluminação: ferramenta e seleção do modo de luz (compartilhadas com a barra superior).
  const lightingEditorRef = useRef(null);
  const lightClickStartRef = useRef(null);
  const [lightTool, setLightTool] = useState('select');
  const [lightSelection, setLightSelection] = useState(null);
  const [lightingInteractive, setLightingInteractive] = useState(false);
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);

  const [alertMessage, setAlertMessage] = useState(null);
  const clearAlert = useCallback(() => setAlertMessage(null), []);

  const arePinsVisible = activeAdventure?.pinSettings 
      ? (seesAsGM ? activeAdventure.pinSettings.gm : activeAdventure.pinSettings.main)
      : true;
      
  // Escala final do mapa no mundo: escala escolhida pelo usuário × compensação da
  // redução de resolução aplicada na importação de imagens muito grandes.
  const effectiveMapScale = (displayScene?.mapScale || 1) * (displayScene?.mapResolutionScale || 1);
  const hasMapSize = mapParams.url && mapSize.url === mapParams.url && mapSize.w > 0;

  // Converte coordenadas da tela para coordenadas em pixels da imagem do mapa.
  const getCanvasCoordinates = (e) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();

      return {
          x: (e.clientX - rect.left - view.x) / view.scale / effectiveMapScale,
          y: (e.clientY - rect.top - view.y) / view.scale / effectiveMapScale
      };
  };

  // Coordenadas do mundo (sem a escala do mapa) a partir de um evento de mouse.
  const toWorld = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      return { x: (e.clientX - rect.left - view.x) / view.scale, y: (e.clientY - rect.top - view.y) / view.scale };
  };

  const contentBounds = useMemo(() => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const extend = (x1, y1, x2, y2) => {
          minX = Math.min(minX, x1); minY = Math.min(minY, y1);
          maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
      };

      if (hasMapSize) extend(0, 0, mapSize.w * effectiveMapScale, mapSize.h * effectiveMapScale);
      else if (displayScene?.mapNaturalSize) extend(0, 0, displayScene.mapNaturalSize.w * effectiveMapScale, displayScene.mapNaturalSize.h * effectiveMapScale);
      else extend(-PAN_LIMIT, -PAN_LIMIT, PAN_LIMIT, PAN_LIMIT);

      displayScene?.tokens?.forEach(t => {
          const size = TOKEN_BASE_SIZE * (t.scale || 1);
          extend(t.x, t.y, t.x + size, t.y + size);
      });
      displayScene?.pins?.forEach(p => extend(p.x, p.y, p.x, p.y));
      displayScene?.fogOfWar?.forEach(f => extend(f.x, f.y, f.x + f.width, f.y + f.height));

      return { minX: minX - PAN_PADDING, minY: minY - PAN_PADDING, maxX: maxX + PAN_PADDING, maxY: maxY + PAN_PADDING };
  }, [hasMapSize, mapSize.w, mapSize.h, effectiveMapScale, displayScene?.mapNaturalSize, displayScene?.tokens, displayScene?.pins, displayScene?.fogOfWar]);

  useLayoutEffect(() => { boundsRef.current = contentBounds; }, [contentBounds]);

  // Mantém o centro da tela dentro dos limites do conteúdo. Assim qualquer borda do mapa
  // (por maior que seja) pode ser trazida até o meio da tela, sem deixar a câmera se perder.
  const clampView = useCallback((v) => {
      const node = containerRef.current;
      const b = boundsRef.current;
      if (!node || !b) return v;
      const halfW = node.clientWidth / 2;
      const halfH = node.clientHeight / 2;
      return {
          scale: v.scale,
          x: clamp(v.x, halfW - b.maxX * v.scale, halfW - b.minX * v.scale),
          y: clamp(v.y, halfH - b.maxY * v.scale, halfH - b.minY * v.scale)
      };
  }, []);

  // Permite afastar o suficiente para ver o conteúdo inteiro, mesmo em mapas gigantes.
  const getMinScale = useCallback(() => {
      const node = containerRef.current;
      const b = boundsRef.current;
      if (!node || !b) return MIN_SCALE;
      const fit = Math.min(node.clientWidth / (b.maxX - b.minX), node.clientHeight / (b.maxY - b.minY));
      return Math.min(MIN_SCALE, fit * 0.9);
  }, []);

  const forceSetView = (newView) => {
      setView(newView);
      targetViewRef.current = newView;
      viewRef.current = newView;
      setSliderValue(Math.round(newView.scale * 100));
  };

  useEffect(() => {
      const url = mapParams.url;
      return () => { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [mapParams.url]);

  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !hasMapSize) return;
      if (isDrawingRef.current) return;

      const layer = displayScene?.drawingLayer || null;
      const sizeKey = `${mapParams.url}|${displayScene?.id}`;
      // Ignora a atualização gerada pelo próprio traço que acabou de ser salvo.
      if (canvas.dataset.sizeKey === sizeKey && layer && layer === lastSavedLayerRef.current) return;

      const ratio = Math.min(1, DRAW_MAX_DIMENSION / Math.max(mapSize.w, mapSize.h));
      drawRatioRef.current = ratio;
      canvas.width = Math.round(mapSize.w * ratio);
      canvas.height = Math.round(mapSize.h * ratio);
      canvas.dataset.sizeKey = sizeKey;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, mapSize.w, mapSize.h);

      if (!layer) return;
      let cancelled = false;
      const savedLayer = new Image();
      savedLayer.onload = () => {
          if (cancelled) return;
          ctx.drawImage(savedLayer, 0, 0, mapSize.w, mapSize.h);
      };
      savedLayer.src = layer;
      return () => { cancelled = true; };
  },[hasMapSize, mapParams.url, mapSize.w, mapSize.h, displayScene?.id, displayScene?.drawingLayer]);

  useEffect(() => {
      const handleGlobalMouseUp = (e) => {
          if (isDrawingRef.current || interaction.mode !== 'IDLE' || fogDrawing.isDrawing || lightingEditorRef.current?.isDragging()) {
              handleMouseUp(e);
          }
      };

      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  });

  useEffect(() => {
    const handleGlobalClick = (e) => {
        const isUiClick = e.target.closest('[data-ecos-ui="true"]') || e.target.closest('.vtt-ui-layer');
        
        if (isUiClick) {
            if (selectedIds.size > 0) setSelectedIds(new Set());
            if (selectedFogIds.size > 0) setSelectedFogIds(new Set());
            if (selectedPinIds.size > 0) setSelectedPinIds(new Set());
        }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [selectedIds.size, selectedFogIds.size, selectedPinIds.size]);

  useEffect(() => {
      if (!activeAdventureId) {
          setTransitionOpacity(1); 
          setDisplayScene(null);   
          setIsInitialLoad(true);
      }
  }, [activeAdventureId]);

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
          setTimeout(() => {
              setTransitionOpacity(0);
              setTimeout(() => setIsInitialLoad(false), FADE_DURATION);
          }, 100); 
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
                  const wanted = displayScene.mapImageId;
                  if (mapLoadingRef.current === wanted) return;
                  mapLoadingRef.current = wanted;
                  // Jogador: mostra a miniatura (poucos KB) na hora, enquanto o mapa completo baixa.
                  if (isPlayer && displayScene.mapThumbnailId && displayScene.mapNaturalSize) {
                      imageDB.getImage(displayScene.mapThumbnailId, { priority: 0 }).then(thumb => {
                          if (!thumb || mapLoadingRef.current !== wanted) return;
                          const url = URL.createObjectURL(thumb);
                          setMapPreview(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url, imageId: wanted }; });
                      });
                  }
                  const blob = await imageDB.getImage(wanted, { priority: 0 });
                  if (mapLoadingRef.current !== wanted) return;
                  if (blob) {
                      mapLoadingRef.current = null;
                      setMapParams({ url: URL.createObjectURL(blob), id: wanted });
                  }
              } else {
                  mapLoadingRef.current = null;
                  setMapParams({ url: null, id: null });
              }
          } else if (displayScene.mapImage && !displayScene.mapImageId && !mapParams.url) {
               setMapParams({ url: displayScene.mapImage, id: 'legacy' });
          }
      };
      loadMap();
  }, [displayScene, mapParams.id, mapParams.url, isPlayer]);

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  const handleExportAdventure = async (e, id) => {
    e.stopPropagation();
    if (exportingId) return; 
    setExportingId(id);
    
    setTimeout(async () => {
        try {
            await exportAdventure(id);
        } catch (error) {
            console.error("Erro ao exportar:", error);
        } finally {
            setExportingId(null);
        }
    }, 50);
  };

  const handleImportAdventure = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    e.target.value = null;

    setTimeout(async () => {
        try {
            await importAdventure(file);
        } catch (error) {
            console.error("Erro ao importar:", error);
        } finally {
            setIsImporting(false);
        }
    }, 50);
  };

  // --- área de transferência ------------------------------------------------
  // No modo de luz copia a luz/parede selecionada; nos outros modos, os tokens,
  // áreas de névoa e pins selecionados.
  const collectClipboard = () => {
      if (!activeScene) return null;
      if (activeTool === 'lighting') return lightingEditorRef.current?.copySelection() || null;
      const tokens = activeScene.tokens.filter(t => selectedIds.has(t.id));
      const fogs = (activeScene.fogOfWar || []).filter(f => selectedFogIds.has(f.id));
      const pins = (activeScene.pins || []).filter(p => selectedPinIds.has(p.id));
      if (!tokens.length && !fogs.length && !pins.length) return null;
      return { tokens, fogs, pins };
  };

  // Onde colar: sob o mouse (se estiver sobre o tabuleiro) ou no centro da tela.
  const pasteTarget = () => {
      const node = containerRef.current;
      if (!node) return { x: 0, y: 0 };
      const rect = node.getBoundingClientRect();
      const sx = isMouseOverRef.current ? mousePosRef.current.x - rect.left : rect.width / 2;
      const sy = isMouseOverRef.current ? mousePosRef.current.y - rect.top : rect.height / 2;
      return { x: (sx - targetViewRef.current.x) / targetViewRef.current.scale, y: (sy - targetViewRef.current.y) / targetViewRef.current.scale };
  };

  // Cola os itens mantendo a disposição entre eles. `at`: centro de destino;
  // `offset`: deslocamento a partir da posição original (usado no Ctrl+D).
  const pasteClipboard = (data, at, offset = null) => {
      if (!activeScene) return;
      const points = [
          ...(data.tokens || []).map(t => ({ x: t.x, y: t.y })),
          ...(data.fogs || []).map(f => ({ x: f.x + f.width / 2, y: f.y + f.height / 2 })),
          ...(data.pins || []).map(p => ({ x: p.x, y: p.y })),
          ...(data.lights || []).map(l => ({ x: l.x, y: l.y })),
          ...(data.segments || []).map(sg => ({ x: (sg.a.x + sg.b.x) / 2, y: (sg.a.y + sg.b.y) / 2 }))
      ];
      if (!points.length) return;
      const cx = points.reduce((sum, pt) => sum + pt.x, 0) / points.length;
      const cy = points.reduce((sum, pt) => sum + pt.y, 0) / points.length;
      const dx = offset ? offset.x : at.x - cx;
      const dy = offset ? offset.y : at.y - cy;

      const withoutId = (item) => { const { id: _ID, ...rest } = item; return rest; };
      (data.tokens || []).map(withoutId).forEach(t => addTokenInstance(activeScene.id, { ...t, x: t.x + dx, y: t.y + dy }));
      (data.fogs || []).map(withoutId).forEach(f => addFogArea(activeScene.id, { ...f, x: f.x + dx, y: f.y + dy }));
      (data.pins || []).map(withoutId).forEach(pin => addPin(activeScene.id, { ...pin, x: pin.x + dx, y: pin.y + dy }));

      if ((data.lights || []).length || (data.segments || []).length) {
          // IDs gerados fora do setState para serem estáveis.
          const lights = (data.lights || []).map(l => ({ ...l, id: newLightingId(), x: l.x + dx, y: l.y + dy }));
          const vertices = [];
          const segments = (data.segments || []).map(sg => {
              const a = { id: newLightingId(), x: sg.a.x + dx, y: sg.a.y + dy };
              const b = { id: newLightingId(), x: sg.b.x + dx, y: sg.b.y + dy };
              vertices.push(a, b);
              return { id: newLightingId(), a: a.id, b: b.id, ...(sg.c ? { c: { x: sg.c.x + dx, y: sg.c.y + dy } } : {}) };
          });
          updateSceneLighting(activeScene.id, l => ({
              ...l,
              lights: [...l.lights, ...lights],
              walls: { vertices: [...l.walls.vertices, ...vertices], segments: [...l.walls.segments, ...segments] }
          }));
          if (lights.length === 1 && !segments.length) setLightSelection({ kind: 'light', id: lights[0].id });
          else if (segments.length === 1 && !lights.length) setLightSelection({ kind: 'segment', id: segments[0].id });
      }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (isTypingTarget(document.activeElement)) return;

        // Copiar/colar vale para tudo (tokens, névoa, pins, luzes e paredes), não só tokens.
        const ctrl = e.ctrlKey || e.metaKey;
        const lowerKey = e.key.toLowerCase();
        if (ctrl && !isPlayer && activeScene && ['c', 'v', 'd'].includes(lowerKey)) {
            if (lowerKey === 'c') {
                const data = collectClipboard();
                if (data) { clipboardRef.current = data; e.preventDefault(); }
                return;
            }
            if (lowerKey === 'v') {
                if (clipboardRef.current) { e.preventDefault(); pasteClipboard(clipboardRef.current, pasteTarget()); }
                return;
            }
            if (lowerKey === 'd') {
                const data = collectClipboard();
                if (data) { e.preventDefault(); pasteClipboard(data, null, { x: 40, y: 40 }); }
                return;
            }
        }

        if (activeTool === 'lighting' && lightingEditorRef.current?.keyDown(e)) { e.preventDefault(); return; }
        
        if (e.code === 'Space' && !e.repeat) setIsSpacePressed(true);

        const key = e.key.toLowerCase();

        if (key === 'g') {
            e.preventDefault();
            const container = containerRef.current;

            if (container && hasMapSize) {
                const contW = container.clientWidth;
                const contH = container.clientHeight;
                const imgW = mapSize.w * effectiveMapScale;
                const imgH = mapSize.h * effectiveMapScale;

                const scaleX = contW / imgW;
                const scaleY = contH / imgH;

                let newScale = Math.max(scaleX, scaleY);

                newScale = clamp(newScale, getMinScale(), MAX_SCALE);

                const newX = (contW - (imgW * newScale)) / 2;
                const newY = (contH - (imgH * newScale)) / 2;

                targetViewRef.current = { x: newX, y: newY, scale: newScale };
                setSliderValue(Math.round(newScale * 100));
                startAnimation();
            }
        }
        
        // Jogadores só podem rotacionar (Q/E) e mover tokens; o resto é exclusivo do mestre.
        if (selectedIds.size > 0 && activeScene && !(isPlayer && key !== 'q' && key !== 'e')) {
            if (key === 'f') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) updateTokenInstance(activeScene.id, id, { mirrorX: !t.mirrorX });
                });
            }

            if (key === 'q') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentRot = t.rotation || 0;
                        updateTokenInstance(activeScene.id, id, { rotation: currentRot - TOKEN_ROTATION_STEP });
                    }
                });
            }
            if (key === 'e') {
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentRot = t.rotation || 0;
                        updateTokenInstance(activeScene.id, id, { rotation: currentRot + TOKEN_ROTATION_STEP });
                    }
                });
            }
            if (key === '=' || key === '+') { 
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentScale = t.scale || 1;
                        let newScale = Math.round((currentScale + 0.1) * 10) / 10;
                        if (newScale > MAX_SCALE) newScale = MAX_SCALE;
                        updateTokenInstance(activeScene.id, id, { scale: newScale });
                    }
                });
            }
            if (key === '-' || key === '_') { 
                e.preventDefault();
                selectedIds.forEach(id => {
                    const t = activeScene.tokens.find(token => token.id === id);
                    if (t) {
                        const currentScale = t.scale || 1;
                        let newScale = Math.round((currentScale - 0.1) * 10) / 10;
                        if (newScale < MIN_SCALE) newScale = MIN_SCALE;
                        updateTokenInstance(activeScene.id, id, { scale: newScale });
                    }
                });
            }

            if ((key === 'delete' || key === 'backspace')) {
                deleteMultipleTokenInstances(activeScene?.id, Array.from(selectedIds));
                setSelectedIds(new Set());
            }

        }

        if ((key === 'delete' || key === 'backspace')) {
            if (selectedFogIds.size > 0 && activeScene) {
                deleteMultipleFogAreas(activeScene?.id, Array.from(selectedFogIds));
                setSelectedFogIds(new Set());
            }
            if (selectedPinIds.size > 0 && activeScene) {
                deleteMultiplePins(activeScene.id, Array.from(selectedPinIds));
                setSelectedPinIds(new Set());
            }
        }

        if (['arrowup', 'arrowdown'].includes(key) && !e.repeat) {
            e.preventDefault();
            zoomKeyRef.current = key === 'arrowup' ? 1 : -1;
            zoomSpeedRef.current = 0.01;
            lastZoomTimeRef.current = Date.now();
        }
    };

    const handleKeyUp = (e) => {
        if (isTypingTarget(document.activeElement)) return;
        if (e.code === 'Space') setIsSpacePressed(false);
        if (['ArrowUp', 'ArrowDown'].includes(e.key)) { zoomKeyRef.current = 0; zoomSpeedRef.current = 0.01; }
    };
    
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [activeTool, isPlayer, selectedIds, selectedFogIds, selectedPinIds, activeScene, deleteMultipleTokenInstances, deleteMultipleFogAreas, deleteMultiplePins, setActiveTool, addTokenInstance, updateTokenInstance, hasMapSize, mapSize.w, mapSize.h, effectiveMapScale, getMinScale]);

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

  // immediate: aplica a câmera direto, sem suavização (gestos de touchpad precisam
  // responder 1:1 ao movimento dos dedos). Se já houver uma animação em curso, ela
  // apenas recebe o novo alvo para não dar saltos.
  const applyView = useCallback((next, immediate = false) => {
      targetViewRef.current = next;
      if (immediate && !animationRef.current) {
          viewRef.current = next;
          setView(next);
      } else {
          startAnimation();
      }
  }, [startAnimation]);

  const zoomAt = useCallback((rawScale, anchorX, anchorY, immediate = false) => {
      const currentTarget = targetViewRef.current;
      const newScale = clamp(rawScale, getMinScale(), MAX_SCALE);
      if (Math.abs(newScale - currentTarget.scale) < 0.0001) return;
      const ratio = newScale / currentTarget.scale;
      const next = clampView({
          scale: newScale,
          x: anchorX - (anchorX - currentTarget.x) * ratio,
          y: anchorY - (anchorY - currentTarget.y) * ratio
      });
      setSliderValue(Math.round(newScale * 100));
      applyView(next, immediate);
  }, [getMinScale, clampView, applyView]);

  const applyKeyboardZoom = useCallback(() => {
    if (zoomKeyRef.current === 0) return;
    const now = Date.now();
    if (now - lastZoomTimeRef.current > 100) zoomSpeedRef.current = Math.min(zoomSpeedRef.current * 1.1, 0.05);
    const zoomAmount = zoomKeyRef.current * zoomSpeedRef.current;
    const node = containerRef.current;
    if (node) {
        zoomAt(targetViewRef.current.scale * (1 + zoomAmount), node.clientWidth / 2, node.clientHeight / 2);
    }
    lastZoomTimeRef.current = now;
  }, [zoomAt]);

  useEffect(() => { let frameId; const loop = () => { if (zoomKeyRef.current !== 0) applyKeyboardZoom(); frameId = requestAnimationFrame(loop); }; frameId = requestAnimationFrame(loop); return () => cancelAnimationFrame(frameId); }, [applyKeyboardZoom]);

  const handleSliderZoom = (e) => {
      const val = parseFloat(e.target.value);
      setSliderValue(val);
      const node = containerRef.current;
      if (node) zoomAt(val / 100, node.clientWidth / 2, node.clientHeight / 2);
  };

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => {
        if (e.target.closest('.overflow-y-auto') || e.target.closest('[data-ecos-ui="true"]')) return;
        e.preventDefault();

        const rect = node.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let dx = e.deltaX, dy = e.deltaY;
        if (e.deltaMode === 1) { dx *= 16; dy *= 16; }
        else if (e.deltaMode === 2) { dx *= rect.width; dy *= rect.height; }

        // Um gesto contínuo de touchpad mantém a classificação, evitando que um evento
        // isolado com delta "redondo" seja interpretado como roda do mouse.
        const now = performance.now();
        const gesture = wheelGestureRef.current;
        const continuing = now - gesture.lastTime < TRACKPAD_GESTURE_GAP;
        gesture.isTrackpad = (continuing && gesture.isTrackpad) || looksLikeTrackpad(e);
        gesture.lastTime = now;

        const currentTarget = targetViewRef.current;

        if (gesture.isTrackpad) {
            if (e.ctrlKey || e.metaKey) {
                // Pinça no touchpad (o Chromium entrega como wheel + ctrlKey).
                const factor = Math.pow(2, -clamp(dy, -50, 50) * PINCH_ZOOM_SPEED);
                zoomAt(currentTarget.scale * factor, mouseX, mouseY, true);
            } else {
                // Dois dedos: move a câmera.
                applyView(clampView({ ...currentTarget, x: currentTarget.x - dx, y: currentTarget.y - dy }), true);
            }
            return;
        }

        zoomAt(currentTarget.scale * (1 - dy * ZOOM_SPEED_FACTOR), mouseX, mouseY);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAt, applyView, clampView, activeAdventureId]);

  // Sala online: o mestre pode levar a câmera de todos os jogadores até a sua visão.
  // A visão é enviada como centro + zoom em coordenadas do mundo, pois as telas têm tamanhos diferentes.
  useEffect(() => {
      if (isHost) {
          const onShareRequest = () => {
              const node = containerRef.current;
              if (!node) return;
              const v = targetViewRef.current;
              shareView({ cx: (node.clientWidth / 2 - v.x) / v.scale, cy: (node.clientHeight / 2 - v.y) / v.scale, scale: v.scale });
          };
          window.addEventListener('ecos-share-view-request', onShareRequest);
          return () => window.removeEventListener('ecos-share-view-request', onShareRequest);
      }
      if (isPlayer) {
          const onRemoteView = (e) => {
              const node = containerRef.current;
              const { cx, cy, scale } = e.detail || {};
              if (!node || ![cx, cy, scale].every(Number.isFinite)) return;
              const newScale = clamp(scale, getMinScale(), MAX_SCALE);
              setSliderValue(Math.round(newScale * 100));
              applyView(clampView({ scale: newScale, x: node.clientWidth / 2 - cx * newScale, y: node.clientHeight / 2 - cy * newScale }));
          };
          window.addEventListener('ecos-remote-view', onRemoteView);
          return () => window.removeEventListener('ecos-remote-view', onRemoteView);
      }
  }, [isHost, isPlayer, shareView, applyView, clampView, getMinScale]);

  const handleAuxClick = (e) => { if (e.button === 1) e.preventDefault(); };

  const handleBoardDoubleClick = (e) => {
      if (activeTool === 'lighting') { lightingEditorRef.current?.doubleClick(toWorld(e), e); return; }
      if (activeTool !== 'select' || isPlayer) return;
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
    if (activeTool === 'lighting') {
        if (e.button !== 0) return;
        if (lightingEditorRef.current?.pointerDown(toWorld(e), e)) return;
        // Nada sob o cursor: arrastar move a câmera; um clique simples cria pontos/luzes.
        lightClickStartRef.current = { x: e.clientX, y: e.clientY };
        setInteraction({ mode: 'PANNING', startX: e.clientX, startY: e.clientY, initialViewX: targetViewRef.current.x, initialViewY: targetViewRef.current.y });
        return;
    }
    // Para o jogador a fog é só escuridão: arrastar sobre ela move a tela.
    const isClickingElement = e.target.closest('.token') || (!isPlayer && e.target.closest('.fog-area')) || e.target.closest('.pin-marker');
    if (!isClickingElement && (!e.ctrlKey && !e.metaKey)) {
        if (activeTool === 'select') { setSelectedIds(new Set()); setSelectedFogIds(new Set()); setSelectedPinIds(new Set()); }
        else if (activeTool === 'fogOfWar') { setSelectedFogIds(new Set()); setSelectedIds(new Set()); }
    }
    // Arrastar no espaço vazio move a tela (essencial para touchpad, que não tem botão do meio).
    if (activeTool === 'select' && e.button === 0 && !isClickingElement && !e.ctrlKey && !e.metaKey) {
        setInteraction({ mode: 'PANNING', startX: e.clientX, startY: e.clientY, initialViewX: targetViewRef.current.x, initialViewY: targetViewRef.current.y });
        return;
    }
    if (activeTool === 'fogOfWar' && e.button === 0 && !isClickingElement) {
        const rect = containerRef.current.getBoundingClientRect();
        const wX = (e.clientX - rect.left - view.x) / view.scale;
        const wY = (e.clientY - rect.top - view.y) / view.scale;
        setFogDrawing({ isDrawing: true, startX: wX, startY: wY, currentX: wX, currentY: wY });
    }
    if (activeTool === 'brush' || activeTool === 'eraser') {
        if (e.button !== 0) return;
        if (!mapParams.url) {
            setAlertMessage(t('board.drawNeedsBackground'));
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        isDrawingRef.current = true;
        const ctx = canvas.getContext('2d');
        const ratio = drawRatioRef.current;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize / effectiveMapScale;

        if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColor || '#4ade80'; 
        }
        ctx.lineTo(x, y);
        ctx.stroke();

        return;
    }
  };

  const handleTokenDown = (e, id) => {
    if (e.button === 1 || e.button === 2 || isSpacePressed || activeTool !== 'select') return;
    e.stopPropagation();

    if (activeScene && activeScene.tokens && !isPlayer) {
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
    if (e.button === 1 || e.button === 2 || activeTool !== 'select' || isPlayer) return;
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
    if (e.button === 1 || e.button === 2 || activeTool !== 'select' || isPlayer) return;
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
    const isOverUI = e.target.closest('[data-ecos-ui="true"]') !== null;

    if (cursorRef.current) {
        if (isOverUI && !isResizingBrush) {
            cursorRef.current.style.display = 'none';
        } else {
            cursorRef.current.style.display = 'block';
            cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
        }
    }

    if (activeTool === 'lighting' && !isOverUI) lightingEditorRef.current?.pointerMove(toWorld(e), e);

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
        targetViewRef.current = clampView({ ...targetViewRef.current, x: interaction.initialViewX + dX, y: interaction.initialViewY + dY });
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
    
    if (!isOverUI && (activeTool === 'brush' || activeTool === 'eraser') && isDrawingRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { x, y } = getCanvasCoordinates(e);

        ctx.lineTo(x, y);
        ctx.stroke();
        return;
    }
  };

  const handleMouseUp = (e) => {
      if (activeTool === 'lighting') {
          lightingEditorRef.current?.pointerUp();
          const start = lightClickStartRef.current;
          lightClickStartRef.current = null;
          if (start && e && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) {
              lightingEditorRef.current?.click(toWorld(e), e);
          }
      }
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
      if (isDrawingRef.current) {
          isDrawingRef.current = false;
          const canvas = canvasRef.current;
          if (canvas && activeScene) {
              const ctx = canvas.getContext('2d');
              ctx.closePath();
              const sceneId = activeScene.id;
              // toBlob codifica fora da thread principal, evitando travadas ao soltar o traço.
              canvas.toBlob((blob) => {
                  if (!blob) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      lastSavedLayerRef.current = reader.result;
                      updateSceneDrawing(sceneId, reader.result);
                  };
                  reader.readAsDataURL(blob);
              }, 'image/png');
          }
          return;
      }
  };

  const handleDrop = async (e) => {
      e.preventDefault();
      if (isPlayer) return;
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
      if (data.id) {
          updatePin(activeScene.id, data.id, data);
      } else {
          addPin(activeScene.id, data);
          if (!arePinsVisible) {
              const tempId = crypto.randomUUID();
              const ghostPin = { ...data, id: tempId };
              setGhostPins(prev => [...prev, ghostPin]);
              setTimeout(() => {
                  setGhostPins(prev => prev.filter(p => p.id !== tempId));
              }, 1500);
          }
      }
  };

  const openPinModal = (data = null, coords = null) => {
      setPinModal({ open: true, data: data, position: coords || { x: 0, y: 0 } });
      setContextMenu(null);
  };

  const sceneLighting = getLighting(displayScene);
  const lightingActive = !!displayScene?.lighting?.enabled;
  const isLightingMode = activeTool === 'lighting' && !isPlayer && !!displayScene;
  const selectedLight = lightSelection?.kind === 'light' ? sceneLighting.lights.find(l => l.id === lightSelection.id) : null;
  const commitLighting = (updater) => { if (displayScene) updateSceneLighting(displayScene.id, updater); };
  const lightingMapRect = (() => {
      const natural = hasMapSize ? { w: mapSize.w, h: mapSize.h } : displayScene?.mapNaturalSize;
      return natural ? { x: 0, y: 0, w: natural.w * effectiveMapScale, h: natural.h * effectiveMapScale } : null;
  })();

  const expectedMapId = displayScene?.mapImageId || (displayScene?.mapImage ? 'legacy' : null);
  const showMap = !!mapParams.url && mapParams.id === expectedMapId;
  const showMapPreview = !showMap && isPlayer && !!mapPreview && mapPreview.imageId === displayScene?.mapImageId && !!displayScene?.mapNaturalSize;

  const handleMapLoad = (e) => {
      const w = e.currentTarget.naturalWidth;
      const h = e.currentTarget.naturalHeight;
      setMapSize({ url: mapParams.url, w, h });
      // Guarda as dimensões na cena para os jogadores poderem dimensionar a miniatura
      // corretamente antes de o mapa completo chegar.
      if (!isPlayer && !isGMWindow && displayScene && (displayScene.mapNaturalSize?.w !== w || displayScene.mapNaturalSize?.h !== h)) {
          updateScene(displayScene.id, { mapNaturalSize: { w, h } });
      }
  };

  if (!activeAdventureId || !activeAdventure) {
      return <MainMenu />;
  }

  return (
    <div 
        className={`w-full h-full relative overflow-hidden bg-[#15151a] transition-colors duration-300 touch-none ${
            interaction.mode === 'PANNING' ? 'cursor-grabbing' :
            activeTool === 'lighting' ? (lightTool === 'select' ? 'cursor-default' : 'cursor-crosshair') :
            activeTool === 'fogOfWar' ? 'cursor-crosshair' :
            (activeTool === 'brush' || activeTool === 'eraser' ? 'cursor-none' : 'cursor-default')
        }`}
        ref={containerRef}
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={(e) => { 
            isMouseOverRef.current = false; 
            if (cursorRef.current) cursorRef.current.style.display = 'none';
        }}
        onMouseEnter={() => { isMouseOverRef.current = true; }} 
        onDoubleClick={handleBoardDoubleClick} 
        onDrop={handleDrop} 
        onDragOver={e => e.preventDefault()}
        onAuxClick={handleAuxClick} 
    >
        <AudioController /> 

        {isGMWindow && <div className="absolute top-4 left-4 z-50 bg-neon-green/20 border border-neon-green px-3 py-1 rounded text-neon-green font-bold font-rajdhani text-sm pointer-events-none select-none uppercase">{t('board.gmView')}</div>}

        <div className="absolute top-0 left-0 w-full h-full origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            
            <div className="absolute -top-[50000px] -left-[50000px] w-[100000px] h-[100000px] opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)', backgroundSize: '70px 70px' }} />
            
            {showMapPreview && (
                <div style={{ transform: `scale(${effectiveMapScale})`, transformOrigin: '0 0' }}>
                    <img
                        src={mapPreview.url}
                        className="max-w-none pointer-events-none select-none opacity-90 shadow-2xl"
                        style={{ width: displayScene.mapNaturalSize.w, height: displayScene.mapNaturalSize.h }}
                        alt=""
                        draggable={false}
                    />
                </div>
            )}

            {showMap && (
                <div style={{ transform: `scale(${effectiveMapScale})`, transformOrigin: '0 0' }}>
                    <img
                        src={mapParams.url}
                        className="max-w-none pointer-events-none select-none opacity-90 shadow-2xl"
                        alt="Map Layer"
                        draggable={false}
                        decoding="async"
                        onLoad={handleMapLoad}
                    />
                </div>
            )}

            {showMap && (
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-none z-[5]"
                    style={{
                        width: hasMapSize ? mapSize.w : 0,
                        height: hasMapSize ? mapSize.h : 0,
                        transform: `scale(${effectiveMapScale})`,
                        transformOrigin: '0 0'
                    }}
                />
            )}

            {displayScene?.tokens.map(t => {
                const isBeingDragged = interaction.mode === 'DRAGGING' && selectedIds.has(t.id);
                return (
                    <Token 
                        key={t.id} 
                        data={t} 
                        isDragging={isBeingDragged} 
                        isSelected={selectedIds.has(t.id)} 
                        onMouseDown={handleTokenDown} 
                        interactive={activeTool !== 'lighting'}
                    />
                );
            })}
            
            {arePinsVisible && displayScene?.pins?.map(pin => (
                <Pin 
                    key={pin.id} 
                    data={pin} 
                    viewScale={view.scale}
                    isGM={seesAsGM} 
                    isSelected={selectedPinIds.has(pin.id)} 
                    onMouseDown={handlePinDown}
                    interactive={activeTool !== 'lighting'}
                    onDoubleClick={() => { if (!isPlayer) openPinModal(pin); }}
                />
            ))}

            {ghostPins.map(pin => (
                <Pin 
                    key={pin.id} 
                    data={pin} 
                    viewScale={view.scale}
                    isGM={seesAsGM}
                    isGhost={true} 
                    isSelected={false}
                    onMouseDown={() => {}}
                    onDoubleClick={() => {}}
                />
            ))}

            {fogDrawing.isDrawing && (
                <div className="absolute pointer-events-none fog-area" style={{ left: Math.min(fogDrawing.startX, fogDrawing.currentX), top: Math.min(fogDrawing.startY, fogDrawing.currentY), width: Math.abs(fogDrawing.currentX - fogDrawing.startX), height: Math.abs(fogDrawing.currentY - fogDrawing.startY), backgroundColor: 'rgba(0, 0, 0, 0.7)', border: '2px dashed rgba(255, 255, 255, 0.3)', zIndex: 15 }} />
            )}
            
            {lightingActive && (
                <LightingLayer
                    lighting={sceneLighting}
                    mapRect={lightingMapRect}
                    seesAsGM={seesAsGM}
                    previewAsPlayer={previewAsPlayer && activeTool === 'lighting'}
                    interactive={lightingInteractive}
                />
            )}

            {isLightingMode && (
                <LightingEditor
                    ref={lightingEditorRef}
                    lighting={sceneLighting}
                    viewScale={view.scale}
                    tool={lightTool}
                    setTool={setLightTool}
                    selection={lightSelection}
                    setSelection={setLightSelection}
                    commit={commitLighting}
                    onInteractiveChange={setLightingInteractive}
                />
            )}

            {displayScene?.fogOfWar?.map(fog => (
                <div key={fog.id} className={`fog-area absolute ${selectedFogIds.has(fog.id) ? 'ring-2 ring-yellow-400' : ''} ${activeTool === 'select' ? 'cursor-move' : 'cursor-default'}`}
                    style={{
                        left: fog.x, top: fog.y, width: fog.width, height: fog.height,
                        backgroundColor: seesAsGM ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 1)',
                        pointerEvents: (seesAsGM && activeTool !== 'fogOfWar') ? 'none' : 'auto',
                        zIndex: 15,
                    }}
                    onMouseDown={(e) => handleFogDown(e, fog.id)}
                />
            ))}
        </div>
        
        <div 
            className={`absolute inset-0 bg-black pointer-events-none ${isInitialLoad ? 'z-[60]' : 'z-[40]'}`}
            style={{ 
                opacity: transitionOpacity, 
                transition: `opacity ${FADE_DURATION}ms ease-in-out` 
            }}
        />

        {(activeTool === 'brush' || activeTool === 'eraser') && (
            <div
                ref={cursorRef}
                className="fixed pointer-events-none rounded-full border-2 z-[100]"
                style={{
                    width: `${brushSize * view.scale}px`,
                    height: `${brushSize * view.scale}px`,
                    borderColor: activeTool === 'eraser' ? '#ffffffff' : (brushColor || '#ffffffff'),
                    backgroundColor: activeTool === 'eraser' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                    left: 0, top: 0, 
                }}
            />
        )}

        <div id="vtt-ui-root" data-ecos-ui="true" className="vtt-ui-layer absolute inset-0 pointer-events-none z-[50]" onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            {isPlayer ? <PlayerHUD visible={showUI} /> : <VTTLayout 
                zoomValue={sliderValue} 
                onZoomChange={handleSliderZoom} 
                activeTool={activeTool} 
                setActiveTool={setActiveTool}
                showUI={showUI}
                setIsResizingBrush={setIsResizingBrush}
                alertMessage={alertMessage}
                setAlertMessage={setAlertMessage}
                clearAlert={clearAlert}
                lightingControls={isLightingMode ? {
                    lighting: sceneLighting,
                    setLighting: commitLighting,
                    tool: lightTool,
                    setTool: setLightTool,
                    previewAsPlayer,
                    setPreviewAsPlayer
                } : null}
            />}
            {isLightingMode && sceneLighting.enabled && <LightingHints tool={lightTool} selection={lightSelection} visible={showUI} />}
            {isLightingMode && showUI && (lightSelection?.kind === 'segment' || lightSelection?.kind === 'vertex') && (
                <WallPanel
                    lighting={sceneLighting}
                    selection={lightSelection}
                    setLighting={commitLighting}
                    onSelect={setLightSelection}
                    onCopy={() => { const data = lightingEditorRef.current?.copySelection(); if (data) pasteClipboard(data, null, { x: 40, y: 40 }); }}
                />
            )}
            {isLightingMode && selectedLight && showUI && (
                <LightPropertiesPanel light={selectedLight} setLighting={commitLighting} onSelect={setLightSelection} onClose={() => setLightSelection(null)} />
            )}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onOptionClick={(opt) => { if (opt === 'add_pin') openPinModal(null, { x: contextMenu.worldX, y: contextMenu.worldY }); setContextMenu(null); }} onClose={() => setContextMenu(null)} />}
            {pinModal.open && <PinModal initialData={pinModal.data} position={pinModal.position} onSave={handlePinSave} onClose={() => setPinModal({ open: false, data: null, position: { x: 0, y: 0 } })} />}
        </div>

    </div>
  );
};
export default Board;