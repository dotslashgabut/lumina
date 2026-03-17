/// <reference types="@react-three/fiber" />
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sparkles, Float, Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Glitch, Noise, Vignette, ChromaticAberration, Bloom, Scanline, Pixelation, HueSaturation, Sepia, DotScreen, Grid } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { LyricLine, LyricWord, ProjectConfig } from '../types';
import { BasicVisualizer, ComplexVisualizer, LinearSpectrum, LiquidWave, RetroGrid, LineWave, Waveform, DNAHelix, CircularWave, GalaxySpiral } from './Visualizers';

interface LyricSceneProps {
    currentTime: number;
    lyrics: LyricLine[];
    config: ProjectConfig;
    analyser: React.MutableRefObject<AnalyserNode | null>;
    audioRef?: React.RefObject<HTMLVideoElement | null>;
    onConfigChange?: (newConfig: Partial<ProjectConfig>) => void;
}

// === SHADERS & MATERIALS ===

const FilteredBackgroundMaterial: React.FC<{ texture: THREE.Texture; config: ProjectConfig }> = ({ texture, config }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(() => ({
        tDiffuse: { value: texture },
        brightness: { value: config.backgroundVideoBrightness },
        sepia: { value: config.backgroundSepia },
        grayscale: { value: config.backgroundGrayscale },
        invert: { value: config.backgroundInvert },
    }), [texture]);

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.brightness.value = config.backgroundVideoBrightness;
            materialRef.current.uniforms.sepia.value = config.backgroundSepia;
            materialRef.current.uniforms.grayscale.value = config.backgroundGrayscale;
            materialRef.current.uniforms.invert.value = config.backgroundInvert;
        }
    }, [config.backgroundVideoBrightness, config.backgroundSepia, config.backgroundGrayscale, config.backgroundInvert]);

    return (
        <shaderMaterial
            ref={materialRef}
            transparent
            toneMapped={false}
            uniforms={uniforms}
            vertexShader={`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `}
            fragmentShader={`
                uniform sampler2D tDiffuse;
                uniform float brightness;
                uniform float sepia;
                uniform float grayscale;
                uniform float invert;
                varying vec2 vUv;

                // Simple sRGB to Linear conversion
                vec3 sRGBToLinear(vec3 color) {
                    return mix(pow((color + 0.055) / 1.055, vec3(2.4)), color / 12.92, lessThanEqual(color, vec3(0.04045)));
                }

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    
                    // Convert original texture color to linear space for accurate math
                    vec3 color = sRGBToLinear(texel.rgb) * brightness;

                    // Invert
                    if (invert > 0.0) {
                        color = mix(color, 1.0 - color, invert);
                    }

                    // Sepia
                    if (sepia > 0.0) {
                        vec3 s = vec3(
                            dot(color, vec3(0.393, 0.769, 0.189)),
                            dot(color, vec3(0.349, 0.686, 0.168)),
                            dot(color, vec3(0.272, 0.534, 0.131))
                        );
                        color = mix(color, s, sepia);
                    }

                    // Grayscale
                    if (grayscale > 0.0) {
                        float gray = dot(color, vec3(0.299, 0.587, 0.114));
                        color = mix(color, vec3(gray), grayscale);
                    }

                    // Linear color is output directly; the renderer handles final presentation.
                    // Since toneMapped={false}, this color reaches the buffer without global tone adjustment.
                    gl_FragColor = vec4(color, texel.a);
                }
            `}
        />
    );
};

const WavyGroup: React.FC<{ children: React.ReactNode; enabled: boolean; frequency: number; speed: number }> = ({ children, enabled, frequency, speed }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!groupRef.current || !enabled) return;
        const t = state.clock.elapsedTime * speed;
        groupRef.current.position.y = Math.sin(t * frequency) * 0.05;
        groupRef.current.rotation.z = Math.sin(t * frequency * 0.5) * 0.02;
    });
    return <group ref={groupRef}>{children}</group>;
};

// === LAYERS ===

const VideoBackgroundLayer: React.FC<{ config: ProjectConfig }> = ({ config }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
    const [, setUpdate] = useState(0);
    const { viewport } = useThree();

    useEffect(() => {
        if (!config.backgroundVideoUrl) {
            setVideoTexture(null);
            return;
        }

        const video = document.createElement('video');
        video.src = config.backgroundVideoUrl;
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.display = 'none';

        video.onloadedmetadata = () => {
            setUpdate(prev => prev + 1);
        };

        document.body.appendChild(video);
        videoRef.current = video;

        video.play().catch(err => console.warn('Video autoplay failed:', err));

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        setVideoTexture(texture);

        return () => {
            video.pause();
            video.src = '';
            if (document.body.contains(video)) {
                document.body.removeChild(video);
            }
            texture.dispose();
            setVideoTexture(null);
            videoRef.current = null;
        };
    }, [config.backgroundVideoUrl]);

    // Update texture each frame
    useFrame(() => {
        if (videoTexture) {
            videoTexture.needsUpdate = true;
        }
    });

    if (!videoTexture) return null;

    // Calculate scale to cover viewport
    const videoAspect = videoRef.current ? (videoRef.current.videoWidth / videoRef.current.videoHeight) || (16 / 9) : 16 / 9;
    const viewportAspect = viewport.width / viewport.height;
    let scaleX = viewport.width;
    let scaleY = viewport.height;

    if (videoAspect > viewportAspect) {
        scaleY = viewport.height;
        scaleX = viewport.height * videoAspect;
    } else {
        scaleX = viewport.width;
        scaleY = viewport.width / videoAspect;
    }

    return (
        <group>
            <mesh position={[config.backgroundMediaOffsetX, config.backgroundMediaOffsetY, -10]} scale={[config.backgroundMediaScale, config.backgroundMediaScale, 1]}>
                <planeGeometry args={[scaleX * 2.5, scaleY * 2.5]} />
                <FilteredBackgroundMaterial texture={videoTexture} config={config} />
            </mesh>
        </group>
    );
};

