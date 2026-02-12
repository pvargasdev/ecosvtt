# EcosVTT

![Tech Stack](https://img.shields.io/badge/stack-React_|_Electron_|_Tailwind-blue)
![License](https://img.shields.io/badge/license-GPLv3-red)

![ECOS VTT banner2](https://github.com/user-attachments/assets/422b5f00-cea9-41a6-a232-5278e1003a69)

---

## 📖 Sobre o Projeto

**EcosVTT** é uma aplicação gratuita e open-source desenvolvida para elevar a experiência de mesas de RPG presenciais ou híbridas. O projeto se destaca como uma **alternativa robusta** aos serviços de VTT online, oferecendo uma experiência visual e sonora polida sem a necessidade de assinaturas mensais ou altos custos de licença.

Diferente das plataformas baseadas em navegador, o EcosVTT roda **100% localmente**. Isso significa que você tem total liberdade: **sem limites de upload** para seus mapas e músicas, e **sem travamentos** causados por instabilidade de servidores externos. É a ferramenta ideal para mestres que buscam performance máxima, imersão total e custo zero.

---

<details>
<summary><strong>🎲 Para Usuários: O que é e Funcionalidades (Clique para expandir)</strong></summary>

### 🚀 Funcionalidades Principais

* **Gerenciador de Personagens Universal:** Crie e personalize fichas para **qualquer sistema de RPG**.
* **Diário de Campanha (Modo Wiki):** Uma ferramenta completa de escrita e organização de mundo. Crie páginas ricas em texto para documentar a lore, NPCs, sessões e contos.
* **Sistema de Pins (Pontos de Interesse):** Marque locais estratégicos diretamente sobre o mapa.
* **Portabilidade de Aventuras (Import/Export):** Exporte suas aventuras completas — incluindo cenas, mapas, wikis, tokens, músicas — em um único arquivo `.zip`. Isso facilita a criação de backups seguros e permite compartilhar aventuras prontas com outras pessoas.
* **Tabuleiro Infinito:** Movimente-se livremente pelo mapa com zoom e pan suaves.
* **Fog of War (Névoa de Guerra):** Esconda áreas não exploradas do mapa e revele-as dinamicamente conforme os jogadores avançam na dungeon.
* **Camada de Desenho:** Desenhe paredes ou faça anotações rápidas diretamente sobre o mapa usando ferramentas de pincel e borracha.
* **Soundboard Integrado:** Coloque trilhas sonoras e dispare efeitos sonoros (explosões, magias) instantaneamente sem precisar de outros programas abertos.
* **Biblioteca de Tokens:** Arraste e solte personagens para o tabuleiro em segundos.
* **Rolador de Dados:** Dados virtuais para momentos onde você não tem dados físicos à mão.

</details>

---

<details>
<summary><strong>💻 Para Desenvolvedores: Arquitetura e Código (Clique para expandir)</strong></summary>

### 🛠️ Destaques Técnicos (Arquitetura)

Este projeto é uma aplicação **Electron + React** focada em **Offline-first** e **Performance**.

#### 1. Sincronização de Estado Multi-Janela
O núcleo da aplicação reside no `GameContext`. A sincronização entre a janela do Mestre e a janela dos Jogadores é feita sem necessidade de backend.
* Utilização de **IPC** e `BroadcastChannel` para transmitir atualizações de estado (movimento de tokens, revelação de fog of war, áudio) em tempo real.
* Arquitetura de eventos para manter a consistência visual entre as telas.

#### 2. Renderização Híbrida (DOM + Canvas)
O componente `Board` implementa uma estratégia mista:
* **Canvas API:** Usada para a camada de desenho livre (Sketching) e renderização de imagens de fundo pesadas, garantindo performance de 60fps.
* **DOM/CSS Transforms:** Usados para Tokens e UI. Isso permite aceleração de hardware nas animações e facilita a acessibilidade e eventos de interação (drag & drop, hover).

#### 3. Persistência de Dados Otimizada
* **IndexedDB:** Utilizamos um wrapper customizado (`db.js`) para salvar ativos binários (imagens 4k, arquivos de áudio) diretamente no armazenamento do navegador/app, contornando limites de LocalStorage.
* **Compactação via JSZip:** Implementação de lógica para empacotar todo o estado da aplicação (JSON + Blobs) em arquivos portáveis para backup e compartilhamento.

### 📂 Estrutura do Projeto

```text
src/
├── components/
│   ├── DiceRoller/      # Lógica dos dados
│   ├── Pins/            # Sistema de marcadores
│   ├── Soundboard/      # Mixer de áudio e SFX Grid
│   └── VTT/             # Core do tabuleiro (Board, Tokens, Layers)
├── context/
│   ├── GameContext.jsx  # Estado global, lógica de import/export e sincronização
│   └── db.js            # Gerenciamento de IndexedDB e FileSystem
└── App.jsx              # Roteamento e layouts

</details>
