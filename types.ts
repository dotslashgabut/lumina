
export interface LyricWord {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
}

export interface LyricLine {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    words?: LyricWord[];
}

// === PLAYLIST ===
export interface PlaylistItem {
    id: string;
    mediaUrl: string;
    mediaName: string;
    lyrics: LyricLine[];
    lyricName: string | null;
}

export type RepeatMode = 'none' | 'one' | 'all';

export interface LayerConfig {
    lyrics: boolean;
    particles: boolean;
    stars: boolean;
    basicVisualizer: boolean;
    complexVisualizer: boolean;
    linearSpectrum: boolean;
    liquidWave: boolean;
    retroGrid: boolean;
    lineWave: boolean;
    // New visualizers
    waveform: boolean;
    dnaHelix: boolean;
    circularWave: boolean;
    galaxySpiral: boolean;
}

export interface LyricDisplayConfig {
    showPrevious: boolean;
    showCurrent: boolean;
    showNext: boolean;
    verticalOffset: number;
}

// === VISUALIZER SETTINGS ===
export interface VisualizerSettings {
    spectrumBarCount: number;      // 16–128
    spectrumBarWidth: number;      // 0.3–1.0
    spectrumMirror: boolean;       // mirror bars (symmetric)
    spectrumPosition: 'bottom' | 'top' | 'center';
    circularRadius: number;        // 2–6
    circularRotationSpeed: number; // 0–3
    circularBarLength: number;     // 1–8
    circularRing: boolean;         // show ring outline
    waveformThickness: number;     // 1–5
    waveformSmoothing: number;     // 0–1
    bassIntensity: number;         // 0–2
    showStars: boolean;
    showParticles: boolean;
    scale: number;                 // 0.5–2
    type: string;
}

export interface PostProcessingConfig {
    enableGlitch: boolean;
    glitchStrength: number;
    enableNoise: boolean;
    noiseOpacity: number;
    enableChromaticAberration: boolean;
    chromaticAberrationOffset: number;
    enableVignette: boolean;
    vignetteIntensity: number;
    enableScanline: boolean;
    scanlineDensity: number;
    enablePixelation: boolean;
    pixelGranularity: number;
    enableColorShift: boolean;
    colorShiftHue: number;        // 0 to 360
    enableSepia: boolean;
    sepiaIntensity: number;
    enableDotScreen: boolean;
    dotScale: number;
    enableGrid: boolean;
    gridScale: number;
    // New fields
    enableBloom: boolean;
    bloomIntensity: number;
    scanlineOpacity: number;
    pixelationSize: number;
    enableHueShift: boolean;
    hueShift: number;             // 0 to 360
}

export type CameraMode =
    | 'Static' | 'Cinematic' | 'Orbit' | 'Reactive'
    | 'ZoomIn' | 'ZoomOut' | 'PanHorizontal' | 'Chaotic'
    | 'RandomCut' | 'Shake' | 'Spiral'
    // New
    | 'Dolly' | 'PanVertical' | 'Breathe' | 'Swing';

export type BackgroundType = 'Color' | 'Gradient' | 'Image' | 'Video' | 'Transparent';
export type KaraokeMode = 'None' | 'Word' | 'Slider' | 'Typewriter' | 'Bounce' | 'Reveal';

export interface ProjectConfig {
    resolution: { width: number; height: number; name: string };
    aspectRatio: number;
    fontFamily: string;
    customFontUrl: string | null;
    fontSize: number;
    letterSpacing: number;
    lineHeight: number;
    strokeWidth: number;
    strokeColor: string;
    primaryColor: string;
    secondaryColor: string;
    wordSpacing: number;

    // Advanced Text
    textAlign: 'left' | 'center' | 'right';
    fontWeight: 'normal' | 'bold' | 'lighter';
    fontStyle: 'normal' | 'italic';

    // Text Effects
    textGlowStrength: number;
    enableTextShadow: boolean;
    textShadowColor: string;
    textShadowOffset: number;
    textShadowOpacity: number;
    enableTextWave: boolean;
    textWaveFrequency: number;
    textWaveSpeed: number;

    // Background
    backgroundType: BackgroundType;
    backgroundColor: string;
    backgroundGradientColor1: string;
    backgroundGradientColor2: string;
    backgroundImageUrl: string | null;
    backgroundVideoUrl: string | null;
    backgroundVideoBrightness: number;
    backgroundVideoBlur: number;
    backgroundSepia: number;
    backgroundGrayscale: number;
    backgroundInvert: number;
    backgroundMediaScale: number;
    backgroundMediaOffsetX: number;
    backgroundMediaOffsetY: number;