const BackgroundLayer: React.FC<{ config: ProjectConfig }> = ({ config }) => {
    const { backgroundType, backgroundColor, backgroundGradientColor1, backgroundGradientColor2, backgroundImageUrl } = config;
    const { viewport } = useThree();
    const [bgTexture, setBgTexture] = useState<THREE.Texture | null>(null);

    // Synchronously create gradient texture via useMemo to avoid blank frames
    const gradientTexture = useMemo(() => {
        if (backgroundType !== 'Gradient') return null;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        if (context) {
            const gradient = context.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, backgroundGradientColor1);
            gradient.addColorStop(1, backgroundGradientColor2);
            context.fillStyle = gradient;
            context.fillRect(0, 0, 512, 512);
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }
        return null;
    }, [backgroundType, backgroundGradientColor1, backgroundGradientColor2]);

    useEffect(() => {
        if (backgroundType === 'Gradient') {
            setBgTexture(gradientTexture);
        } else if (backgroundType === 'Image' && backgroundImageUrl) {
            new THREE.TextureLoader().load(backgroundImageUrl, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                setBgTexture(texture);
            });
        } else {
            setBgTexture(null);
        }
        // Cleanup old textures on type change
        return () => {
            if (backgroundType !== 'Gradient' && bgTexture && bgTexture !== gradientTexture) {
                bgTexture.dispose();
            }
        };
    }, [backgroundType, backgroundGradientColor1, backgroundGradientColor2, backgroundImageUrl, gradientTexture]);

    if (backgroundType === 'Transparent') return null;

    if (backgroundType === 'Video') {
        return (
            <>
                <color attach="background" args={['#000000']} />
                <VideoBackgroundLayer config={config} />
            </>
        );
    }

    if (backgroundType === 'Color') {
        return <color attach="background" args={[backgroundColor]} />;
    }

    // Use the synchronous gradient texture or the async-loaded image texture
    const activeTexture = backgroundType === 'Gradient' ? gradientTexture : bgTexture;

    if (activeTexture) {
        const aspect = activeTexture.image ? (activeTexture.image.width / activeTexture.image.height) : 1;
        const viewportAspect = viewport.width / viewport.height;
        let scaleX = viewport.width;
        let scaleY = viewport.height;

        if (aspect > viewportAspect) {
            scaleY = viewport.height;
            scaleX = viewport.height * aspect;
        } else {
            scaleX = viewport.width;
            scaleY = viewport.width / aspect;
        }

        return (
            <group>
                <color attach="background" args={['#000000']} />
                <mesh position={[config.backgroundMediaOffsetX, config.backgroundMediaOffsetY, -10.1]} scale={[config.backgroundMediaScale, config.backgroundMediaScale, 1]}>
                    <planeGeometry args={[scaleX * 2.5, scaleY * 2.5]} />
                    <FilteredBackgroundMaterial texture={activeTexture} config={config} />
                </mesh>
            </group>
        );
    }

    return <color attach="background" args={[backgroundColor]} />;
};

// === LYRIC LOGIC & COMPONENTS ===

const isCJK = (str: string) => /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\uff00-\uffef]/.test(str);

const measurementCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const measurementContext = measurementCanvas ? measurementCanvas.getContext('2d') : null;

const getWordWidth = (text: string, fontSize: number, letterSpacing: number, fontFamily: string, fontWeight: string, fontStyle: string) => {
    if (!measurementContext) return text.length * 0.6 * fontSize;
    const fontName = fontFamily === 'Custom' ? 'LuminaCustom' : fontFamily;
    const isGeneric = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(fontName.toLowerCase());
    const familyString = isGeneric ? fontName : `"${fontName}"`;
    measurementContext.font = `${fontStyle} ${fontWeight} 100px ${familyString}`;
    const metrics = measurementContext.measureText(text);
    const baseWidth = metrics.width / 100;
    const extraSpacing = text.length * letterSpacing;
    return (baseWidth + extraSpacing) * fontSize;
};

const calculateLayout = (words: LyricWord[], config: ProjectConfig, maxWidth: number) => {
    const layout: { word: LyricWord; width: number; spacing: number; x: number; y: number; lineIndex: number }[] = [];
    const lineHeight = config.fontSize * config.lineHeight;
    let currentX = 0;
    let currentY = 0;
    let lineIndex = 0;
    let lineWords: any[] = [];

    words.forEach((word, i) => {
        const wWidth = getWordWidth(word.text, config.fontSize, config.letterSpacing, config.fontFamily, config.fontWeight, config.fontStyle);
        let spacing = 0;
        if (i < words.length - 1) {
            const nextWord = words[i + 1];
            const currLast = word.text.slice(-1);
            const nextFirst = nextWord.text.charAt(0);
            if (isCJK(currLast) && isCJK(nextFirst)) {
                spacing = config.fontSize * (config.wordSpacing * 0.25);
            } else {
                spacing = config.fontSize * config.wordSpacing;
            }
        }
        if (currentX + wWidth > maxWidth * 0.95 && lineWords.length > 0) {
            currentX = 0;
            currentY -= lineHeight;
            lineIndex++;
            lineWords = [];
        }
        layout.push({ word, width: wWidth, spacing, x: currentX, y: currentY, lineIndex });
        currentX += wWidth + spacing;
        lineWords.push(word);
    });

    const lines: { width: number; startIndex: number; endIndex: number }[] = [];
    let currentLineStart = 0;
    let maxLineWidth = 0;
    for (let i = 0; i < layout.length; i++) {
        const item = layout[i];
        if (i === layout.length - 1 || item.lineIndex !== layout[i + 1].lineIndex) {
            const lineWidth = item.x + item.width;
            lines.push({ width: lineWidth, startIndex: currentLineStart, endIndex: i });
            if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
            currentLineStart = i + 1;
        }
    }

    lines.forEach(line => {
        let offsetX = 0;
        if (config.textAlign === 'center') offsetX = -line.width / 2;
        else if (config.textAlign === 'left') offsetX = -maxLineWidth / 2;
        else if (config.textAlign === 'right') offsetX = maxLineWidth / 2 - line.width;
        for (let i = line.startIndex; i <= line.endIndex; i++) layout[i].x += offsetX;
    });

    const centerOffsetY = (lineIndex * lineHeight) / 2;
    layout.forEach(item => { item.y += centerOffsetY; });
    return { layout, totalHeight: (lineIndex + 1) * lineHeight, maxLineWidth };
};

