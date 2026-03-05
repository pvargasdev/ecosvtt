import React, { useEffect, useState } from 'react';
import LogoPNG from '../../assets/logo.png';

const SplashScreen = ({ onComplete }) => {
    const [status, setStatus] = useState('entering');

    useEffect(() => {
        const timerShow = setTimeout(() => setStatus('visible'), 100);
        const timerHide = setTimeout(() => setStatus('exiting'), 2300);
        const timerComplete = setTimeout(onComplete, 2800);

        return () => {
            clearTimeout(timerShow);
            clearTimeout(timerHide);
            clearTimeout(timerComplete);
        };
    }, [onComplete]);

    const getOpacity = () => {
        if (status === 'entering' || status === 'exiting') return 'opacity-0';
        return 'opacity-100';
    };

    const getScale = () => {
        if (status === 'entering') return 'scale-90';
        if (status === 'exiting') return 'scale-110';
        return 'scale-100';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#242424_0%,_#000000_100%)] opacity-60" />
            
            <div className={`relative transition-all duration-1000 ease-out-expo flex flex-col items-center ${getOpacity()} ${getScale()}`}>
                <img 
                    src={LogoPNG} 
                    alt="ECOS VTT Logo" 
                    className="h-32 w-auto mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                />
                
                <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden relative mt-4">
                    <div className="absolute inset-y-0 left-0 bg-[#c4c4c4] animate-loading-bar rounded-full shadow-[0_0_10px_#22c55e]" />
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;