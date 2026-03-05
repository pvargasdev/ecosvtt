import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Save, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { imageDB } from '../../context/db';

const EditAdventureModal = ({ adventure, onClose, onSave, onAlert }) => {
    const [name, setName] = useState(adventure.name);
    const [coverImageId, setCoverImageId] = useState(adventure.coverImageId);
    const [coverUrl, setCoverUrl] = useState(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        let objectUrl = null;
        let isMounted = true;

        const loadCover = async () => {
            if (coverImageId) {
                try {
                    const blob = await imageDB.getImage(coverImageId);
                    if (blob && isMounted) {
                        objectUrl = URL.createObjectURL(blob);
                        setCoverUrl(objectUrl);
                    }
                } catch (e) {}
            }
        };
        loadCover();
        return () => { 
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl); 
        };
    }, [coverImageId]);

    const processFile = async (file) => {
        if (!file) return;
        setLoadingImage(true);
        try {
            const newImageId = await imageDB.saveImage(file);
            if (newImageId) {
                setCoverImageId(newImageId);
            } else {
                onAlert && onAlert("Não foi possível salvar a imagem.");
            }
        } catch (error) {
            onAlert && onAlert("Erro ao processar imagem.");
        } finally {
            setLoadingImage(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
        e.target.value = null;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const removeCover = (e) => {
        e.stopPropagation();
        setCoverImageId(null);
        setCoverUrl(null);
    };

    const handleSave = () => {
        if (!name.trim()) {
            onAlert && onAlert("O nome da aventura é obrigatório.");
            return;
        }
        onSave(adventure.id, {
            name: name.trim(),
            coverImageId: coverImageId
        });
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row relative" onClick={e => e.stopPropagation()}>
                
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-full md:w-72 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col items-center justify-center">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`
                            relative w-full aspect-[3/4] rounded-xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group
                            ${isDragOver 
                                ? 'border-neon-green bg-neon-green/10' 
                                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                            }
                        `}
                    >
                        {coverUrl ? (
                            <>
                                <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <ImageIcon size={24} className="text-white"/>
                                    <span className="text-[10px] uppercase font-bold text-white tracking-widest">Trocar Imagem</span>
                                </div>
                                <button 
                                    onClick={removeCover}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 shadow-lg z-20 pointer-events-auto"
                                    title="Remover Capa"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <UploadCloud size={32} className={`mx-auto mb-2 transition-colors ${isDragOver ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'}`}/>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Capa da Aventura</p>
                                <p className="text-[10px] text-gray-600 mt-1">Clique ou arraste</p>
                            </div>
                        )}

                        {loadingImage && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
                                <Loader2 size={32} className="animate-spin text-neon-green" />
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                <div className="flex-1 p-8 flex flex-col justify-between">
                    <div>
                        <h2 className="text-2xl font-rajdhani font-bold text-white uppercase tracking-wider mb-1">Editar Aventura</h2>
                        <p className="text-xs text-gray-500 font-medium mb-8">Personalize os detalhes da sua campanha.</p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-neon-green">Nome da Campanha</label>
                                <input 
                                    type="text"
                                    autoFocus
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-xl font-rajdhani font-bold text-white outline-none transition-colors placeholder-white/10 focus:border-neon-green"
                                    placeholder="Ex: A Maldição de Strahd"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button onClick={onClose} className="px-6 py-3 rounded text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 px-6 py-3 rounded text-black font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 bg-neon-green shadow-neon-green/20"
                        >
                            <Save size={14} /> Salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditAdventureModal;