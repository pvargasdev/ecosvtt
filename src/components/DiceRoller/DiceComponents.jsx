import React from 'react';

const showSmaller = false;

const D4Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <path d="M50 15 L85 80 L15 80 Z" />
  </svg>
);

const D6Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <rect x="15" y="15" width="70" height="70" rx="10" />
  </svg>
);

const D8Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <path d="M50 10 L85 50 L50 90 L15 50 Z" />
  </svg>
);

const D10Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <path d="M50 10 L90 37 L90 63 L50 90 L10 63 L10 37 Z" />
  </svg>
);

const D12Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <path d="M50 10 L90 38 L75 85 L25 85 L10 38 Z" />
  </svg>
);

const D20Icon = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
    <path d="M50 10 L88 30 L88 70 L50 90 L13 70 L13 30 Z" />
  </svg>
);

const ICON_MAP = { d4: D4Icon, d6: D6Icon, d8: D8Icon, d10: D10Icon, d12: D12Icon, d20: D20Icon };

export const Die = ({ type, value, isRolling, index, onRemove, isMax, isMin, showResult }) => {
  const IconComponent = ICON_MAP[type] || D6Icon;
  
  const animationDelay = isRolling ? `${index * 0.05}s` : '0s';

  let containerClass = "relative w-16 h-16 flex items-center justify-center transition-all duration-500 select-none";
  let iconClass = "w-full h-full transition-all duration-300";
  let textClass = "absolute inset-0 flex items-center justify-center font-rajdhani font-bold text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] z-10 pointer-events-none transition-colors duration-300";

  if (isRolling) {
    containerClass += " opacity-90 animate-shake-blur";
    iconClass += " text-neon-purple blur-[1px]";
    textClass += " text-white";
  } 

  else {
    containerClass += " cursor-pointer hover:scale-105 group animate-pop-in";

    if (showResult && value == 20) {
      containerClass += " scale-110 z-10";
      iconClass += " text-neon-purple drop-shadow-[0_0_10px_rgba(191,0,255,1)]";
      textClass += " text-white drop-shadow-[0_0_10px_rgba(191,0,255,1)]";
    } else if (showResult && isMin && showSmaller) {
      containerClass += " opacity-60 scale-95";
      iconClass += " text-neon-purple";
      textClass += " text-white";
    } else {
      iconClass += " text-neon-purple";
      textClass += " text-white";
    }

    iconClass += " group-hover:text-red-500 group-hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] group-hover:scale-95";
    textClass += " group-hover:text-red-100";
  }

  return (
    <div 
      onClick={!isRolling ? onRemove : undefined}
      className={containerClass}
      style={{ animationDelay }}
      title={!isRolling ? "Clique para remover" : ""}
    >
      <IconComponent className={iconClass} />

      {!isRolling && value !== null && (
        <span className={textClass}>
          {value}
        </span>
      )}
      
      {value === null && !isRolling && (
        <span className="absolute inset-0 flex items-center justify-center font-rajdhani font-bold text-xs text-neon-purple/60 group-hover:text-red-500/60 pointer-events-none pb-0.5 transition-colors">
          {type}
        </span>
      )}
    </div>
  );
};

export const DieSelector = ({ type, count, onClick }) => {
  const IconComponent = ICON_MAP[type];
  return (
    <button 
      onClick={onClick}
      className="relative group flex flex-col items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-lg hover:bg-neon-purple/10 hover:border-neon-purple active:scale-95 transition-all"
    >
      <IconComponent className="w-6 h-6 text-text-muted group-hover:text-neon-purple transition-colors" />
      <span className="text-[9px] uppercase font-bold text-text-muted mt-1 group-hover:text-white transition-colors">{type}</span>
      
      {count > 0 && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neon-purple text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border border-black animate-in zoom-in duration-200">
            {count}
        </div>
      )}
    </button>
  );
};