    bloomStrength: number;
    particleCount: number;
    particleSpeed: number;
    particleSize: number;
    particleOpacity: number;
    animationSpeed: number;
    mouseTracking: boolean;
    enableDragRotate: boolean;
    cameraMode: CameraMode;
    karaokeMode: KaraokeMode;
    layers: LayerConfig;
    lyricDisplay: LyricDisplayConfig;
    postProcessing: PostProcessingConfig;
    visualizerSettings: VisualizerSettings;
    // New fields
    cameraZoom: number;
    enableMovement: boolean;
}

export const RESOLUTIONS = {
    HD: { width: 1280, height: 720, name: 'HD (720p)' },
    FHD: { width: 1920, height: 1080, name: 'FHD (1080p)' },
    SQUARE: { width: 1080, height: 1080, name: 'Square (1:1)' },
    PORTRAIT: { width: 1080, height: 1920, name: 'Portrait (9:16)' },
};

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
    spectrumBarCount: 48,
    spectrumBarWidth: 0.7,
    spectrumMirror: false,
    spectrumPosition: 'bottom',
    circularRadius: 3.5,
    circularRotationSpeed: 0.15,
    circularBarLength: 5,
    circularRing: false,
    waveformThickness: 2,
    waveformSmoothing: 0.5,
    bassIntensity: 1.0,
    showStars: true,
    showParticles: true,
    scale: 1.0,
    type: 'Waveform',
};

export const DEFAULT_POST_PROCESSING: PostProcessingConfig = {
    enableGlitch: false,
    glitchStrength: 0.5,
    enableNoise: false,
    noiseOpacity: 0.2,
    enableChromaticAberration: false,
    chromaticAberrationOffset: 0.005,
    enableVignette: false,
    vignetteIntensity: 1.1,
    enableScanline: false,
    scanlineDensity: 1.25,
    enablePixelation: false,
    pixelGranularity: 8,
    enableColorShift: false,
    colorShiftHue: 0,
    enableSepia: false,
    sepiaIntensity: 1.0,
    enableDotScreen: false,
    dotScale: 1.0,
    enableGrid: false,
    gridScale: 1.0,
    // New fields
    enableBloom: true,
    bloomIntensity: 1.0,
    scanlineOpacity: 0.5,
    pixelationSize: 8,
    enableHueShift: false,
    hueShift: 0,
};

export const DEFAULT_CONFIG: ProjectConfig = {
    resolution: RESOLUTIONS.HD,
    aspectRatio: 16 / 9,
    fontFamily: 'sans-serif',
    customFontUrl: null,
    fontSize: 1.5,
    letterSpacing: 0.05,
    lineHeight: 1,
    strokeWidth: 0.01,
    strokeColor: '#475569',
    primaryColor: '#ffffff',
    secondaryColor: '#475569',
    wordSpacing: 0.25,

    textAlign: 'center',
    fontWeight: 'normal',
    fontStyle: 'normal',

    textGlowStrength: 0.5,
    enableTextShadow: false,
    textShadowColor: '#000000',
    textShadowOffset: 0.05,
    textShadowOpacity: 0.5,
    enableTextWave: false,
    textWaveFrequency: 2.0,
    textWaveSpeed: 1.0,

    backgroundType: 'Color',
    backgroundColor: '#000000',
    backgroundGradientColor1: '#000000',
    backgroundGradientColor2: '#222222',
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    backgroundVideoBrightness: 0.6,
    backgroundVideoBlur: 0,
    backgroundSepia: 0,
    backgroundGrayscale: 0,
    backgroundInvert: 0,
    backgroundMediaScale: 1.0,
    backgroundMediaOffsetX: 0,
    backgroundMediaOffsetY: 0,

    bloomStrength: 0.5,
    particleCount: 100,
    particleSpeed: 0.4,
    particleSize: 2,
    particleOpacity: 0.5,
    animationSpeed: 1,
    mouseTracking: false,
    enableDragRotate: false,
    cameraMode: 'Static',
    karaokeMode: 'Word',
    layers: {
        lyrics: true,
        particles: true,
        stars: true,
        basicVisualizer: false,
        complexVisualizer: false,
        linearSpectrum: false,
        liquidWave: false,
        retroGrid: false,
        lineWave: false,
        waveform: false,
        dnaHelix: false,
        circularWave: false,
        galaxySpiral: false,
    },
    lyricDisplay: {
        showPrevious: true,
        showCurrent: true,
        showNext: true,
        verticalOffset: 0
    },
    postProcessing: DEFAULT_POST_PROCESSING,
    visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    cameraZoom: 5,
    enableMovement: false,
};

