<div align="center">

# ✨ Lumina

### Professional 3D Lyric Video Builder

Create stunning kinetic typography lyric videos directly in your browser — powered by Three.js, React Three Fiber, and WebCodecs.

![Made with React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.160-000000?logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 🎬 Features

### Core
- **Real-time 3D Preview** — Live WebGL canvas powered by React Three Fiber
- **Word-level Karaoke** — 6 animation modes with smooth interpolated transitions
- **Multi-format Lyrics** — Import `.srt`, `.lrc` (enhanced word-level), `.vtt`, `.ttml`, `.xml`
- **Playlist Support** — Queue multiple tracks with per-track lyrics
- **WebM Recording** — Record directly from the canvas with audio sync
- **MP4 Export (WebCodecs)** — Hardware-accelerated H.264 + AAC encoding to MP4

### 🎤 Karaoke Modes
| Mode | Description |
|------|-------------|
| **Word** | Pop-in highlight with smooth scale animation |
| **Slider** | Smooth color sweep across words via clipping planes |
| **Bounce** | Words bounce upward with spring-like easing |
| **Typewriter** | Words appear one at a time as they're sung |
| **Reveal** | Gradual fade-in with scale transition |
| **None** | Static display, no karaoke animation |

### 🎨 Visual Layers
- **Lyrics** — Kinetic typography with configurable fonts, colors, and effects
- **Audio Visualizers** — Waveform, Linear Spectrum, Circular Spectrum, Circular Wave, Line Wave, Bass Reactor, Liquid Surface, DNA Helix, Galaxy Spiral
- **Atmosphere** — Floating particles, starfield, retro grid
- **Backgrounds** — Solid color, gradient, image, video, or transparent

### 🎥 Camera Modes
Static, Cinematic, Orbit, Reactive, Zoom In/Out, Pan Horizontal/Vertical, Dolly, Breathe, Swing, Chaotic, Random Cut, Handheld Shake, Spiral

### 🖌️ Post Processing
Bloom, Glitch, Film Grain, Chromatic Aberration, Vignette, Scanlines, Pixelation, Color Shift, Sepia, Dot Screen, Grid

### 📦 Export Options
- **WebM Recording** — Real-time canvas + audio capture via MediaRecorder
- **MP4 Export** — Frame-by-frame WebCodecs encoding with configurable FPS (24/30/60) and quality (4–16 Mbps)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A modern browser with WebCodecs support (Chrome 94+, Edge 94+) for MP4 export

### Install & Run

```bash
# Clone the repository
git clone https://github.com/dotslashgabut/lumina.git
cd lumina

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📖 Usage

### Quick Start
1. **Upload audio** — Drag & drop or browse for audio/video files
2. **Upload lyrics** — Import `.srt`, `.lrc`, `.vtt`, or `.ttml` files
3. **Choose a preset** — Select from 12 curated visual presets
4. **Customize** — Adjust fonts, colors, visualizers, camera, and effects
5. **Export** — Record as WebM or export as MP4

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `X` | Stop |
| `R` | Start Recording |
| `S` | Stop Recording |
| `F` | Toggle Fullscreen |
| `← →` | Seek ±5 seconds |

### Supported Lyric Formats

| Format | Extension | Word-level Timing |
|--------|-----------|-------------------|
| SubRip | `.srt` | ❌ Line-level only |
| WebVTT | `.vtt` | ❌ Line-level only |
| LRC | `.lrc` | ✅ Enhanced LRC with `<mm:ss.xx>` tags |
| TTML | `.ttml`, `.xml` | ❌ Line-level only |

> **Tip:** For the best karaoke experience, use Enhanced LRC format with word-level timestamps. Tools like [lrclib.net](https://lrclib.net) or Musixmatch can generate these.

---

## 🎭 Presets

| Preset | Style | Karaoke Mode |
|--------|-------|--------------|
| Lumina Default | Clean white on dark gradient | Word |
| Neon Cyber | Cyan/magenta with retro grid | Slider |
| Golden Hour | Warm gold with liquid waves | Reveal |
| Analog Horror | VHS-style with glitch effects | Typewriter |
| Midnight Vibes | Purple/indigo with particles | Bounce |
| Galaxy | Space theme with spiral effects | Word |
| Lo-Fi Chill | Warm sepia with film grain | Word |
| Electric Dreams | Hot pink synthwave | Slider |
| Minimalist | Clean monochrome | Word |
| Hip Hop Stage | Bold red with bass reactor | Bounce |
| Romantic | Soft pink with cinematic motion | Reveal |
| 8-Bit Arcade | Pixel-art retro style | Typewriter |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev) | UI framework |
| [Three.js](https://threejs.org) | 3D rendering engine |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | React renderer for Three.js |
| [React Three Drei](https://github.com/pmndrs/drei) | Utility components (Text, Sparkles, Stars, etc.) |
| [React Three Postprocessing](https://github.com/pmndrs/react-postprocessing) | Post-processing effects |
| [Vite](https://vitejs.dev) | Build tool & dev server |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [Lucide React](https://lucide.dev) | Icons |
| [mp4-muxer](https://github.com/nickytonline/mp4-muxer) | WebCodecs MP4 muxing |

---

## 📁 Project Structure

```
lumina/
├── index.html              # Entry HTML
├── index.tsx               # React mount point
├── index.css               # Global styles
├── App.tsx                 # Main application component
├── types.ts                # TypeScript types, configs, presets
├── components/
│   ├── Controls.tsx        # Sidebar settings panel
│   ├── LyricScene.tsx      # 3D scene, karaoke rendering, camera
│   └── Visualizers.tsx     # Audio-reactive visualizer components
├── services/
│   ├── parser.ts           # Lyric format parser (SRT/LRC/VTT/TTML)
│   └── webcodecs-exporter.ts  # WebCodecs MP4 export engine
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

---

## 🌐 Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| 3D Preview | ✅ 90+ | ✅ 90+ | ✅ 90+ | ✅ 15+ |
| WebM Recording | ✅ | ✅ | ✅ | ❌ |
| MP4 Export (WebCodecs) | ✅ 94+ | ✅ 94+ | ❌ | ❌ |

---

## 📄 License

MIT © [dotslashgabut](https://github.com/dotslashgabut)