const StaticWordLine: React.FC<{
    text: string;
    words?: LyricWord[];
    config: ProjectConfig;
    fontUrl: string;
    maxWidth: number;
    color: string;
    opacity?: number;
    fontSizeMultiplier?: number;
}> = ({ text, words: propWords, config, fontUrl, maxWidth, color, opacity = 1, fontSizeMultiplier = 1 }) => {
    const words = useMemo(() => {
        if (propWords && propWords.length > 0) return propWords;
        return text.split(' ').map((t, i) => ({ id: i.toString(), text: t, startTime: 0, endTime: 0 }));
    }, [text, propWords]);

    const localConfig = useMemo(() => ({
        ...config,
        fontSize: config.fontSize * fontSizeMultiplier
    }), [config, fontSizeMultiplier]);

    const { layout } = useMemo(() => calculateLayout(words, localConfig, maxWidth), [words, localConfig, maxWidth]);

    return (
        <group>
            {layout.map((item, i) => {
                const { width, x, y, word } = item;
                const xPos = x + (width / 2);
                return (
                    <group key={i}>
                        {config.enableTextShadow && (
                            <Text
                                position={[xPos + config.textShadowOffset, y - config.textShadowOffset, -0.05]}
                                fontSize={localConfig.fontSize}
                                color={config.textShadowColor}
                                font={fontUrl}
                                fontStyle={config.fontStyle}
                                fontWeight={config.fontWeight}
                                anchorX="center"
                                anchorY="middle"
                                fillOpacity={config.textShadowOpacity * opacity}
                                letterSpacing={config.letterSpacing}
                            >
                                {word.text}
                            </Text>
                        )}
                        <Text
                            position={[xPos, y, 0]}
                            fontSize={localConfig.fontSize}
                            color={color}
                            font={fontUrl}
                            fontStyle={config.fontStyle}
                            fontWeight={config.fontWeight}
                            anchorX="center"
                            anchorY="middle"
                            fillOpacity={opacity}
                            outlineWidth={config.strokeWidth}
                            outlineColor={config.strokeColor}
                            letterSpacing={config.letterSpacing}
                        >
                            {word.text}
                        </Text>
                    </group>
                );
            })}
        </group>
    );
};

// Individual word component with smooth lerp-based animation
const KaraokeWord: React.FC<{
    word: LyricWord;
    xPos: number;
    y: number;
    currentTime: number;
    config: ProjectConfig;
    fontUrl: string;
    index: number;
}> = ({ word, xPos, y, currentTime, config, fontUrl, index }) => {
    const groupRef = useRef<THREE.Group>(null);
    const textRef = useRef<any>(null);
    const shadowRef = useRef<any>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Smooth animation state refs
    const animState = useRef({
        scale: 1.0,
        opacity: 0.5,
        yOffset: 0,
        emissiveInt: 0,
        zPos: 0,
        colorR: 0, colorG: 0, colorB: 0,
        initialized: false,
    });

    const primaryColorObj = useMemo(() => new THREE.Color(config.primaryColor), [config.primaryColor]);
    const secondaryColorObj = useMemo(() => new THREE.Color(config.secondaryColor), [config.secondaryColor]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const st = animState.current;

        const isActive = currentTime >= word.startTime && currentTime < word.endTime;
        const isPast = currentTime >= word.endTime;
        const isFuture = currentTime < word.startTime;

        // Compute target values
        let targetScale = 1.0;
        let targetOpacity = 0.5;
        let targetEmissive = 0;
        let targetYOffset = 0;
        let targetZ = 0;
        let targetColor = secondaryColorObj;

        if (isActive) {
            targetScale = 1.2;
            targetColor = primaryColorObj;
            targetOpacity = 1;
            targetEmissive = config.textGlowStrength;
            targetZ = 0.5;

            const progress = (currentTime - word.startTime) / Math.max(0.01, word.endTime - word.startTime);

            if (config.karaokeMode === 'Bounce') {
                targetYOffset = Math.sin(progress * Math.PI) * 0.6;
                targetScale = 1.0 + Math.sin(progress * Math.PI) * 0.3;
            } else if (config.karaokeMode === 'Word') {
                const popFade = Math.exp(-progress * 6);
                targetScale = 1.2 + popFade * 0.4;
            } else if (config.karaokeMode === 'Typewriter') {
                targetScale = 1.0;
            }
        } else if (isPast) {
            targetScale = 1.0;
            targetColor = primaryColorObj;
            targetOpacity = 1;
            targetEmissive = config.textGlowStrength * 0.3;
        }

        // Mode-specific overrides
        if (config.karaokeMode === 'Typewriter') {
            if (isFuture) {
                targetOpacity = 0;
                targetScale = 0.8;
            } else if (isActive) {
                targetOpacity = 1;
                targetScale = 1.0;
            }
        }

        if (config.karaokeMode === 'Reveal') {
            if (isFuture) {
                targetOpacity = 0;
                targetScale = 1.2;
            } else if (isActive) {
                const progress = (currentTime - word.startTime) / Math.max(0.01, word.endTime - word.startTime);
                targetOpacity = progress;
                targetColor = primaryColorObj;
                targetScale = 1.0 + (1 - progress) * 0.2;
            } else {
                targetOpacity = 1;
            }
        }

        // Lerp speed — clamped dt for stability
        const dt = Math.min(delta, 0.05);
        // Use faster lerp for snappier, more responsive feel
        const lerpSpeed = 18;
        const t = 1 - Math.exp(-lerpSpeed * dt);

        // Initialize on first frame to avoid lerp from zero
        if (!st.initialized) {
            st.scale = targetScale;
            st.opacity = targetOpacity;
            st.yOffset = targetYOffset;
            st.emissiveInt = targetEmissive;
            st.zPos = targetZ;
            st.colorR = targetColor.r;
            st.colorG = targetColor.g;
            st.colorB = targetColor.b;
            st.initialized = true;
        } else {
            st.scale += (targetScale - st.scale) * t;
            st.opacity += (targetOpacity - st.opacity) * t;
            st.yOffset += (targetYOffset - st.yOffset) * t;
            st.emissiveInt += (targetEmissive - st.emissiveInt) * t;
            st.zPos += (targetZ - st.zPos) * t;
            st.colorR += (targetColor.r - st.colorR) * t;
            st.colorG += (targetColor.g - st.colorG) * t;
            st.colorB += (targetColor.b - st.colorB) * t;
        }

        // Apply to group transform
        groupRef.current.position.y = y + st.yOffset;
        groupRef.current.position.z = st.zPos;
        groupRef.current.scale.set(st.scale, st.scale, 1);

        // Apply to text material
        if (textRef.current) {
            textRef.current.fillOpacity = st.opacity;
            textRef.current.color = new THREE.Color(st.colorR, st.colorG, st.colorB);
        }
        if (materialRef.current) {
            materialRef.current.color.setRGB(st.colorR, st.colorG, st.colorB);
            materialRef.current.emissive.setRGB(st.colorR, st.colorG, st.colorB);
            materialRef.current.emissiveIntensity = st.emissiveInt;
        }
        if (shadowRef.current) {
            shadowRef.current.fillOpacity = config.textShadowOpacity * Math.min(st.opacity / 0.5, 1);
        }
    });

    // For Typewriter mode: hide future words completely (render nothing)
    // But use opacity fade-in rather than unmounting for smoothness
    const shouldRender = config.karaokeMode !== 'Typewriter' || currentTime >= word.startTime - 0.15;

    if (!shouldRender) return null;

    return (
        <group ref={groupRef} position={[xPos, y, 0]}>
            {config.enableTextShadow && (
                <Text
                    ref={shadowRef}
                    position={[config.textShadowOffset, -config.textShadowOffset, -0.05]}
                    fontSize={config.fontSize}
                    color={config.textShadowColor}
                    font={fontUrl}
                    fontStyle={config.fontStyle}
                    fontWeight={config.fontWeight}
                    anchorX="center"
                    anchorY="middle"
                    fillOpacity={config.textShadowOpacity}
                    letterSpacing={config.letterSpacing}
                >
                    {word.text}
                </Text>
            )}
            <Text
                ref={textRef}
                position={[0, 0, 0]}
                fontSize={config.fontSize}
                color={config.secondaryColor}
                font={fontUrl}
                fontStyle={config.fontStyle}
                fontWeight={config.fontWeight}
                anchorX="center"
                anchorY="middle"
                fillOpacity={0.5}
                outlineWidth={config.strokeWidth}
                outlineColor={config.strokeColor}
                letterSpacing={config.letterSpacing}
            >
                {word.text}
                <meshStandardMaterial
                    ref={materialRef}
                    attach="material"
                    color={config.secondaryColor}
                    emissive={config.secondaryColor}
                    emissiveIntensity={0}
                    toneMapped={false}
                    roughness={1}
                    metalness={0}
                />
            </Text>
        </group>
    );
};

