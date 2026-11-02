import { Howler } from 'howler';

// Captura tudo que o mestre está ouvindo (músicas + efeitos) em um MediaStream,
// transmitido aos jogadores como faixa de áudio WebRTC. Assim os jogadores não
// precisam baixar nenhum arquivo de áudio e ouvem tudo sincronizado.
//
// - Efeitos usam Web Audio: basta ligar o ganho mestre do Howler ao destino.
// - Músicas usam <audio> (html5) para não carregar o arquivo inteiro na memória;
//   cada elemento é ligado ao grafo de áudio com createMediaElementSource.

let destination = null;
let currentMusic = null;
const elementSources = new WeakMap();
const knownSources = new Set();

const getContext = () => {
    if (!Howler.ctx) Howler.volume(Howler.volume()); // força o Howler a criar o AudioContext
    return Howler.ctx;
};

const routeElement = (element) => {
    const ctx = getContext();
    if (!ctx || elementSources.has(element)) return;
    try {
        const source = ctx.createMediaElementSource(element);
        // O volume da música já é aplicado no próprio elemento, então ela vai direto
        // para a saída (sem passar pelo ganho mestre, para não atenuar duas vezes).
        source.connect(ctx.destination);
        if (destination) source.connect(destination);
        elementSources.set(element, source);
        knownSources.add(source);
    } catch (e) {
        console.warn('Não foi possível capturar o áudio da música:', e);
    }
};

export const audioTap = {
    // Chamado pelo motor de áudio sempre que uma música nova é criada.
    setCurrentMusic(howl) {
        currentMusic = howl;
        this.registerMusicHowl(howl);
    },

    registerMusicHowl(howl) {
        if (!destination) return;
        const node = howl?._sounds?.[0]?._node;
        if (node) routeElement(node);
    },

    start() {
        const ctx = getContext();
        if (!ctx) return null;
        // Se o AudioContext foi recriado, a captura antiga ficou presa ao contexto morto.
        if (destination && destination.context !== ctx) destination = null;
        // Sem suspensão automática enquanto transmite: um contexto suspenso não gera áudio.
        Howler.autoSuspend = false;
        if (!destination) {
            destination = ctx.createMediaStreamDestination();
            Howler.masterGain.connect(destination);
            knownSources.forEach(s => s.connect(destination));
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        if (currentMusic) this.registerMusicHowl(currentMusic);
        return destination.stream;
    },

    stop() {
        if (!destination) return;
        try { Howler.masterGain.disconnect(destination); } catch { /* já desconectado */ }
        knownSources.forEach(s => { try { s.disconnect(destination); } catch { /* idem */ } });
        destination = null;
        Howler.autoSuspend = true;
    }
};
