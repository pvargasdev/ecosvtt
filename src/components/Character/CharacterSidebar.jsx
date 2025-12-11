import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { ArrowLeft, Menu, Edit2, Plus, X, Upload, Download, Trash2, LogOut } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Utilitário para redimensionar arrays de dano
const resizeDamageArray = (currentArray, newSize) => {
    const arr = [...(currentArray || [])];
    while(arr.length < newSize) arr.push(false);
    while(arr.length > newSize) arr.pop();
    return arr;
};

// Componente de Animação: FADE IN VERTICAL
const FadeInView = ({ children, className }) => (
    <div className={`h-full flex flex-col ${className}`} style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
        <style>{`
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
        {children}
    </div>
);

const CharacterForm = ({ formData, setFormData, handlePhotoUpload }) => {
    return (
        <div className="space-y-4 pb-4">
            <div className="flex justify-center mb-4">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-photo-input').click()}>
                    <div className={`w-32 h-32 rounded-full border-2 ${formData.photo ? 'border-white/0' : 'border-glass-border border-dashed'} overflow-hidden bg-black flex items-center justify-center shadow-2xl transition-all group-hover:scale-95`}>
                        {formData.photo ? (
                            <img src={formData.photo} className="w-full h-full object-cover" alt="Avatar"/>
                        ) : (
                            <Upload size={32} className="text-text-muted opacity-50"/>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-white uppercase">Alterar</span>
                    </div>
                    <input id="edit-photo-input" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs text-text-muted mb-1 block">Nome</label>
                    <input className="w-full bg-black/50 border border-glass-border rounded p-2 text-white outline-none focus:border-neon-purple transition-colors" 
                           value={formData.name||''} 
                           onChange={e=>setFormData({...formData, name:e.target.value})}/>
                </div>
                <div className="w-20">
                    <label className="text-xs text-text-muted mb-1 block">Karma</label>
                    <input type="number" 
                           className="w-full bg-black/50 border border-glass-border rounded p-2 text-white text-center focus:border-neon-purple transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                           value={formData.karmaMax||0} 
                           onChange={e=>setFormData({...formData, karmaMax:parseInt(e.target.value)})}/>
                </div>
            </div>
            <div>
                <label className="text-xs text-text-muted mb-1 block">Descrição</label>
                <input className="w-full bg-black/50 border border-glass-border rounded p-2 text-white focus:border-neon-purple transition-colors" 
                       value={formData.description||''} 
                       onChange={e=>setFormData({...formData, description:e.target.value})}/>
            </div>
            <div className="bg-black/20 p-2 rounded border border-glass-border">
                <span className="text-xs uppercase text-text-muted mb-2 block text-center">Atributos</span>
                <div className="grid grid-cols-4 gap-2">
                    {['Mente','Corpo','Destreza','Presenca'].map(a=>(
                        <div key={a}>
                            <label className="text-[9px] text-text-muted block text-center uppercase">{a.substr(0,3)}</label>
                            <input type="number" 
                                   className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center font-bold focus:border-neon-purple transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                   value={formData.attributes?.[a.toLowerCase()]||0} 
                                   onChange={e=>setFormData({...formData, attributes:{...formData.attributes, [a.toLowerCase()]:parseInt(e.target.value)}})}/>
                        </div>
                    ))}
                </div>
            </div>

            {/* PERICIAS */}
            <div>
                <label className="text-xs text-text-muted mb-1 block">Perícias</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white h-20 text-sm focus:border-neon-purple transition-colors" 
                          value={formData.skills||''} 
                          onChange={e=>setFormData({...formData, skills:e.target.value})}/>
            </div>

            {/* TRAUMAS */}
            <div>
                <label className="text-xs text-text-muted mb-1 block">Traumas</label>
                <textarea className="w-full bg-black/50 border border-glass-border rounded p-2 text-white h-20 text-sm focus:border-neon-red transition-colors" 
                          value={formData.traumas||''} 
                          onChange={e=>setFormData({...formData, traumas:e.target.value})}/>
            </div>
            
            {/* PAINEL DE DANO */}
            <div className="bg-red-900/10 p-2 rounded border border-red-900/30">
                <span className="text-xs uppercase text-neon-red mb-2 block">Tolerância a Dano</span>
                <div className="flex gap-2">
                    {[['superior','Grave'],['medium','Moderado'],['inferior','Leve']].map(([k,l])=>(
                        <div key={k} className="flex-1">
                            <label className="text-[9px] text-text-muted block text-center uppercase">{l}</label>
                            <input type="number" 
                                   className="w-full bg-black/50 border border-glass-border rounded p-1 text-white text-center focus:border-neon-red transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                   value={formData.damage?.[k]?.length||0} 
                                   onChange={e=>{
                                       const s = parseInt(e.target.value)||0; 
                                       setFormData({...formData, damage:{...formData.damage, [k]:resizeDamageArray(formData.damage[k], s)}});
                                   }}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CharacterSidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { 
    gameState, presets, activePresetId,
    addCharacter, updateCharacter, deleteCharacter, setAllCharacters,
    createPreset, loadPreset, saveToPreset, deletePreset, mergePresets, exitPreset
  } = useGame();
  
  const [view, setView] = useState('manager'); 
  const [activeCharId, setActiveCharId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const [newPresetName, setNewPresetName] = useState("");
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', msg: '', onConfirm: null });
  
  const [draggedIndex, setDraggedIndex] = useState(null);
  const footerRef = useRef(null);
  const [footerIconSize, setFooterIconSize] = useState(48);

  const activeChar = gameState.characters.find(c => c.id === activeCharId);
  const currentPreset = presets.find(p => p.id === activePresetId);

  useEffect(() => {
      if (!activePresetId) setView('manager');
      else if (view === 'manager') setView('hub');
  }, [activePresetId]);

  useEffect(() => {
      if (activePresetId && gameState.characters) {
          saveToPreset(activePresetId);
      }
  }, [gameState.characters, activePresetId, saveToPreset]);

  useEffect(() => {
      if (!footerRef.current || gameState.characters.length === 0) return;
      const calcSize = () => {
          const containerW = footerRef.current.offsetWidth;
          const count = gameState.characters.length;
          const gap = 8; const padding = 24;
          const availableSpace = containerW - padding - ((count - 1) * gap);
          let size = Math.floor(availableSpace / count);
          size = Math.min(50, Math.max(25, size));
          setFooterIconSize(size);
      };
      calcSize();
      window.addEventListener('resize', calcSize);
      return () => window.removeEventListener('resize', calcSize);
  }, [gameState.characters.length, view, isCollapsed]);

  const showAlert = (title, msg) => setConfirmModal({ open: true, title, msg, onConfirm: null });
  const showConfirm = (title, msg, action) => setConfirmModal({ open: true, title, msg, onConfirm: action });
  const closeModal = () => setConfirmModal({ ...confirmModal, open: false });

  // --- ACTIONS ---
  const handleDragSortStart = (e, index, char) => {
      setDraggedIndex(index);
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'character_drag', characterId: char.id }));
      e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragSortDrop = (e, dropIndex) => {
      e.stopPropagation();
      if (draggedIndex === null || draggedIndex === dropIndex) return;
      if (draggedIndex === -1) return; 
      const newList = [...gameState.characters];
      const [removed] = newList.splice(draggedIndex, 1);
      newList.splice(dropIndex, 0, removed);
      setAllCharacters(newList);
      setDraggedIndex(null);
  };
  const handleDragEnd = () => setDraggedIndex(null);
  const handleDragOver = (e) => e.preventDefault();

  const handleExportPresetsZip = async () => {
      const zip = new JSZip();
      zip.file("presets.json", JSON.stringify(presets, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `ecos_grupos.zip`);
  };

  const handleImportPresetsZip = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
          const zip = await JSZip.loadAsync(file);
          const jsonFile = zip.file("presets.json");
          if (jsonFile) {
              const str = await jsonFile.async("string");
              const json = JSON.parse(str);
              if (Array.isArray(json)) mergePresets(json);
          }
      } catch (err) { showAlert("Erro", "Arquivo inválido."); }
      e.target.value = null;
  };

  const handleCreateNewPreset = () => {
      if (!newPresetName.trim()) return showAlert("Erro", "Dê um nome ao grupo.");
      createPreset(newPresetName);
      setNewPresetName("");
      setIsCreatingPreset(false);
  };

  const handleSaveChar = () => {
    if (!formData.name) return showAlert("Erro", "Nome é obrigatório");
    if (activeCharId === 'NEW') {
        const newId = addCharacter(formData);
        setActiveCharId(newId);
    } else {
        updateCharacter(activeCharId, formData);
    }
    setIsEditing(false);
    activeCharId === 'NEW' ? setView('hub') : setView('details');
  };

  const handleDeleteChar = (id) => {
      showConfirm("Excluir Personagem", "Tem certeza? Isso removerá o personagem da mesa.", () => {
          deleteCharacter(id);
          if (activeCharId === id) navToHub();
      });
  };

  const openEdit = (isNew = false) => {
    if (isNew) {
      setFormData({ name: "", description: "", karmaMax: 3, attributes: { mente:0, corpo:0, destreza:0, presenca:0 }, skills: "", traumas: "", damage: { superior: [false], medium: [false,false], inferior: [false,false] }, photo: null });
      setActiveCharId('NEW');
    } else {
      setFormData(JSON.parse(JSON.stringify(activeChar)));
    }
    setIsEditing(true);
  };

  const handlePhotoUpload = (e) => {
    const f = e.target.files[0];
    if(f) { const r = new FileReader(); r.onloadend = () => setFormData(p => ({...p, photo: r.result})); r.readAsDataURL(f); }
  };

  const navToChar = (id) => { setActiveCharId(id); setView('details'); setIsEditing(false); };
  const navToHub = () => { setView('hub'); setActiveCharId(null); };

  const ConfirmationOverlay = () => {
      if (!confirmModal.open) return null;
      return (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}>
              <div className="bg-ecos-bg border border-glass-border p-6 rounded-xl shadow-2xl max-w-xs w-full text-center">
                  <h3 className="text-xl font-rajdhani font-bold text-white mb-2">{confirmModal.title}</h3>
                  <p className="text-text-muted text-sm mb-6">{confirmModal.msg}</p>
                  <div className="flex gap-3 justify-center">
                      {confirmModal.onConfirm ? (
                          <>
                            <button onClick={closeModal} className="px-4 py-2 rounded border border-glass-border text-text-muted hover:bg-white/10 transition text-sm">Cancelar</button>
                            <button onClick={() => { confirmModal.onConfirm(); closeModal(); }} className="px-4 py-2 rounded bg-neon-purple text-black font-bold hover:bg-white transition text-sm">Confirmar</button>
                          </>
                      ) : (
                          <button onClick={closeModal} className="px-6 py-2 rounded bg-glass border border-glass-border text-white hover:bg-white/10 transition text-sm">OK</button>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  // ==========================================
  // VIEW: ESTADO COLAPSADO (Minimalista)
  // ==========================================
  if (isCollapsed) {
    return (
        <div className="h-full flex flex-col items-center py-4 bg-black/80 border-r border-glass-border gap-6 overflow-hidden">
             {/* Botão de Abrir */}
             <button 
                onClick={() => setIsCollapsed(false)} 
                className="p-2 rounded-full bg-glass hover:bg-white/10 text-text-muted hover:text-white transition"
                title="Expandir"
             >
                <Menu size={20} />
             </button>

             {/* Placeholder Vertical */}
             <div className="flex-1 flex items-center justify-center">
                <span className="text-neon-purple font-rajdhani font-bold tracking-[0.3em] text-xl rotate-90 whitespace-nowrap opacity-50 select-none">
                    PERSONAGENS
                </span>
             </div>
        </div>
    );
  }

  // ==========================================
  // VIEW: GERENCIADOR DE GRUPOS
  // ==========================================
  if (!activePresetId || view === 'manager') {
      return (
        // Alterado de bg-ecos-bg para bg-black/80 para consistência com Details
        <FadeInView key="manager" className="p-6 bg-black/80 text-text-main overflow-hidden border-r border-glass-border items-center relative">
            <ConfirmationOverlay />
            
            <button 
                onClick={() => setIsCollapsed(true)} 
                className="absolute top-2 right-2 p-2 rounded-full text-text-muted hover:text-white hover:bg-white/5 transition z-50"
                title="Recolher"
            >
                <Menu size={20} />
            </button>

            <h1 className="text-3xl font-rajdhani font-bold text-neon-purple mb-2 tracking-widest mt-10">PERSONAGENS</h1>
            <p className="text-text-muted text-sm text-center mb-8">Selecione um grupo para começar.</p>
            <div className="w-full max-w-xs space-y-4 flex-1 overflow-y-auto scrollbar-none pb-20">
                {/* Alterado bg-glass para bg-black/20 para ser mais escuro */}
                <div className="bg-glass border border-glass-border rounded-lg p-0">
                    {!isCreatingPreset ? (
                        // Botão alterado de Sólido para Outline (Mais dark/sci-fi)
                        <button onClick={() => setIsCreatingPreset(true)} className="w-full py-3 bg-neon-purple/10 border border-neon-purple text-neon-purple font-bold rounded hover:bg-neon-purple hover:text-black transition flex items-center justify-center gap-2"><Plus size={18}/> NOVO GRUPO</button>
                    ) : (
                        <div className="flex flex-col gap-3" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                            <input autoFocus placeholder="Nome..." className="w-full bg-black/50 border border-glass-border rounded p-2 text-white" value={newPresetName} onChange={e=>setNewPresetName(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreatingPreset(false)} className="flex-1 py-1 text-text-muted text-xs">Cancelar</button>
                                <button onClick={handleCreateNewPreset} className="flex-1 py-1 bg-neon-purple text-black font-bold rounded text-xs">OK</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 text-text-muted text-xs uppercase my-4"><div className="h-px bg-glass-border flex-1"></div><span>Grupos Salvos</span><div className="h-px bg-glass-border flex-1"></div></div>
                {presets.length === 0 ? <div className="text-center text-text-muted italic text-sm">Vazio.</div> : presets.map(p => (
                    // Alterado bg-glass para bg-black/20 e adicionado hover mais escuro
                    <div key={p.id} onClick={() => loadPreset(p.id)} className="bg-black/20 border border-glass-border rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition group">
                        <div><h3 className="font-bold text-white font-rajdhani">{p.name}</h3><div className="text-xs text-text-muted">{p.characters.length} Personagens</div></div>
                        <button onClick={(e) => { e.stopPropagation(); showConfirm("Apagar Grupo", "Não poderá ser desfeito.", () => deletePreset(p.id)); }} className="p-2 hover:bg-red-900/50 hover:text-red-500 rounded text-text-muted transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
            <div className="w-full border-t border-glass-border pt-4 flex justify-between text-xs text-text-muted">
                <button onClick={handleExportPresetsZip} className="flex gap-1 items-center hover:text-white"><Download size={12}/> Exportar</button>
                <label className="flex gap-1 items-center hover:text-white cursor-pointer"><Upload size={12}/> Importar<input type="file" className="hidden" accept=".zip" onChange={handleImportPresetsZip}/></label>
            </div>
        </FadeInView>
      );
  }

  // ==========================================
  // VIEW: HUB (GRID)
  // ==========================================
  if (view === 'hub') {
    return (
      // Alterado de bg-ecos-bg para bg-black/80
      <FadeInView key="hub" className="bg-black/80 text-text-main overflow-hidden relative border-r border-glass-border">
        <ConfirmationOverlay />
        <div className="flex justify-between items-center p-4 border-b border-glass-border bg-black/40 shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => exitPreset()} className="p-2 rounded-full bg-glass hover:bg-red-900/30 hover:text-red-400 text-text-muted transition" title="Sair do Grupo"><ArrowLeft size={20}/></button>
                <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted uppercase font-bold leading-none">Grupo</span>
                    <span className="font-rajdhani font-bold text-white truncate max-w-[150px] leading-none mt-1">{currentPreset?.name}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsCollapsed(true)} className="p-2 rounded-full bg-glass hover:bg-white/10 text-text-muted hover:text-white transition" title="Recolher"><Menu size={20}/></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 p-3 content-start scrollbar-thin">
            {gameState.characters.map((char, index) => (
                <div 
                    key={char.id}
                    draggable
                    onDragStart={(e) => handleDragSortStart(e, index, char)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDragSortDrop(e, index)}
                    onClick={() => navToChar(char.id)}
                    // Alterado bg-glass para bg-black/20
                    className={`bg-black/20 border border-glass-border rounded-lg p-3 flex flex-col items-center cursor-pointer hover:bg-white/5 transition relative group min-h-[110px] ${draggedIndex === index ? 'opacity-30 border-dashed border-neon-purple' : ''}`}
                >
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChar(char.id); }} className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 text-[10px] hover:scale-110"><X size={10}/></button>
                    <img src={char.photo || 'https://via.placeholder.com/120'} className="w-16 h-16 rounded-full object-cover border border-glass-border mb-2 bg-[#222] pointer-events-none" alt={char.name} />
                    <span className="font-semibold text-center text-xs leading-tight w-full truncate px-1 pointer-events-none">{char.name}</span>
                </div>
            ))}
            <div onClick={() => openEdit(true)} className="border border-dashed border-glass-border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 opacity-50 hover:opacity-100 min-h-[110px] transition-all"><Plus size={32} className="text-text-muted"/><span className="text-xs text-text-muted mt-2">Adicionar</span></div>
        </div>

        {isEditing && (
             <div className="absolute inset-0 bg-ecos-bg z-50 p-4 flex flex-col overflow-hidden" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-rajdhani font-bold text-neon-purple">Novo Personagem</h2><button onClick={() => setIsEditing(false)}><X size={20}/></button></div>
                <div className="flex-1 overflow-y-auto scrollbar-thin pr-2"><CharacterForm formData={formData} setFormData={setFormData} handlePhotoUpload={handlePhotoUpload} /></div>
                {/* Botão consistente com o "Novo Grupo" (Outline) */}
                <button onClick={handleSaveChar} className="mt-4 w-full py-3 bg-neon-purple/10 border border-neon-purple text-neon-purple font-bold rounded hover:bg-neon-purple hover:text-black transition">ADICIONAR À MESA</button>
             </div>
        )}
      </FadeInView>
    );
  }

  // ==========================================
  // VIEW: DETAILS (FICHA COM RODAPÉ ESTATICO)
  // ==========================================
  return (
    <div className="h-full flex flex-col bg-black/80 text-text-main relative overflow-hidden">
        <ConfirmationOverlay />
        
        {/* CONTAINER ANIMADO DO CONTEÚDO */}
        <div className="flex-1 relative overflow-hidden">
            <FadeInView key={activeCharId || 'details'} className="absolute inset-0 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-glass-border bg-black/40 shrink-0">
                    <button onClick={navToHub} className="p-2 rounded-full bg-glass hover:bg-white/10 transition"><ArrowLeft size={20} /></button>
                    <div className="flex gap-2">
                        <button onClick={() => openEdit(false)} className="p-2 rounded-full bg-glass hover:bg-white/10 transition text-neon-purple"><Edit2 size={20} /></button>
                        <button onClick={() => setIsCollapsed(true)} className="p-2 rounded-full bg-glass hover:bg-white/10 transition text-text-muted hover:text-white"><Menu size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="flex items-center gap-5 mb-4">
                        <img draggable onDragStart={(e) => handleDragSortStart(e, -1, activeChar)} onDragEnd={handleDragEnd} src={activeChar.photo || 'https://via.placeholder.com/120'} className="w-[100px] h-[100px] rounded-2xl object-cover shadow-lg cursor-grab active:cursor-grabbing hover:scale-105 transition-transform" alt="Avatar"/>
                        <div className="flex-1 flex flex-col justify-center gap-2">
                            <h2 className="text-2xl font-bold leading-tight font-rajdhani">{activeChar.name}</h2>
                            <div className="flex items-center justify-between bg-neon-purple/15 border border-neon-purple rounded-xl p-2 h-[60px] shadow-[0_0_15px_rgba(188,19,254,0.2)]">
                                <button onClick={() => updateCharacter(activeChar.id, { karma: Math.max(0, activeChar.karma - 1) })} className="w-10 h-full flex items-center justify-center text-xl bg-neon-purple/20 rounded hover:bg-neon-purple hover:text-black transition">-</button>
                                <div className="flex flex-col items-center"><span className="text-[10px] text-neon-purple font-bold tracking-widest uppercase">KARMA</span><span className="text-2xl font-rajdhani font-bold text-white drop-shadow-[0_0_10px_#bc13fe]">{activeChar.karma}</span></div>
                                <button onClick={() => updateCharacter(activeChar.id, { karma: Math.min(activeChar.karmaMax, activeChar.karma + 1) })} className="w-10 h-full flex items-center justify-center text-xl bg-neon-purple/20 rounded hover:bg-neon-purple hover:text-black transition">+</button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-glass border border-glass-border rounded-xl p-2 mb-4 text-center min-h-[50px] flex items-center justify-center"><span className="text-lg font-rajdhani font-semibold text-text-main truncate w-full">{activeChar.description || '---'}</span></div>
                    <div className="flex gap-4 mb-4 min-h-[160px]">
                        <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col justify-center"><div className="grid grid-cols-2 gap-3 h-full">{['mente','corpo','destreza','presenca'].map(a=><div key={a} className="bg-black/20 border border-white/5 rounded-lg flex flex-col items-center justify-center p-1"><span className="font-rajdhani font-bold text-2xl text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.3)] leading-none">{activeChar.attributes[a]}</span><span className="text-[10px] uppercase text-text-muted mt-1 tracking-wider">{a}</span></div>)}</div></div>
                        <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col">
                            <span className="text-xs uppercase text-neon-green font-bold tracking-wider mb-2 block border-b border-glass-border pb-2">Perícias</span>
                            <div className="text-sm text-gray-300 whitespace-pre-line overflow-y-auto flex-1 scrollbar-none">{activeChar.skills || '-'}</div>
                        </div>
                    </div>
                    
                    {/* LINHA DE DANO E TRAUMAS */}
                    <div className="flex gap-4 mb-4 min-h-[160px]">
                        {/* Dano */}
                        <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col">
                            <span className="text-xs uppercase text-neon-red font-bold tracking-wider mb-2 block border-b border-glass-border pb-2">Dano</span>
                            <div className="flex flex-col gap-2 h-full justify-between">
                                {['superior', 'medium', 'inferior'].map((k) => (
                                    <div key={k} className="flex gap-2 flex-1 w-full">
                                        {activeChar.damage[k].map((f, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    const n = [...activeChar.damage[k]];
                                                    n[i] = !n[i];
                                                    updateCharacter(activeChar.id, { damage: { ...activeChar.damage, [k]: n } });
                                                }}
                                                className={`h-full flex-1 rounded border border-glass-border transition-all ${
                                                    f ? 'bg-neon-red shadow-[0_0_10px_#ff2a2a] border-neon-red' : 'bg-black/30 hover:bg-white/10'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Traumas */}
                        <div className="flex-1 bg-glass border border-glass-border rounded-xl p-3 flex flex-col">
                            <span className="text-xs uppercase text-neon-red font-bold tracking-wider mb-2 block border-b border-glass-border pb-2">Traumas</span>
                            <div className="text-sm text-gray-300 whitespace-pre-line overflow-y-auto flex-1 scrollbar-none">
                                {activeChar.traumas || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInView>
        </div>

        {/* FOOTER ESTATICO */}
        <div ref={footerRef} className="bg-black/80 border-t border-glass-border flex items-center justify-center gap-2 px-3 py-2 shrink-0 overflow-hidden" style={{ minHeight: footerIconSize + 20 }}>
             {gameState.characters.map((c, index) => (
                 <img 
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragSortStart(e, index, c)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDragSortDrop(e, index)}
                    src={c.photo || 'https://via.placeholder.com/50'}
                    onClick={() => navToChar(c.id)}
                    style={{ width: footerIconSize, height: footerIconSize }}
                    className={`rounded-full border-2 object-cover cursor-pointer hover:scale-110 transition-transform shrink-0 ${c.id === activeChar.id ? 'border-neon-purple opacity-100 shadow-[0_0_10px_rgba(188,19,254,0.4)]' : 'border-transparent opacity-50 hover:opacity-100'}`} 
                    alt={c.name}
                 />
             ))}
        </div>

        {isEditing && (
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 p-4 flex flex-col overflow-y-auto" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-rajdhani font-bold text-neon-purple">Editar Personagem</h2><button onClick={() => setIsEditing(false)}><X size={24}/></button></div>
                <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
                    <CharacterForm formData={formData} setFormData={setFormData} handlePhotoUpload={handlePhotoUpload} />
                </div>
                <button onClick={handleSaveChar} className="mt-4 w-full py-3 bg-neon-purple/10 border border-neon-purple text-neon-purple font-bold rounded hover:bg-neon-purple hover:text-black transition">SALVAR ALTERAÇÕES</button>
             </div>
        )}
    </div>
  );
};

export default CharacterSidebar;