const KaraokeWordLine: React.FC<{
    words: LyricWord[];
    currentTime: number;
    config: ProjectConfig;
    fontUrl: string;
    maxWidth: number;
}> = ({ words, currentTime, config, fontUrl, maxWidth }) => {
    if (!words || !Array.isArray(words) || words.length === 0) return null;
    const { layout } = useMemo(() => calculateLayout(words, config, maxWidth), [words, config, maxWidth]);

    return (
        <group>
            {layout.map((item, i) => {
                const { word, width, x, y } = item;
                const xPos = x + (width / 2);

                return (
                    <KaraokeWord
                        key={word.id || i}
                        word={word}
                        xPos={xPos}
                        y={y}
                        currentTime={currentTime}
                        config={config}
                        fontUrl={fontUrl}
                        index={i}
                    />
                );
            })}
        </group>
    );
};

const KaraokeSliderLine: React.FC<{
    words: LyricWord[];
    currentTime: number;
    config: ProjectConfig;
    fontUrl: string;
    maxWidth: number;
    audioRef: React.RefObject<HTMLVideoElement | null>;
}> = ({ words, currentTime, config, fontUrl, maxWidth, audioRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const activeIndexRef = useRef(-1);
    const activeLineIndexRef = useRef(-1);

    // Create a pool of 20 planes to handle multi-line lyrical blocks wrapping
    // This avoids changing `clippingPlanes` array length, preventing shader recompilation flashes.
    const clipPlanes = useMemo(() => {
        return Array.from({ length: 20 }).map(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), -9999));
    }, []);

    // Always call hooks unconditionally (React rules of hooks)
    const layout = useMemo(() => {
        if (!words || !Array.isArray(words) || words.length === 0) return [];
        return calculateLayout(words, config, maxWidth).layout;
    }, [words, config, maxWidth]);

    // Reset clip state when layout changes (new lyric line enters)
    // This prevents the stale clip plane from the previous lyric causing a full-highlight flash
    useEffect(() => {
        activeIndexRef.current = -1;
        activeLineIndexRef.current = -1;
        clipPlanes.forEach(plane => plane.set(new THREE.Vector3(-1, 0, 0), -9999));
    }, [layout, clipPlanes]);

    useFrame(() => {
        if (!groupRef.current || layout.length === 0) return;
        const now = (audioRef && audioRef.current && !audioRef.current.paused) ? audioRef.current.currentTime : currentTime;

        // Find active word index
        let newActiveIndex = -1;
        for (let i = 0; i < layout.length; i++) {
            const w = layout[i].word;
            if (now >= w.startTime && now <= w.endTime) {
                newActiveIndex = i;
                break;
            } else if (now < w.startTime) {
                // In a gap before this word: stay on the previous (completed) word
                newActiveIndex = i === 0 ? -1 : i - 1;
                break;
            }
        }
        // Past all words
        if (newActiveIndex === -1 && layout.length > 0 && now > layout[layout.length - 1].word.endTime) {
            newActiveIndex = layout.length;
        }

        // Determine active line index
        let newActiveLineIndex: number;
        if (newActiveIndex >= 0 && newActiveIndex < layout.length) {
            newActiveLineIndex = layout[newActiveIndex].lineIndex;
        } else if (newActiveIndex >= layout.length) {
            newActiveLineIndex = layout[layout.length - 1].lineIndex;
        } else {
            newActiveLineIndex = -1;
        }

        activeIndexRef.current = newActiveIndex;
        activeLineIndexRef.current = newActiveLineIndex;

        // Calculate clip plane X position for the currently active line
        let smoothActiveX: number;
        if (newActiveIndex === -1) {
            // Before any word: clip before all text
            smoothActiveX = layout[0].x - 1;
        } else if (newActiveIndex >= layout.length) {
            // Past all words: reveal everything
            smoothActiveX = layout[layout.length - 1].x + layout[layout.length - 1].width + 10;
        } else {
            const item = layout[newActiveIndex];
            if (now >= item.word.startTime && now <= item.word.endTime) {
                // Within a word: smoothly interpolate across the word width
                const progress = (now - item.word.startTime) / Math.max(0.01, item.word.endTime - item.word.startTime);
                smoothActiveX = item.x + (progress * (item.width + (item.spacing * 0.5)));
            } else {
                // Word has ended (in a gap after it): hold at end of the word
                smoothActiveX = item.x + item.width + item.spacing * 0.5;
            }
        }

        // Apply clip plane to WORLD space for each line plane independently
        clipPlanes.forEach((plane, i) => {
            let xPos = 0;
            if (i < newActiveLineIndex) {
                xPos = 9999; // Past line: fully visible
            } else if (i > newActiveLineIndex) {
                xPos = -9999; // Future line: fully hidden
            } else {
                xPos = smoothActiveX; // Current sweeping line
            }

            const targetPoint = new THREE.Vector3(xPos, 0, 0);
            targetPoint.applyMatrix4(groupRef.current.matrixWorld);
            const targetNormal = new THREE.Vector3(-1, 0, 0);
            targetNormal.transformDirection(groupRef.current.matrixWorld).normalize();
            plane.setFromNormalAndCoplanarPoint(targetNormal, targetPoint);
        });
    });

    if (!words || !Array.isArray(words) || words.length === 0 || layout.length === 0) return null;

    const renderWords = (isHighlight: boolean, isShadow: boolean = false) => (
        <group>
            {layout.map((item, i) => {
                const { word, width, x, y, lineIndex } = item;
                const xPos = x + (width / 2);

                // Do NOT unmount words dynamically, let the clipping plane hide them if needed!
                const clipPlaneForLine = clipPlanes[lineIndex % 20];
                const appliedClipping = isHighlight ? [clipPlaneForLine] : null;

                if (isShadow) {
                    return (
                        <Text
                            key={`sh-${i}`}
                            position={[xPos + config.textShadowOffset, y - config.textShadowOffset, -0.05]}
                            fontSize={config.fontSize}
                            color={config.textShadowColor}
                            font={fontUrl}
                            anchorX="center"
                            anchorY="middle"
                            letterSpacing={config.letterSpacing}
                            fillOpacity={config.textShadowOpacity}
                        >{word.text}</Text>
                    );
                }

                return (
                    <Text
                        key={i}
                        position={[xPos, y, isHighlight ? 0.02 : 0]}
                        fontSize={config.fontSize}
                        color={isHighlight ? config.primaryColor : config.secondaryColor}
                        font={fontUrl}
                        fontStyle={config.fontStyle}
                        fontWeight={config.fontWeight}
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={config.strokeWidth}
                        outlineColor={config.strokeColor}
                        letterSpacing={config.letterSpacing}
                        fillOpacity={isHighlight ? 1 : 0.5}
                    >
                        {word.text}
                        <meshStandardMaterial
                            attach="material"
                            color={isHighlight ? config.primaryColor : config.secondaryColor}
                            emissive={isHighlight ? config.primaryColor : new THREE.Color(0, 0, 0)}
                            emissiveIntensity={isHighlight ? config.textGlowStrength : 0}
                            toneMapped={false}
                            clippingPlanes={appliedClipping}
                            roughness={1}
                            metalness={0}
                        />
                    </Text>
                );
            })}
        </group>
    );

    return (
        <group ref={groupRef}>
            {config.enableTextShadow && renderWords(false, true)}
            {renderWords(false)}
            {renderWords(true)}
        </group>
    );
};

