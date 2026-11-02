import React from 'react';
import { Loader2, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useNetworkCheck } from '../../network/networkCheck';

const STYLES = {
    ok: { Icon: ShieldCheck, color: 'text-neon-green', box: 'border-neon-green/20 bg-neon-green/5' },
    symmetric: { Icon: ShieldAlert, color: 'text-yellow-400', box: 'border-yellow-400/30 bg-yellow-400/5' },
    blocked: { Icon: ShieldX, color: 'text-red-400', box: 'border-red-500/30 bg-red-500/5' }
};

// Aviso de compatibilidade da rede com o jogo online.
// compact: só mostra algo quando há problema (usado dentro de outras telas).
const NetworkCompatibility = ({ compact = false, className = '' }) => {
    const t = useTranslation();
    const status = useNetworkCheck();

    if (status === 'checking') {
        if (compact) return null;
        return (
            <div className={`flex items-center gap-2 text-[11px] text-gray-500 ${className}`}>
                <Loader2 size={12} className="animate-spin" /> {t('netcheck.checking')}
            </div>
        );
    }

    const style = STYLES[status];
    if (!style || (compact && status === 'ok')) return null;
    const { Icon } = style;

    if (status === 'ok') {
        return (
            <div className={`flex items-center gap-2 text-[11px] text-gray-500 ${className}`} title={t('netcheck.okDetail')}>
                <Icon size={13} className={style.color} /> {t('netcheck.ok')}
            </div>
        );
    }

    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left max-w-xl ${style.box} ${className}`}>
            <Icon size={18} className={`${style.color} shrink-0 mt-0.5`} />
            <div>
                <p className={`text-xs font-bold ${style.color}`}>{t(`netcheck.${status}Title`)}</p>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{t(`netcheck.${status}Detail`)}</p>
            </div>
        </div>
    );
};

export default NetworkCompatibility;