export const PRESETS: Record<string, Partial<ProjectConfig>> = {
    "Lumina Default": {
        fontFamily: 'Outfit',
        primaryColor: '#ffffff',
        secondaryColor: '#94a3b8',
        backgroundColor: '#050505',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#050505',
        backgroundGradientColor2: '#111111',
        cameraMode: 'Breathe',
        karaokeMode: 'Word',
        layers: {
            ...DEFAULT_CONFIG.layers,
            particles: true,
            stars: false,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 0.8,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Neon Cyber": {
        fontFamily: 'Syncopate',
        primaryColor: '#00ffcc',
        secondaryColor: '#ff00ff',
        backgroundColor: '#0a001a',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#0a001a',
        backgroundGradientColor2: '#200020',
        strokeWidth: 0.02,
        strokeColor: '#ff00ff',
        cameraMode: 'PanHorizontal',
        karaokeMode: 'Slider',
        layers: {
            ...DEFAULT_CONFIG.layers,
            retroGrid: true,
            lineWave: true,
            stars: false,
            particles: true
        },
        lyricDisplay: { showPrevious: false, showCurrent: true, showNext: false, verticalOffset: 0 },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.5,
            enableChromaticAberration: true,
            chromaticAberrationOffset: 0.005,
            enableScanline: true,
            scanlineDensity: 1.5,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Golden Hour": {
        fontFamily: 'Cinzel',
        primaryColor: '#ffd700',
        secondaryColor: '#ff8c00',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#1a0d00',
        backgroundGradientColor2: '#331a00',
        strokeWidth: 0.005,
        strokeColor: '#553300',
        cameraMode: 'Cinematic',
        karaokeMode: 'Reveal',
        layers: {
            ...DEFAULT_CONFIG.layers,
            liquidWave: true,
            linearSpectrum: false,
            particles: true,
            stars: false
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.0,
            enableVignette: true,
            vignetteIntensity: 1.2,
        },
    },
    "Analog Horror": {
        fontFamily: 'VT323',
        primaryColor: '#e5e5e5',
        secondaryColor: '#555555',
        backgroundColor: '#0a0a0a',
        backgroundType: 'Color',
        strokeWidth: 0,
        cameraMode: 'Shake',
        karaokeMode: 'Typewriter',
        layers: {
            ...DEFAULT_CONFIG.layers,
            lyrics: true,
            particles: false,
            stars: false,
            lineWave: true,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableGlitch: true,
            glitchStrength: 0.3,
            enableNoise: true,
            noiseOpacity: 0.4,
            enableChromaticAberration: true,
            chromaticAberrationOffset: 0.015,
            enableScanline: true,
            scanlineDensity: 2.0,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Midnight Vibes": {
        fontFamily: 'Quicksand',
        primaryColor: '#d8b4fe',
        secondaryColor: '#818cf8',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#0f0c29',
        backgroundGradientColor2: '#302b63',
        strokeWidth: 0.008,
        strokeColor: '#6d28d9',
        cameraMode: 'Dolly',
        karaokeMode: 'Bounce',
        layers: {
            ...DEFAULT_CONFIG.layers,
            liquidWave: true,
            particles: true,
            stars: true,
            lineWave: false,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.2,
            enableVignette: true,
            vignetteIntensity: 1.0,
            enableNoise: true,
            noiseOpacity: 0.05,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Galaxy": {
        fontFamily: 'Space Grotesk',
        primaryColor: '#a78bfa',
        secondaryColor: '#38bdf8',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#000000',
        backgroundGradientColor2: '#0f0c29',
        cameraMode: 'Spiral',
        karaokeMode: 'Word',
        layers: {
            ...DEFAULT_CONFIG.layers,
            galaxySpiral: true,
            stars: true,
            particles: true,
            circularWave: true,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.5,
            enableVignette: true,
            vignetteIntensity: 1.5,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Lo-Fi Chill": {
        fontFamily: 'Caveat',
        primaryColor: '#f5e6d3',
        secondaryColor: '#a88b6d',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#1a1510',
        backgroundGradientColor2: '#2d221a',
        strokeWidth: 0,
        cameraMode: 'Breathe',
        karaokeMode: 'Word',
        fontSize: 1.8,
        layers: {
            ...DEFAULT_CONFIG.layers,
            particles: true,
            stars: false,
            liquidWave: true,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 0.6,
            enableVignette: true,
            vignetteIntensity: 1.4,
            enableNoise: true,
            noiseOpacity: 0.15,
            enableSepia: true,
            sepiaIntensity: 0.3,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Electric Dreams": {
        fontFamily: 'Orbitron',
        primaryColor: '#ff2d95',
        secondaryColor: '#00d4ff',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#0d001a',
        backgroundGradientColor2: '#1a0033',
        strokeWidth: 0.015,
        strokeColor: '#ff2d95',
        cameraMode: 'PanHorizontal',
        karaokeMode: 'Slider',
        layers: {
            ...DEFAULT_CONFIG.layers,
            retroGrid: true,
            linearSpectrum: true,
            lineWave: true,
            particles: true,
            stars: false,
        },
        lyricDisplay: { showPrevious: false, showCurrent: true, showNext: false, verticalOffset: 0 },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 2.0,
            enableChromaticAberration: true,
            chromaticAberrationOffset: 0.008,
            enableScanline: true,
            scanlineDensity: 1.0,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Minimalist": {
        fontFamily: 'Montserrat',
        primaryColor: '#e0e0e0',
        secondaryColor: '#666666',
        backgroundColor: '#121212',
        backgroundType: 'Color',
        strokeWidth: 0,
        cameraMode: 'Static',
        karaokeMode: 'Word',
        fontSize: 2.0,
        textAlign: 'center',
        fontWeight: 'lighter',
        letterSpacing: 0.12,
        layers: {
            ...DEFAULT_CONFIG.layers,
            particles: false,
            stars: false,
            waveform: true,
        },
        lyricDisplay: { showPrevious: false, showCurrent: true, showNext: false, verticalOffset: 0 },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 0.4,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Hip Hop Stage": {
        fontFamily: 'Bebas Neue',
        primaryColor: '#ff4444',
        secondaryColor: '#ffcc00',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#0a0000',
        backgroundGradientColor2: '#1a0505',
        strokeWidth: 0.025,
        strokeColor: '#000000',
        cameraMode: 'Reactive',
        karaokeMode: 'Bounce',
        fontSize: 2.2,
        fontWeight: 'bold',
        layers: {
            ...DEFAULT_CONFIG.layers,
            complexVisualizer: true,
            linearSpectrum: true,
            particles: true,
            stars: false,
        },
        lyricDisplay: { showPrevious: false, showCurrent: true, showNext: false, verticalOffset: 0 },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.8,
            enableVignette: true,
            vignetteIntensity: 1.3,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "Romantic": {
        fontFamily: 'Dancing Script',
        primaryColor: '#ffc0cb',
        secondaryColor: '#d4849a',
        backgroundType: 'Gradient',
        backgroundGradientColor1: '#1a0812',
        backgroundGradientColor2: '#2d1020',
        strokeWidth: 0,
        cameraMode: 'Cinematic',
        karaokeMode: 'Reveal',
        fontSize: 1.8,
        fontStyle: 'italic',
        layers: {
            ...DEFAULT_CONFIG.layers,
            particles: true,
            stars: true,
            liquidWave: true,
        },
        lyricDisplay: {
            ...DEFAULT_CONFIG.lyricDisplay,
            showPrevious: true,
            showCurrent: true,
            showNext: true,
            verticalOffset: 0
        },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.0,
            enableVignette: true,
            vignetteIntensity: 1.2,
            enableNoise: true,
            noiseOpacity: 0.03,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
    "8-Bit Arcade": {
        fontFamily: 'Press Start 2P',
        primaryColor: '#00ff00',
        secondaryColor: '#00aa00',
        backgroundColor: '#000000',
        backgroundType: 'Color',
        strokeWidth: 0,
        cameraMode: 'Shake',
        karaokeMode: 'Typewriter',
        fontSize: 0.8,
        letterSpacing: 0.08,
        layers: {
            ...DEFAULT_CONFIG.layers,
            retroGrid: true,
            lineWave: true,
            particles: false,
            stars: false,
        },
        lyricDisplay: { showPrevious: false, showCurrent: true, showNext: false, verticalOffset: 0 },
        postProcessing: {
            ...DEFAULT_POST_PROCESSING,
            enableBloom: true,
            bloomIntensity: 1.2,
            enableScanline: true,
            scanlineDensity: 2.5,
            enablePixelation: true,
            pixelGranularity: 4,
            enableChromaticAberration: true,
            chromaticAberrationOffset: 0.003,
        },
        visualizerSettings: DEFAULT_VISUALIZER_SETTINGS,
    },
};