// === MEMOIZED EFFECTS COMPONENT ===
// Separates effect rendering to prevent Vector2 prop instability from recreating effects every frame

const MemoizedEffects: React.FC<{ config: ProjectConfig }> = React.memo(({ config }) => {
    const pp = config.postProcessing;

    // Memoize Vector2 values to prevent GlitchEffect from being recreated every frame
    const glitchDelay = useMemo(() => new THREE.Vector2(0.5, 2.0), []);
    const glitchDuration = useMemo(() => new THREE.Vector2(0.3, 1.0), []);
    const glitchStrength = useMemo(
        () => new THREE.Vector2(pp.glitchStrength * 0.3, pp.glitchStrength),
        [pp.glitchStrength]
    );
    const chromaticOffset = useMemo(
        () => new THREE.Vector2(pp.chromaticAberrationOffset, pp.chromaticAberrationOffset),
        [pp.chromaticAberrationOffset]
    );

    // Build a key based on which effects are enabled (triggers remount only on toggle)
    const enableKey = `${pp.enableBloom}-${pp.enableGlitch}-${pp.enableNoise}-${pp.enableChromaticAberration}-${pp.enableVignette}-${pp.enableScanline}-${pp.enablePixelation}-${pp.enableColorShift}-${pp.enableSepia}-${pp.enableDotScreen}-${pp.enableGrid}`;

    return (
        <EffectComposer key={enableKey} enableNormalPass={false}>
            {pp.enableBloom && <Bloom intensity={pp.bloomIntensity} luminanceThreshold={0.2} luminanceSmoothing={0.9} />}
            {pp.enableGlitch && (
                <Glitch
                    delay={glitchDelay}
                    duration={glitchDuration}
                    strength={glitchStrength}
                    mode={GlitchMode.SPORADIC}
                />
            )}
            {pp.enableNoise && <Noise opacity={pp.noiseOpacity} />}
            {pp.enableChromaticAberration && (
                <ChromaticAberration
                    offset={chromaticOffset}
                    radialModulation={false}
                    modulationOffset={0}
                />
            )}
            {pp.enableVignette && <Vignette eskil={false} offset={0.5} darkness={pp.vignetteIntensity} />}
            {pp.enableScanline && <Scanline opacity={pp.scanlineOpacity} density={pp.scanlineDensity} />}
            {pp.enablePixelation && <Pixelation granularity={pp.pixelGranularity} />}
            {pp.enableColorShift && <HueSaturation hue={pp.colorShiftHue * (Math.PI / 180)} saturation={0} />}
            {pp.enableSepia && <Sepia intensity={pp.sepiaIntensity} />}
            {pp.enableDotScreen && <DotScreen scale={pp.dotScale} angle={Math.PI * 0.25} />}
            {pp.enableGrid && <Grid scale={pp.gridScale} lineWidth={0.1} />}
        </EffectComposer>
    );
});

