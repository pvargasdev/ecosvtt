import { useCallback, useEffect, useRef, useState } from 'react';

const SHOW_DELAY = 450;

// Controla a dica de um botão: aparece depois de um tempo com o mouse parado em cima,
// some ao clicar e só volta depois que o mouse sair e entrar de novo (assim ela não
// fica por cima da janela que o clique acabou de abrir).
export const useHoverTip = () => {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef(null);
    const suppressedRef = useRef(false);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const onMouseEnter = useCallback(() => {
        if (suppressedRef.current) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY);
    }, []);

    const onMouseLeave = useCallback(() => {
        clearTimeout(timerRef.current);
        suppressedRef.current = false;
        setVisible(false);
    }, []);

    const onMouseDown = useCallback(() => {
        clearTimeout(timerRef.current);
        suppressedRef.current = true;
        setVisible(false);
    }, []);

    return { visible, handlers: { onMouseEnter, onMouseLeave, onMouseDown } };
};
