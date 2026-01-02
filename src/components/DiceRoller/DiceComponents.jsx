import React from 'react';

// --- ÍCONES SVG GEOMÉTRICOS ---
const D4Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><path d="M50 15 L85 80 L15 80 Z" /></svg>
);
const D6Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><rect x="20" y="20" width="60" height="60" rx="12" /></svg>
);
const D8Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><path d="M50 10 L85 50 L50 90 L15 50 Z" /><path d="M15 50 L85 50" strokeWidth="3" opacity="0.5"/></svg>
);
const D10Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><path d="M50 10 L85 40 L50 90 L15 40 Z" /><path d="M15 40 L85 40" strokeWidth="3" opacity="0.5"/><path d="M50 10 L50 90" strokeWidth="3" opacity="0.5"/></svg>
);
const D12Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><path d="M50 10 L88 38 L73 82 L27 82 L12 38 Z" /><path d="M12 38 L27 82 L73 82 L88 38" strokeWidth="3" opacity="0.5"/></svg>
);
const D20Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"><path d="M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z" /><path d="M10 28 L50 50 L90 28" strokeWidth="3" opacity="0.5"/><path d="M50 50 L50 95" strokeWidth="3" opacity="0.5"/><path d="M10 72 L50 50 L90 72" strokeWidth="3" opacity="0.5"/></svg>
);

const ICON_MAP = { d4: D4Icon, d6: D6Icon, d8: D8Icon, d10: D10Icon, d12: D12Icon, d20: D20Icon };

// --- COMPONENTE DO DADO NA MESA ---
export const Die = ({ type, value, isRolling, index, onRemove, isMax, isMin, showResult }) => {
  const IconComponent = ICON_MAP[type] || D6Icon;
  
  // CORREÇÃO DO DELAY: Só aplica delay se estiver rolando. 
  // Se for apenas adição, é instantâneo (0s).
  const animationDelay = isRolling ? `${index * 0.05}s` : '0s';

  // Define a cor baseada no resultado (Crítico/Max, Falha/Min ou Normal)
  let containerClass = "";
  let iconClass = "text-neon-green";
  let textClass = "text-white";

  if (showResult && !isRolling) {
      if (isMax) {
          // Efeito "Sucesso Crítico" / Maior Valor
          containerClass = "scale-110 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] z-10"; // Dourado/Brilho
          iconClass = "text-yellow-400";
          textClass = "text-yellow-100";
      } else if (isMin) {
          // Efeito "Falha" / Menor Valor
          containerClass = "opacity-60 scale-95 grayscale-[0.5]"; 
          iconClass = "text-red-400";
      }
  }

  return (
    <div 
      onClick={!isRolling ? onRemove : undefined}
      className={`
        relative w-16 h-16 flex items-center justify-center 
        transition-all duration-500 select-none
        ${!isRolling ? 'cursor-pointer hover:scale-105 group' : ''}
        ${isRolling ? 'opacity-90 animate-shake-blur' : 'animate-pop-in'}
        ${containerClass}
      `}
      style={{ animationDelay }}
      title={!isRolling ? "Clique para remover" : ""}
    >
      {/* Background Icon */}
      <IconComponent 
        className={`
          w-full h-full transition-colors duration-300
          ${isRolling ? 'text-neon-green blur-[1px]' : iconClass}
          ${!isRolling && !showResult ? 'group-hover:text-red-500' : ''} 
        `} 
      />

      {/* Valor Numérico (Resultado) */}
      {!isRolling && value !== null && (
        <span className={`absolute inset-0 flex items-center justify-center font-rajdhani font-bold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] z-10 pointer-events-none ${textClass}`}>
          {value}
        </span>
      )}
      
      {/* Label do tipo (enquanto espera rolar) */}
      {value === null && !isRolling && (
        <span className="absolute inset-0 flex items-center justify-center font-rajdhani font-bold text-xs text-neon-green/60 group-hover:text-red-500/60 pointer-events-none pb-0.5">
          {type}
        </span>
      )}
    </div>
  );
};

// --- BOTÃO SELETOR (TOOLBAR) ---
export const DieSelector = ({ type, count, onClick }) => {
  const IconComponent = ICON_MAP[type];
  return (
    <button 
      onClick={onClick}
      className="relative group flex flex-col items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-lg hover:bg-neon-green/10 hover:border-neon-green active:scale-95 transition-all"
    >
      <IconComponent className="w-6 h-6 text-text-muted group-hover:text-neon-green transition-colors" />
      <span className="text-[9px] uppercase font-bold text-text-muted mt-1 group-hover:text-white transition-colors">{type}</span>
      
      {/* Badge de Contagem */}
      {count > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neon-green text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border border-black animate-in zoom-in duration-200">
            {count}
        </div>
      )}
    </button>
  );
};