// === MAIN SCENE COMPONENT ===

const LyricScene: React.FC<LyricSceneProps> = ({ currentTime, lyrics, config, analyser, audioRef, onConfigChange }) => {
    const { viewport, camera, gl } = useThree();

    // Enable local clipping for the Slider style
    useEffect(() => {
        gl.localClippingEnabled = true;
        return () => { gl.localClippingEnabled = false; };
    }, [gl]);

    const groupRef = useRef<THREE.Group>(null);
    const orbitRef = useRef<any>(null);
    const analyserDataRef = useRef(new Uint8Array(32));
    const mousePos = useRef({ x: 0, y: 0 });
    const isChangingZoomRef = useRef(false);

    const FALLBACK_FONT = 'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff';

    // Direct TTF URLs for known fonts (troika-three-text doesn't support woff2,
    // and browser fetch() always gets woff2 from Google Fonts CSS API)
    const KNOWN_FONT_TTF_URLS: Record<string, string> = {
        'Outfit': 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1O4a0Fg.ttf',
        'Syncopate': 'https://fonts.gstatic.com/s/syncopate/v24/pe0sMIuPIYBCpEV5eFdCBfe6.ttf',
        'Cinzel': 'https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnfY3lCA.ttf',
        'VT323': 'https://fonts.gstatic.com/s/vt323/v18/pxiKyp0ihIEF2isfFJA.ttf',
        'Quicksand': 'https://fonts.gstatic.com/s/quicksand/v37/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkP8o58a-xw.ttf',
        'Space Grotesk': 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUXskPMU.ttf',
        'Caveat': 'https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9eIWpZA.ttf',
        'Orbitron': 'https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWg2.ttf',
        'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.ttf',
        'Bebas Neue': 'https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhzg.ttf',
        'Dancing Script': 'https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup5.ttf',
        'Press Start 2P': 'https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nVivY.ttf',
        'Poppins': 'https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfedw.ttf',
        'Playfair Display': 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.ttf',
        'Rajdhani': 'https://fonts.gstatic.com/s/rajdhani/v17/LDIxapCSOBg7S-QT7p4HM-M.ttf',
        'Permanent Marker': 'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Ceg.ttf',
    };

    const [fontUrl, setFontUrl] = useState<string>(FALLBACK_FONT);

    useEffect(() => {
        if (config.fontFamily === 'Custom' && config.customFontUrl) {
            setFontUrl(config.customFontUrl);
            return;
        }

        const fontName = config.fontFamily || 'sans-serif';
        const isGeneric = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].includes(fontName.toLowerCase());

        if (isGeneric) {
            setFontUrl(FALLBACK_FONT);
            return;
        }

        // Fast path: use known TTF URL (avoids woff2 issue entirely)
        const knownUrl = KNOWN_FONT_TTF_URLS[fontName.trim()];
        if (knownUrl) {
            setFontUrl(knownUrl);
            return;
        }

        // Dynamic font: inject a <link> stylesheet to avoid CORS issues in production.
        // <link rel="stylesheet"> is not subject to CORS restrictions like fetch() is.
        let isMounted = true;
        const familyStr = fontName.trim().replace(/\s+/g, '+');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // Use CSS API v1 without specifying woff2 — the browser will get an appropriate format
        link.href = `https://fonts.googleapis.com/css?family=${familyStr}&display=swap`;
        link.crossOrigin = 'anonymous';

        const extractFontUrl = () => {
            if (!isMounted) return;
            try {
                // Search through all stylesheets for the Google Fonts @font-face rules
                for (let i = 0; i < document.styleSheets.length; i++) {
                    const sheet = document.styleSheets[i];
                    if (!sheet.href || !sheet.href.includes('fonts.googleapis.com')) continue;
                    try {
                        const rules = sheet.cssRules || sheet.rules;
                        for (let j = 0; j < rules.length; j++) {
                            const rule = rules[j];
                            if (rule instanceof CSSFontFaceRule) {
                                const src = rule.style.getPropertyValue('src');
                                // Look for .woff (not .woff2) or .ttf URLs
                                const woffMatch = src.match(/url\(["']?(https:\/\/[^"')]+\.woff)["']?\)/);
                                const ttfMatch = src.match(/url\(["']?(https:\/\/[^"')]+\.ttf)["']?\)/);
                                const fontMatch = woffMatch || ttfMatch;
                                if (fontMatch && fontMatch[1] && isMounted) {
                                    setFontUrl(fontMatch[1]);
                                    return;
                                }
                            }
                        }
                    } catch (_e) {
                        // CSSOM access can fail cross-origin, ignore and continue
                    }
                }
                // If CSSOM parsing didn't find a compatible format, try direct TTF URL construction
                // Google Fonts gstatic URLs follow predictable patterns
                if (isMounted) {
                    console.warn(`Font "${fontName}" — could not extract URL from CSSOM; using fallback for 3D text.`);
                    setFontUrl(FALLBACK_FONT);
                }
            } catch (err) {
                if (isMounted) setFontUrl(FALLBACK_FONT);
            }
        };

        link.onload = () => {
            // Small delay to let the browser fully parse the stylesheet rules
            setTimeout(extractFontUrl, 100);
        };
        link.onerror = () => {
            if (isMounted) {
                console.warn(`Could not load Google Fonts stylesheet for "${fontName}"; using fallback.`);
                setFontUrl(FALLBACK_FONT);
            }
        };

        document.head.appendChild(link);

        return () => {
            isMounted = false;
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, [config.fontFamily, config.customFontUrl]);

    // Camera cut state
    const cutState = useRef({
        lastCut: 0,
        targetOffset: new THREE.Vector3(0, 0, 0),
        targetZoom: 1
    });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = {
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: -(e.clientY / window.innerHeight) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const targetZoomRef = useRef(config.cameraZoom || 5);

    // Keep ref in sync when UI slider changes
    useEffect(() => {
        targetZoomRef.current = config.cameraZoom || 5;
    }, [config.cameraZoom]);

    // Manual wheel zoom when OrbitControls is off
    useEffect(() => {
        if (config.enableDragRotate) return;

        let updateTimeout: NodeJS.Timeout;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const sensitivity = 0.005;
            targetZoomRef.current += e.deltaY * sensitivity;
            targetZoomRef.current = THREE.MathUtils.clamp(targetZoomRef.current, 1, 30);

            // Debounce state update so UI slider syncs without grinding React
            if (onConfigChange) {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    onConfigChange({ cameraZoom: Math.round(targetZoomRef.current * 10) / 10 });
                }, 100);
            }
        };

        const canvasEl = gl.domElement;
        canvasEl.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvasEl.removeEventListener('wheel', handleWheel);
            clearTimeout(updateTimeout);
        }
    }, [gl, config.enableDragRotate, onConfigChange]);

    useFrame((state) => {
        if (!analyser.current) return;
        analyser.current.getByteFrequencyData(analyserDataRef.current);
        const bass = analyserDataRef.current[0] / 255;
        const avg = Array.from(analyserDataRef.current).reduce((a, b) => a + b, 0) / analyserDataRef.current.length / 255;

        // Visualizer / Lyric scaling
        if (groupRef.current) {
            const pulse = 1 + (bass * config.visualizerSettings.bassIntensity * 0.1);
            groupRef.current.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.1);
        }

        // Camera mode logic
        if (!config.enableDragRotate) {
            const time = state.clock.elapsedTime;
            const zoomBase = targetZoomRef.current;
            let targetX = 0;
            let targetY = 0;
            let targetZ = zoomBase;
            const speed = config.animationSpeed || 1;
            const isPortrait = config.aspectRatio < 1;

            switch (config.cameraMode) {
                case 'Cinematic':
                    targetX = Math.sin(time * 0.4 * speed) * (isPortrait ? 2 : 3);
                    targetY = Math.cos(time * 0.3 * speed) * (isPortrait ? 1.5 : 2);
                    targetZ = zoomBase + Math.sin(time * 0.2 * speed) * 1.5;
                    break;
                case 'Orbit': {
                    const radius = Math.max(zoomBase, 3);
                    targetX = Math.sin(time * 0.4 * speed) * radius;
                    const orbitZ = Math.cos(time * 0.4 * speed) * radius;
                    targetY = Math.sin(time * 0.2 * speed) * 2;
                    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
                    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, orbitZ, 0.05);
                    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
                    state.camera.lookAt(0, 0, 0);
                    return;
                }
                case 'Reactive':
                    if (analyser.current) {
                        const kick = bass * bass * bass;
                        targetZ = Math.max(2, zoomBase - (kick * 2));
                    }
                    break;
                case 'ZoomIn': {
                    const zoomRange = 4;
                    const cycle = (time * speed * 0.5) % 1;
                    targetZ = zoomBase + (zoomRange / 2) - (cycle * zoomRange);
                    targetX = Math.sin(time * 0.1 * speed);
                    break;
                }
                case 'ZoomOut': {
                    const zoomRange = 4;
                    const cycle = (time * speed * 0.5) % 1;
                    targetZ = zoomBase - (zoomRange / 2) + (cycle * zoomRange);
                    targetX = Math.sin(time * 0.1 * speed);
                    break;
                }
                case 'PanHorizontal': {
                    const width = isPortrait ? 4 : 8;
                    targetX = Math.sin(time * 0.6 * speed) * width;
                    targetZ = zoomBase + Math.cos(time * 0.4 * speed);
                    break;
                }
                case 'PanVertical': {
                    const height = isPortrait ? 8 : 4;
                    targetY = Math.sin(time * 0.6 * speed) * height;
                    targetZ = zoomBase + Math.cos(time * 0.4 * speed);
                    break;
                }
                case 'Shake': {
                    const shakeX = (Math.sin(time * 8.5 * speed) + Math.cos(time * 15.2 * speed)) * 0.3;
                    const shakeY = (Math.cos(time * 7.2 * speed) + Math.sin(time * 12.1 * speed)) * 0.3;
                    const shakeZ = Math.sin(time * 4.3 * speed) * 0.5;
                    targetX = shakeX;
                    targetY = shakeY;
                    targetZ = zoomBase + shakeZ;
                    break;
                }
                case 'Spiral': {
                    const radius = 4;
                    targetX = Math.cos(time * 0.5 * speed) * radius;
                    targetY = Math.sin(time * 0.5 * speed) * radius * 0.5;
                    targetZ = zoomBase + Math.sin(time * 0.5 * speed) * 2;
                    break;
                }
                case 'Breathe':
                    targetZ = zoomBase + Math.sin(time * 1.5 * speed) * 0.5 + Math.sin(time * 0.5 * speed) * 0.5;
                    break;
                case 'Dolly':
                    targetZ = zoomBase + Math.sin(time * 0.4 * speed) * 1.0;
                    targetX = Math.cos(time * 0.3 * speed) * 0.5;
                    break;
                case 'Swing':
                    targetX = Math.sin(time * 0.8 * speed) * 1.0;
                    targetY = Math.cos(time * 0.6 * speed) * 0.25;
                    break;
                case 'RandomCut': {
                    const cutInterval = 3 / speed;
                    if (time - cutState.current.lastCut > cutInterval) {
                        cutState.current.lastCut = time;
                        const rX = (Math.random() - 0.5) * (isPortrait ? 4 : 8);
                        const rY = (Math.random() - 0.5) * 4;
                        const rZ_mult = 0.7 + Math.random() * 0.9; // Zoom multiplier (0.7x to 1.6x)
                        cutState.current.targetOffset.set(rX, rY, rZ_mult);
                    }
                    targetX = cutState.current.targetOffset.x;
                    targetY = cutState.current.targetOffset.y;
                    targetZ = zoomBase * cutState.current.targetOffset.z;

                    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.1);
                    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.1);
                    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);
                    state.camera.lookAt(0, 0, 0);
                    return;
                }
                case 'Chaotic': {
                    targetX = Math.sin(time * 2.5 * speed) * 2 + Math.cos(time * 3.7 * speed);
                    targetY = Math.cos(time * 2.2 * speed) * 1.5 + Math.sin(time * 4.1 * speed);
                    targetZ = zoomBase + Math.sin(time * 3 * speed) * 2;
                    break;
                }
                case 'Static':
                default:
                    if (config.mouseTracking && !config.enableDragRotate) {
                        const trackingIntensity = isPortrait ? 1.0 : 2.5;
                        targetX = mousePos.current.x * trackingIntensity;
                        targetY = mousePos.current.y * trackingIntensity;
                    }
                    targetZ = zoomBase;
                    break;
            }

            // Global Movement (independent of mode)
            if (config.enableMovement) {
                targetX += Math.sin(time * 0.3 * speed) * 0.5;
                targetY += Math.cos(time * 0.4 * speed) * 0.3;
            }

            if (!isChangingZoomRef.current) {
                state.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05);
            }

            if (config.cameraMode === 'Spiral') {
                state.camera.lookAt(0, 0, 0);
                state.camera.rotateZ(Math.sin(time * 0.5 * speed) * 0.1);
            } else if (config.cameraMode === 'Swing') {
                state.camera.lookAt(0, 0, 0);
                state.camera.rotateZ(Math.sin(time * 0.4 * speed) * 0.06);
            } else {
                state.camera.lookAt(0, 0, 0);
            }
        }
    });



    const handleOrbitChange = () => {
        if (orbitRef.current && onConfigChange) {
            const distance = camera.position.length();
            // Round to 1 decimal place to avoid excessive updates
            const roundedDistance = Math.round(distance * 10) / 10;
            if (roundedDistance !== config.cameraZoom) {
                onConfigChange({ cameraZoom: roundedDistance });
            }
        }
    };

    const isPortrait = config.aspectRatio < 1;
    const maxWidthCurrent = isPortrait ? 6 : 8;
    const maxWidthSide = isPortrait ? 7 : 10;

    const currentIndex = lyrics.findIndex(l => currentTime >= l.startTime && currentTime <= l.endTime);
    const currentLyric = currentIndex !== -1 ? lyrics[currentIndex] : null;
    const prevLyric = lyrics[currentIndex - 1] || null;
    const nextLyric = lyrics[currentIndex + 1] || null;

    return (
        <>
            {config.enableDragRotate && (
                <OrbitControls
                    ref={orbitRef}
                    makeDefault
                    enableZoom={true}
                    enablePan={true}
                    enableRotate={true}
                    onChange={handleOrbitChange}
                    onStart={() => { isChangingZoomRef.current = true; }}
                    onEnd={() => { isChangingZoomRef.current = false; }}
                />
            )}

            <BackgroundLayer config={config} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* Visualizers */}
            <group scale={config.visualizerSettings.scale}>
                {config.layers.stars && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
                {config.layers.particles && <Sparkles count={config.particleCount} scale={20} size={config.particleSize} speed={config.particleSpeed} color={config.primaryColor} opacity={config.particleOpacity} />}
                {config.layers.basicVisualizer && <BasicVisualizer analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.complexVisualizer && <ComplexVisualizer analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.linearSpectrum && <LinearSpectrum analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.liquidWave && <LiquidWave analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.retroGrid && <RetroGrid analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.lineWave && <LineWave analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.waveform && <Waveform analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.dnaHelix && <DNAHelix analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.circularWave && <CircularWave analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
                {config.layers.galaxySpiral && <GalaxySpiral analyser={analyser} color={config.primaryColor} secondaryColor={config.secondaryColor} settings={config.visualizerSettings} />}
            </group>

            {/* Lyrics Layer */}
            {config.layers.lyrics && (
                <group ref={groupRef} position={[0, config.lyricDisplay.verticalOffset || 0, 0]}>
                    <WavyGroup enabled={config.enableTextWave} frequency={config.textWaveFrequency} speed={config.textWaveSpeed}>
                        <Float speed={config.animationSpeed} rotationIntensity={0.1} floatIntensity={0.2}>
                            {config.lyricDisplay.showPrevious && prevLyric && (
                                <group position={[0, 1.5, -2]}>
                                    <StaticWordLine key={`prev-${currentIndex - 1}`} text={prevLyric.text} words={prevLyric.words} config={config} fontUrl={fontUrl} maxWidth={maxWidthSide} color={config.secondaryColor} opacity={0.3} fontSizeMultiplier={0.6} />
                                </group>
                            )}
                            {config.lyricDisplay.showCurrent && (
                                <group key={`current-${currentIndex}`}>
                                    {currentLyric && currentLyric.words && currentLyric.words.length > 0 && config.karaokeMode !== 'None' ? (
                                        config.karaokeMode === 'Slider' ? (
                                            <KaraokeSliderLine words={currentLyric.words} currentTime={currentTime} config={config} fontUrl={fontUrl} maxWidth={maxWidthCurrent} audioRef={audioRef} />
                                        ) : (
                                            <KaraokeWordLine words={currentLyric.words} currentTime={currentTime} config={config} fontUrl={fontUrl} maxWidth={maxWidthCurrent} />
                                        )
                                    ) : (
                                        <StaticWordLine text={currentLyric ? currentLyric.text : ""} words={currentLyric?.words} config={config} fontUrl={fontUrl} maxWidth={maxWidthCurrent} color={config.primaryColor} />
                                    )}
                                </group>
                            )}
                            {config.lyricDisplay.showNext && nextLyric && (
                                <group position={[0, -1.5, -2]}>
                                    <StaticWordLine key={`next-${currentIndex + 1}`} text={nextLyric.text} words={nextLyric.words} config={config} fontUrl={fontUrl} maxWidth={maxWidthSide} color={config.secondaryColor} opacity={0.3} fontSizeMultiplier={0.6} />
                                </group>
                            )}
                        </Float>
                    </WavyGroup>
                </group>
            )}

            {/* Memoize Vector2 props to prevent GlitchEffect from being recreated every frame */}
            <MemoizedEffects config={config} />
        </>
    );
};

export default LyricScene;