import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Trash2, Dices, RotateCcw } from 'lucide-react';
import { Die, DieSelector } from './DiceComponents';

// --- INJEÇÃO DE CSS ---
const DiceStyles = () => (
    <style>{`
        @keyframes shake-blur {
            0% { transform: translate(0, 0) rotate(0deg); filter: blur(0px); }
            20% { transform: translate(-4px, 4px) rotate(-8deg); filter: blur(1px); }
            40% { transform: translate(4px, -4px) rotate(8deg); filter: blur(2px); }
            60% { transform: translate(-4px, -2px) rotate(-8deg); filter: blur(1px); }
            80% { transform: translate(2px, 2px) rotate(4deg); filter: blur(0.5px); }
            100% { transform: translate(0, 0) rotate(0deg); filter: blur(0px); }
        }
        @keyframes pop-in {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-shake-blur { animation: shake-blur 0.12s infinite linear; }
        .animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    `}</style>
);

const rollDie = (type) => {
  const sides = parseInt(type.substring(1));
  return Math.floor(Math.random() * sides) + 1;
};

const DiceWindow = ({ onClose, WindowWrapperComponent }) => {
  const [pool, setPool] = useState([]); 
  const [isRolling, setIsRolling] = useState(false);
  const [total, setTotal] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const scrollRef = useRef(null);

  // Calcula estatísticas para highlight
  const resultStats = useMemo(() => {
      if (!showResult || pool.length < 2) return { max: null, min: null }; // Só destaca se tiver 2+ dados
      
      let max = -1;
      let min = 9999;
      pool.forEach(d => {
          if (d.value > max) max = d.value;
          if (d.value < min) min = d.value;
      });
      
      // Se todos forem iguais, não destaca nenhum como min/max
      if (max === min) return { max: null, min: null };
      return { max, min };
  }, [pool, showResult]);

  const diceCounts = useMemo(() => {
      const counts = {};
      pool.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
      return counts;
  }, [pool]);

  const triggerSound = (soundName) => {
     window.dispatchEvent(new CustomEvent('ecos-sfx-trigger-local', { detail: soundName }));
  };

  const handleAddDie = (type) => {
    if (isRolling) return;
    const newDie = { id: crypto.randomUUID(), type, value: null };
    setPool(prev => [...prev, newDie]);
    setShowResult(false);
    
    // Pequeno timeout para garantir que o scroll vá para o fim
    setTimeout(() => {
        if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 10);
  };

  const handleRemoveDie = (id) => {
      if (isRolling) return;
      setPool(prev => prev.filter(d => d.id !== id));
      setShowResult(false);
  };

  const handleClear = () => {
    if (isRolling) return;
    setPool([]);
    setTotal(0);
    setShowResult(false);
  };

  const handleRoll = () => {
    if (pool.length === 0 || isRolling) return;

    setIsRolling(true);
    setShowResult(false);
    triggerSound('dice_shake'); 

    setTimeout(() => {
      let currentTotal = 0;
      const rolledPool = pool.map(d => {
        const val = rollDie(d.type);
        currentTotal += val;
        return { ...d, value: val };
      });

      setPool(rolledPool);
      setTotal(currentTotal);
      setIsRolling(false);
      setShowResult(true);
      triggerSound('dice_impact'); 
    }, 800);
  };

  return (
    // WindowWrapper style copiado do AssetDock no VTTLayout para consistência
    <WindowWrapperComponent className="absolute top-24 left-1/2 transform -translate-x-1/2 w-[380px] bg-black/90 border border-glass-border backdrop-blur-sm rounded-xl flex flex-col z-50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5 duration-300">
      <DiceStyles />
      
      {/* --- HEADER (Consistente com AssetDock) --- */}
      <div className="p-3 border-b border-glass-border flex justify-between items-center bg-white/5 rounded-t-xl shrink-0 z-20">
        <h3 className="font-rajdhani font-bold text-white flex items-center gap-2">
            <Dices size={18} className="text-neon-purple"/> Rolagem de Dados
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-white transition"><X size={16}/></button>
      </div>

      {/* --- MESA / ÁREA DE ROLAGEM --- */}
      <div className="relative flex-1 bg-black/20 min-h-[100px] flex flex-col overflow-hidden">
        
        {/* BARRA DE TOTAL (Fixa no topo, estilo Notification) */}
        <div 
            className={`
                w-full py-1 bg-neon-green/10 border-b border-neon-green/30 flex justify-center items-center gap-1.5 transition-all duration-300
                ${showResult ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 absolute'}
            `}
        >
            <span className="text-[12px] uppercase font-bold tracking-[0.2em] text-neon-green">Total -</span>
            <span className="text-[12px] uppercase font-bold tracking-[0.2em] text-white">{total}</span>
        </div>

        {/* CONTAINER DOS DADOS (Com scroll e centralização vertical) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin relative">
             {pool.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 pointer-events-none select-none">
                    <Dices size={48} strokeWidth={1} className="mb-2 opacity-50"/>
                    <span className="text-xs font-rajdhani uppercase tracking-widest">Mesa Vazia</span>
                </div>
            )}
            
            {/* Flex container interno com min-height full para centralização vertical */}
            <div className="min-h-full w-full flex flex-col items-center justify-center p-4">
                <div className="flex flex-wrap gap-2 justify-center content-center">
                    {pool.map((die, idx) => (
                        <Die 
                            key={die.id} 
                            type={die.type} 
                            value={die.value} 
                            isRolling={isRolling} 
                            index={idx} 
                            onRemove={() => handleRemoveDie(die.id)}
                            showResult={showResult}
                            isMax={die.value === resultStats.max}
                            isMin={die.value === resultStats.min}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- CONTROLES (Painel Inferior) --- */}
      <div className="p-3 bg-black/40 border-t border-glass-border space-y-3 z-20">
        
        {/* Seletor (D4 - D20) */}
        <div className="flex justify-between gap-1">
            {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(type => (
                <DieSelector 
                    key={type} 
                    type={type} 
                    count={diceCounts[type] || 0}
                    onClick={() => handleAddDie(type)} 
                />
            ))}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
            <button 
                onClick={handleClear}
                disabled={isRolling || pool.length === 0}
                className="px-3 py-2 bg-white/5 border border-glass-border rounded hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 text-text-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Limpar Mesa"
            >
                <Trash2 size={18} />
            </button>
            
            <button 
                onClick={handleRoll}
                disabled={isRolling || pool.length === 0}
                className={`
                    flex-1 flex items-center justify-center gap-2 rounded font-rajdhani font-bold text-lg tracking-wider transition-all
                    ${isRolling 
                        ? 'bg-neon-green/20 text-neon-green cursor-wait border border-neon-green/30' 
                        : 'bg-neon-green text-black hover:bg-white hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:bg-white/10 disabled:text-text-muted disabled:shadow-none
                `}
            >
                {isRolling ? (
                    <><RotateCcw className="animate-spin" size={18}/> ROLANDO...</>
                ) : (
                    "ROLAR"
                )}
            </button>
        </div>
      </div>

    </WindowWrapperComponent>
  );
};

export default DiceWindow;