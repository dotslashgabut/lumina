import React, { useCallback, useRef } from 'react';
import { ProjectConfig, RESOLUTIONS, LayerConfig, PRESETS, CameraMode, BackgroundType, KaraokeMode, PostProcessingConfig } from '../types';
import { Type, Palette, Monitor, Upload, FileText, Music, Sparkles, Layers, Eye, EyeOff, Film, Type as TypeIcon, BarChart3, Waves, Grid, Star, Activity, MousePointer, Sliders, LayoutTemplate, Rotate3d, Video, Move, Zap as ZapIcon, ArrowUp, ArrowDown, Disc, Image as ImageIcon, Droplets, X, ZoomIn, ZoomOut, MoveHorizontal, Shuffle, Gauge, Clapperboard, Tornado, Vibrate, Wand2, Tv, Ghost, ChevronDown, ChevronRight, FolderOpen, Link, Trash2, Info, Keyboard, Grid2X2, Grid3X3, Loader, Download, XCircle, FileVideo } from 'lucide-react';
import { ExportProgress } from '../services/webcodecs-exporter';

interface ControlsProps {
    config: ProjectConfig;
    setConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
    onMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onLyricUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    mediaName: string | null;
    lyricName: string | null;
    isRecording: boolean;
    // MP4 Export
    isExporting: boolean;
    exportProgress: ExportProgress | null;
    exportDownloadUrl: string | null;
    onExportMP4: (fps: number, bitrate: number) => void;
    onCancelExport: () => void;
    hasMedia: boolean;
}

interface SliderControlProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    icon?: React.ElementType;
    formatValue?: (v: number) => string;
}

const SliderControl: React.FC<SliderControlProps> = ({ label, value, min, max, step, onChange, icon: Icon, formatValue = (v) => String(v) }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-2 font-medium">{Icon && <Icon size={12} className="text-neutral-500" />}{label}</span>
            <span className="font-mono text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">{formatValue(value)}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 rounded-full cursor-pointer"
        />
    </div>
);

interface ToggleControlProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    icon?: React.ElementType;
    disabled?: boolean;
    hint?: string;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ label, value, onChange, icon: Icon, disabled, hint }) => (
    <div className="flex items-center justify-between py-0.5">
        <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className={`transition-colors duration-200 ${value ? "text-green-400" : "text-neutral-600"}`} />}
            <span className="text-xs text-neutral-300 font-medium">{label}</span>
            {hint && <span className="text-[9px] text-neutral-600">{hint}</span>}
        </div>
        <button
            onClick={() => !disabled && onChange(!value)}
            disabled={disabled}
            className={`relative inline-flex h-[18px] w-8 items-center rounded-full transition-all duration-200 ${value ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-neutral-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${value ? 'translate-x-[14px]' : 'translate-x-[3px]'}`} />
        </button>
    </div>
);

interface ColorControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const ColorControl: React.FC<ColorControlProps> = ({ label, value, onChange }) => (
    <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800/80 hover:border-neutral-700 transition-colors">
        <label className="text-[10px] text-neutral-500 block mb-1.5 uppercase tracking-wider font-medium">{label}</label>
        <div className="flex items-center gap-2">
            <div className="relative">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-none p-0"
                />
                <div className="absolute inset-0 rounded-md ring-1 ring-white/10 pointer-events-none" />
            </div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider">{value.toUpperCase()}</span>
        </div>
    </div>
);

// Collapsible Section
interface SectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, children, defaultOpen = true, badge }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <section className="space-y-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between group cursor-pointer"
            >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 flex items-center gap-2 group-hover:text-neutral-300 transition-colors">
                    <Icon size={12} className="text-neutral-600 group-hover:text-green-500 transition-colors" />
                    {title}
                    {badge && (
                        <span className="text-[8px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-semibold tracking-normal">{badge}</span>
                    )}
                </h3>
                <ChevronDown
                    size={12}
                    className={`text-neutral-600 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
            </button>
            {isOpen && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </section>
    );
};

// FileDropZone component
interface FileDropZoneProps {
    accept: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.ElementType;
    label: string;
    fileName: string | null;
    placeholder: string;
    accentColor?: string;
    multiple?: boolean;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ accept, onChange, icon: Icon, label, fileName, placeholder, accentColor = 'green', multiple = false }) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    return (
        <div className="relative group">
            <input
                type="file"
                accept={accept}
                onChange={onChange}
                multiple={multiple}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onDragEnter={() => setIsDragOver(true)}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={() => setIsDragOver(false)}
            />
            <div className={`bg-neutral-900/60 group-hover:bg-neutral-800/80 transition-all duration-200 p-3 rounded-lg border flex items-center justify-between ${isDragOver ? 'border-green-500 bg-green-500/5 scale-[1.01]' : 'border-neutral-800/80 group-hover:border-neutral-700'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-2 rounded-md transition-colors ${fileName ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800/80 text-neutral-500 group-hover:text-green-400'}`}>
                        <Icon size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{label}</span>
                        <span className={`text-xs truncate max-w-[160px] ${fileName ? 'text-white font-medium' : 'text-neutral-600'}`}>
                            {fileName || placeholder}
                        </span>
                    </div>
                </div>
                {fileName && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
            </div>
        </div>
    );
};

const Controls: React.FC<ControlsProps> = ({
    config,
    setConfig,
    onMediaUpload,
    onLyricUpload,
    mediaName,
    lyricName,
    isRecording,
    isExporting,
    exportProgress,
    exportDownloadUrl,
    onExportMP4,
    onCancelExport,
    hasMedia,
}) => {
    const [exportFps, setExportFps] = React.useState(30);
    const [exportBitrate, setExportBitrate] = React.useState(8_000_000);
    const [localFont, setLocalFont] = React.useState(config.fontFamily === 'Custom' ? '' : config.fontFamily);
    const bgImageInputRef = useRef<HTMLInputElement>(null);
    const settingsInputRef = useRef<HTMLInputElement>(null);

    const handleExportSettings = useCallback(() => {
        const dataStr = JSON.stringify(config, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', 'lumina-settings.json');
        linkElement.click();
        URL.revokeObjectURL(url);
    }, [config]);

    const handleImportSettings = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const content = ev.target?.result as string;
                    const parsedConfig = JSON.parse(content) as Partial<ProjectConfig>;
                    setConfig(prev => ({ ...prev, ...parsedConfig }));
                } catch (err) {
                    console.error("Failed to parse settings JSON:", err);
                    alert("Invalid settings file. Please check the format.");
                }
            };
            reader.readAsText(file);
        }
        if (settingsInputRef.current) {
            settingsInputRef.current.value = '';
        }
    }, [setConfig]);

    // Sync local state when config changes (e.g. presets)
    React.useEffect(() => {
        if (config.fontFamily !== 'Custom') {
            setLocalFont(config.fontFamily);
        } else {
            setLocalFont('');
        }
    }, [config.fontFamily]);

    const handleChange = (key: keyof ProjectConfig, value: any) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handlePostProcessingChange = (key: keyof PostProcessingConfig, value: any) => {
        setConfig((prev) => ({
            ...prev,
            postProcessing: {
                ...prev.postProcessing,
                [key]: value
            }
        }));
    };

    const handleApplyFont = () => {
        const trimmedFont = localFont.trim();
        if (trimmedFont) {
            const isUrl = trimmedFont.startsWith('http://') || trimmedFont.startsWith('https://');
            setConfig(prev => ({
                ...prev,
                fontFamily: isUrl ? 'Custom' : trimmedFont,
                customFontUrl: isUrl ? trimmedFont : null
            }));
        }
    };

    const handleFontKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleApplyFont();
            (e.target as HTMLInputElement).blur();
        }
    };

    const handleLayerToggle = (key: keyof LayerConfig) => {
        setConfig((prev) => ({
            ...prev,
            layers: {
                ...prev.layers,
                [key]: !prev.layers[key]
            }
        }));
    }

    const handleLyricDisplayToggle = (key: keyof ProjectConfig['lyricDisplay']) => {
        setConfig(prev => ({
            ...prev,
            lyricDisplay: {
                ...prev.lyricDisplay,
                [key]: !prev.lyricDisplay[key]
            }
        }));
    };

    const handleResolutionChange = (key: string) => {
        const res = RESOLUTIONS[key as keyof typeof RESOLUTIONS];
        setConfig((prev) => ({
            ...prev,
            resolution: res,
            aspectRatio: res.width / res.height,
        }));
    };

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setConfig(prev => ({ ...prev, customFontUrl: url, fontFamily: 'Custom' }));
            setLocalFont('');
        }
    }

    const handleClearCustomFont = () => {
        setConfig(prev => ({
            ...prev,
            fontFamily: 'sans-serif',
            customFontUrl: null
        }));
        setLocalFont('sans-serif');
    };

    // === LOCAL IMAGE BROWSE FOR BACKGROUND ===
    const handleBgImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setConfig(prev => ({
                ...prev,
                backgroundType: 'Image' as BackgroundType,
                backgroundImageUrl: url,
            }));
        }
    }, [setConfig]);

    const handleRemoveBgImage = useCallback(() => {
        if (config.backgroundImageUrl && config.backgroundImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(config.backgroundImageUrl);
        }
        setConfig(prev => ({
            ...prev,
            backgroundImageUrl: null,
            backgroundType: 'Color' as BackgroundType,
        }));
    }, [config.backgroundImageUrl, setConfig]);

    // === LOCAL VIDEO BROWSE FOR BACKGROUND ===
    const handleBgVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Revoke previous blob URL if exists
            if (config.backgroundVideoUrl && config.backgroundVideoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(config.backgroundVideoUrl);
            }
            const url = URL.createObjectURL(file);
            setConfig(prev => ({
                ...prev,
                backgroundType: 'Video' as BackgroundType,
                backgroundVideoUrl: url,
            }));
        }
    }, [config.backgroundVideoUrl, setConfig]);

    const handleRemoveBgVideo = useCallback(() => {
        if (config.backgroundVideoUrl && config.backgroundVideoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(config.backgroundVideoUrl);
        }
        setConfig(prev => ({
            ...prev,
            backgroundVideoUrl: null,
            backgroundType: 'Color' as BackgroundType,
        }));
    }, [config.backgroundVideoUrl, setConfig]);

    const applyPreset = (presetName: string) => {
        const preset = PRESETS[presetName];
        if (preset) {
            setConfig(prev => ({
                ...prev,
                ...preset
            }));
        }
    };

    const CAMERA_MODES: { id: CameraMode; label: string; icon: React.ElementType }[] = [
        { id: 'Static', label: 'Static', icon: MousePointer },
        { id: 'Cinematic', label: 'Cinematic', icon: Film },
        { id: 'Orbit', label: 'Orbit', icon: Rotate3d },
        { id: 'Reactive', label: 'Reactive', icon: ZapIcon },
        { id: 'ZoomIn', label: 'Zoom In', icon: ZoomIn },
        { id: 'ZoomOut', label: 'Zoom Out', icon: ZoomOut },
        { id: 'PanHorizontal', label: 'Pan', icon: MoveHorizontal },
        { id: 'PanVertical', label: 'Vertical', icon: ArrowUp },
        { id: 'Dolly', label: 'Dolly', icon: Tv },
        { id: 'Breathe', label: 'Breathe', icon: Waves },
        { id: 'Swing', label: 'Swing', icon: Move },
        { id: 'Chaotic', label: 'Chaotic', icon: Shuffle },
        { id: 'RandomCut', label: 'Random Cut', icon: Clapperboard },
        { id: 'Shake', label: 'Handheld', icon: Vibrate },
        { id: 'Spiral', label: 'Spiral', icon: Tornado },
    ];

    return (
        <div className={`h-full overflow-y-auto bg-neutral-950 text-sm ${isRecording ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

            {/* Header */}
            <div className="sticky top-0 z-10 px-5 py-4 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-7 bg-linear-to-b from-green-400 to-green-600 rounded-full"></div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">Lumina</h2>
                            <p className="text-[9px] text-neutral-600 uppercase tracking-[0.2em] font-medium">Lyric Builder</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="kbd">Space</span>
                        <span className="text-[8px] text-neutral-600">Play</span>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-6">

                {/* Presets */}
                <Section title="Presets" icon={LayoutTemplate} defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-1.5">
                        {Object.keys(PRESETS).map(name => (
                            <button
                                key={name}
                                onClick={() => applyPreset(name)}
                                className="text-[11px] bg-neutral-900/60 border border-neutral-800/60 hover:bg-neutral-800/80 hover:border-green-500/40 text-neutral-300 hover:text-white py-2 px-3 rounded-lg transition-all duration-200 text-left truncate font-medium"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Settings Data */}
                <Section title="Settings Data" icon={FileText} defaultOpen={false}>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportSettings}
                            className="flex-1 flex items-center justify-center gap-2 bg-neutral-900/60 border border-neutral-800/60 hover:bg-neutral-800/80 hover:border-green-500/40 text-neutral-300 hover:text-white py-2 px-3 rounded-lg transition-all duration-200 text-[11px] font-medium"
                        >
                            <Download size={13} />
                            Export JSON
                        </button>
                        <button
                            onClick={() => settingsInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 bg-neutral-900/60 border border-neutral-800/60 hover:bg-neutral-800/80 hover:border-green-500/40 text-neutral-300 hover:text-white py-2 px-3 rounded-lg transition-all duration-200 text-[11px] font-medium"
                        >
                            <Upload size={13} />
                            Import JSON
                        </button>
                        <input
                            type="file"
                            ref={settingsInputRef}
                            onChange={handleImportSettings}
                            className="hidden"
                            accept=".json"
                        />
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Assets Section */}
                <Section title="Source Files" icon={Upload} defaultOpen={true}>
                    <div className="space-y-2">
                        <FileDropZone
                            accept="audio/*,video/*"
                            onChange={onMediaUpload}
                            icon={Music}
                            label="Audio / Video"
                            fileName={mediaName}
                            placeholder="Drop or browse..."
                            multiple={true}
                        />
                        <FileDropZone
                            accept=".srt,.lrc,.vtt,.ttml,.xml"
                            onChange={onLyricUpload}
                            icon={FileText}
                            label="Lyrics File"
                            fileName={lyricName}
                            placeholder=".srt / .lrc / .xml..."
                        />
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Background Settings */}
                <Section title="Background" icon={Palette} defaultOpen={true}>
                    {/* Background Type Picker */}
                    <div className="bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/60">
                        <div className="flex gap-1 flex-wrap">
                            {['Color', 'Gradient', 'Image', 'Video', 'Transparent'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => handleChange('backgroundType', type as BackgroundType)}
                                    className={`flex-1 min-w-[52px] py-1.5 rounded-md text-[9px] uppercase font-bold tracking-widest transition-all duration-200 border ${config.backgroundType === type
                                        ? 'bg-green-500/10 border-green-500/60 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                                        : 'bg-neutral-800/50 border-transparent text-neutral-500 hover:bg-neutral-700/50 hover:text-neutral-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {config.backgroundType === 'Color' && (
                        <ColorControl
                            label="Solid Color"
                            value={config.backgroundColor}
                            onChange={(v) => handleChange('backgroundColor', v)}
                        />
                    )}

                    {config.backgroundType === 'Gradient' && (
                        <div className="grid grid-cols-2 gap-2">
                            <ColorControl
                                label="Top"
                                value={config.backgroundGradientColor1}
                                onChange={(v) => handleChange('backgroundGradientColor1', v)}
                            />
                            <ColorControl
                                label="Bottom"
                                value={config.backgroundGradientColor2}
                                onChange={(v) => handleChange('backgroundGradientColor2', v)}
                            />
                        </div>
                    )}

                    {config.backgroundType === 'Image' && (
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/60 space-y-3">
                            {/* Image Preview */}
                            {config.backgroundImageUrl && (
                                <div className="relative group/preview">
                                    <div
                                        className="bg-image-preview w-full h-24 rounded-md"
                                        style={{ backgroundImage: `url(${config.backgroundImageUrl})` }}
                                    />
                                    <button
                                        onClick={handleRemoveBgImage}
                                        className="absolute top-1.5 right-1.5 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover/preview:opacity-100 transition-all duration-200 backdrop-blur-sm"
                                        title="Remove background image"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Browse Local Image Button */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <FolderOpen size={10} />
                                    Local Image
                                </label>
                                <div className="relative group/browse">
                                    <input
                                        ref={bgImageInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml"
                                        onChange={handleBgImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex items-center gap-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-green-500/40 rounded-md p-2.5 transition-all duration-200 cursor-pointer">
                                        <ImageIcon size={14} className="text-neutral-500 group-hover/browse:text-green-400 transition-colors" />
                                        <span className="text-[11px] text-neutral-400 group-hover/browse:text-neutral-200 transition-colors font-medium">
                                            Browse for image...
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Or URL Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <Link size={10} />
                                    Image URL
                                </label>
                                <input
                                    type="text"
                                    value={(config.backgroundImageUrl && !config.backgroundImageUrl.startsWith('blob:')) ? config.backgroundImageUrl : ''}
                                    onChange={(e) => handleChange('backgroundImageUrl', e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 rounded-md px-3 py-2 transition-all placeholder:text-neutral-700 font-mono"
                                />
                            </div>

                            {/* Image Controls */}
                            {config.backgroundImageUrl && (
                                <div className="space-y-3 pt-2 border-t border-neutral-800/40">
                                    <SliderControl
                                        label="Brightness"
                                        value={config.backgroundVideoBrightness}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        onChange={(v) => handleChange('backgroundVideoBrightness', v)}
                                        formatValue={(v) => `${Math.round(v * 100)}%`}
                                    />
                                    <SliderControl
                                        label="Scale"
                                        value={config.backgroundMediaScale}
                                        min={0.1}
                                        max={3}
                                        step={0.05}
                                        onChange={(v) => handleChange('backgroundMediaScale', v)}
                                        formatValue={(v) => `${Math.round(v * 100)}%`}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <SliderControl
                                            label="Pos X"
                                            value={config.backgroundMediaOffsetX}
                                            min={-10}
                                            max={10}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundMediaOffsetX', v)}
                                        />
                                        <SliderControl
                                            label="Pos Y"
                                            value={config.backgroundMediaOffsetY}
                                            min={-10}
                                            max={10}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundMediaOffsetY', v)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 pt-1">
                                        <SliderControl
                                            label="Grayscale"
                                            value={config.backgroundGrayscale}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundGrayscale', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                        <SliderControl
                                            label="Sepia"
                                            value={config.backgroundSepia}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundSepia', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                        <SliderControl
                                            label="Invert"
                                            value={config.backgroundInvert}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundInvert', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {config.backgroundType === 'Video' && (
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/60 space-y-3">
                            {/* Video file status */}
                            {config.backgroundVideoUrl && (
                                <div className="flex items-center justify-between bg-neutral-800/40 p-2.5 rounded-md border border-neutral-700/40">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                                        <span className="text-[11px] text-green-300 font-medium truncate">Video loaded</span>
                                    </div>
                                    <button
                                        onClick={handleRemoveBgVideo}
                                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors shrink-0"
                                        title="Remove video"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Browse Local Video */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <FolderOpen size={10} />
                                    Local Video
                                </label>
                                <div className="relative group/browse">
                                    <input
                                        type="file"
                                        accept="video/mp4,video/webm,video/ogg,video/mov,video/*"
                                        onChange={handleBgVideoUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex items-center gap-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-green-500/40 rounded-md p-2.5 transition-all duration-200 cursor-pointer">
                                        <Film size={14} className="text-neutral-500 group-hover/browse:text-green-400 transition-colors" />
                                        <span className="text-[11px] text-neutral-400 group-hover/browse:text-neutral-200 transition-colors font-medium">
                                            {config.backgroundVideoUrl ? 'Change video...' : 'Browse for video...'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Or URL Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                                    <Link size={10} />
                                    Video URL
                                </label>
                                <input
                                    type="text"
                                    value={(config.backgroundVideoUrl && !config.backgroundVideoUrl.startsWith('blob:')) ? config.backgroundVideoUrl : ''}
                                    onChange={(e) => handleChange('backgroundVideoUrl', e.target.value)}
                                    placeholder="https://...video.mp4"
                                    className="w-full bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-green-500/40 focus:border-green-500/40 rounded-md px-3 py-2 transition-all placeholder:text-neutral-700 font-mono"
                                />
                            </div>

                            {/* Video controls */}
                            {config.backgroundVideoUrl && (
                                <div className="space-y-3 pt-2 border-t border-neutral-800/40">
                                    <SliderControl
                                        label="Brightness"
                                        value={config.backgroundVideoBrightness}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        onChange={(v) => handleChange('backgroundVideoBrightness', v)}
                                        formatValue={(v) => `${Math.round(v * 100)}%`}
                                    />
                                    <SliderControl
                                        label="Scale"
                                        value={config.backgroundMediaScale}
                                        min={0.1}
                                        max={3}
                                        step={0.05}
                                        onChange={(v) => handleChange('backgroundMediaScale', v)}
                                        formatValue={(v) => `${Math.round(v * 100)}%`}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <SliderControl
                                            label="Pos X"
                                            value={config.backgroundMediaOffsetX}
                                            min={-10}
                                            max={10}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundMediaOffsetX', v)}
                                        />
                                        <SliderControl
                                            label="Pos Y"
                                            value={config.backgroundMediaOffsetY}
                                            min={-10}
                                            max={10}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundMediaOffsetY', v)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 pt-1">
                                        <SliderControl
                                            label="Grayscale"
                                            value={config.backgroundGrayscale}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundGrayscale', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                        <SliderControl
                                            label="Sepia"
                                            value={config.backgroundSepia}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundSepia', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                        <SliderControl
                                            label="Invert"
                                            value={config.backgroundInvert}
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            onChange={(v) => handleChange('backgroundInvert', v)}
                                            formatValue={(v) => v > 0 ? `${Math.round(v * 100)}%` : 'Off'}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {config.backgroundType === 'Transparent' && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-600 bg-neutral-900/30 p-2.5 rounded-lg border border-neutral-800/40">
                            <Info size={12} />
                            <span>Canvas will render with alpha transparency</span>
                        </div>
                    )}
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Layers / Composition */}
                <Section title="Composition" icon={Layers} defaultOpen={true}>
                    <div className="space-y-0.5 bg-neutral-900/40 rounded-lg p-1 border border-neutral-800/50">
                        {[
                            { id: 'lyrics', label: 'Lyrics', icon: TypeIcon },
                            { id: 'waveform', label: 'Waveform', icon: Waves },
                            { id: 'lineWave', label: 'Line Wave', icon: Activity },
                            { id: 'linearSpectrum', label: 'Linear Spectrum', icon: BarChart3 },
                            { id: 'basicVisualizer', label: 'Circular Spectrum', icon: Music },
                            { id: 'circularWave', label: 'Circular Wave', icon: Disc },
                            { id: 'complexVisualizer', label: 'Bass Reactor', icon: ZapIcon },
                            { id: 'liquidWave', label: 'Liquid Surface', icon: Droplets },
                            { id: 'retroGrid', label: 'Retro Grid', icon: Grid },
                            { id: 'dnaHelix', label: 'DNA Helix', icon: Shuffle },
                            { id: 'galaxySpiral', label: 'Galaxy Spiral', icon: Tornado },
                            { id: 'particles', label: 'Floating Particles', icon: Sparkles },
                            { id: 'stars', label: 'Starfield', icon: Star },
                        ].map((layer) => (
                            <button
                                key={layer.id}
                                onClick={() => handleLayerToggle(layer.id as keyof LayerConfig)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-medium transition-all duration-150 ${config.layers[layer.id as keyof LayerConfig]
                                    ? 'bg-neutral-800/80 text-white'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <layer.icon size={13} className={`transition-colors duration-200 ${config.layers[layer.id as keyof LayerConfig] ? "text-green-400" : "text-neutral-700"}`} />
                                    <span>{layer.label}</span>
                                </div>
                                {config.layers[layer.id as keyof LayerConfig]
                                    ? <Eye size={13} className="text-green-400/80" />
                                    : <EyeOff size={13} className="text-neutral-700" />
                                }
                            </button>
                        ))}
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Camera & Motion */}
                <Section title="Camera & Motion" icon={Video} defaultOpen={false}>
                    <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 mb-2">
                        <SliderControl
                            label="Animation Speed"
                            value={config.animationSpeed}
                            min={0.1}
                            max={5}
                            step={0.1}
                            onChange={(v) => handleChange('animationSpeed', v)}
                            icon={Gauge}
                            formatValue={(v) => `${v}x`}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        {CAMERA_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => {
                                    handleChange('cameraMode', mode.id);
                                    if (mode.id !== 'Static' && config.enableDragRotate) {
                                        handleChange('enableDragRotate', false);
                                    }
                                }}
                                disabled={config.enableDragRotate}
                                className={`text-[10px] p-2 rounded-lg font-medium border transition-all duration-200 flex flex-col items-center gap-1.5 ${config.cameraMode === mode.id
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                                    : 'bg-neutral-900/50 border-neutral-800/50 text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300'
                                    } ${config.enableDragRotate ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <mode.icon size={14} />
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 space-y-3 mt-2">
                        <SliderControl
                            label="Camera Zoom"
                            value={config.cameraZoom}
                            min={1}
                            max={20}
                            step={0.1}
                            onChange={(v) => handleChange('cameraZoom', v)}
                        />
                        <ToggleControl
                            label="Scene Movement"
                            value={config.enableMovement}
                            onChange={(v) => handleChange('enableMovement', v)}
                            icon={Move}
                        />
                        <div className="h-px bg-neutral-800/60" />
                        <ToggleControl
                            label="Mouse Parallax"
                            value={config.mouseTracking}
                            onChange={(v) => handleChange('mouseTracking', v)}
                            icon={MousePointer}
                            disabled={config.enableDragRotate || config.cameraMode !== 'Static'}
                        />
                        <ToggleControl
                            label="Drag to Rotate"
                            value={config.enableDragRotate}
                            onChange={(v) => handleChange('enableDragRotate', v)}
                            icon={Rotate3d}
                        />
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Visualizer Tuning */}
                <Section title="Visualizer Tuning" icon={Sliders} defaultOpen={false}>
                    <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 space-y-4">
                        <SliderControl
                            label="Bass Intensity"
                            value={config.visualizerSettings.bassIntensity}
                            min={0}
                            max={2}
                            step={0.1}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, bassIntensity: v } }))}
                            formatValue={(v) => v.toFixed(1)}
                        />
                        <SliderControl
                            label="Visualizer Scale"
                            value={config.visualizerSettings.scale}
                            min={0.5}
                            max={2}
                            step={0.1}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, scale: v } }))}
                            formatValue={(v) => v.toFixed(1)}
                        />
                        <div className="h-px bg-neutral-800/60" />
                        <ToggleControl
                            label="Show Stars"
                            value={config.visualizerSettings.showStars}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, showStars: v } }))}
                        />
                        <ToggleControl
                            label="Show Particles"
                            value={config.visualizerSettings.showParticles}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, showParticles: v } }))}
                        />
                        <div className="h-px bg-neutral-800/60" />
                        <SliderControl
                            label="Spectrum Bars"
                            value={config.visualizerSettings.spectrumBarCount}
                            min={16}
                            max={128}
                            step={1}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, spectrumBarCount: v } }))}
                            formatValue={(v) => Math.round(v).toString()}
                        />
                        <SliderControl
                            label="Spectrum Width"
                            value={config.visualizerSettings.spectrumBarWidth}
                            min={0.1}
                            max={1}
                            step={0.1}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, spectrumBarWidth: v } }))}
                            formatValue={(v) => v.toFixed(1)}
                        />
                        <ToggleControl
                            label="Mirror Spectrum"
                            value={config.visualizerSettings.spectrumMirror}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, spectrumMirror: v } }))}
                        />

                        <div className="h-px bg-neutral-800/60" />

                        <SliderControl
                            label="Circle Radius"
                            value={config.visualizerSettings.circularRadius}
                            min={2}
                            max={6}
                            step={0.1}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, circularRadius: v } }))}
                            formatValue={(v) => v.toFixed(1)}
                        />
                        <SliderControl
                            label="Circle Speed"
                            value={config.visualizerSettings.circularRotationSpeed}
                            min={0}
                            max={3}
                            step={0.05}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, circularRotationSpeed: v } }))}
                            formatValue={(v) => `${(v).toFixed(2)}x`}
                        />
                        <ToggleControl
                            label="Circular Ring"
                            value={config.visualizerSettings.circularRing}
                            onChange={(v) => setConfig(p => ({ ...p, visualizerSettings: { ...p.visualizerSettings, circularRing: v } }))}
                        />
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Post Processing / VFX */}
                <Section title="Visual Effects" icon={Wand2} defaultOpen={false}>
                    <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 space-y-4">

                        {/* Bloom */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Bloom"
                                value={config.postProcessing.enableBloom}
                                onChange={(v) => handlePostProcessingChange('enableBloom', v)}
                                icon={ZapIcon}
                            />
                            {config.postProcessing.enableBloom && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.bloomIntensity}
                                    min={0}
                                    max={3}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('bloomIntensity', v)}
                                />
                            )}
                        </div>

                        <div className="h-px bg-neutral-800/60" />

                        {/* Glitch */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Glitch"
                                value={config.postProcessing.enableGlitch}
                                onChange={(v) => handlePostProcessingChange('enableGlitch', v)}
                                icon={Tv}
                            />
                            {config.postProcessing.enableGlitch && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.glitchStrength}
                                    min={0.1}
                                    max={1}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('glitchStrength', v)}
                                />
                            )}
                        </div>

                        {/* Noise */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Grain (Noise)"
                                value={config.postProcessing.enableNoise}
                                onChange={(v) => handlePostProcessingChange('enableNoise', v)}
                                icon={Tornado}
                            />
                            {config.postProcessing.enableNoise && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.noiseOpacity}
                                    min={0}
                                    max={0.5}
                                    step={0.01}
                                    onChange={(v) => handlePostProcessingChange('noiseOpacity', v)}
                                />
                            )}
                        </div>

                        {/* Chromatic Aberration */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Chromatic Shift"
                                value={config.postProcessing.enableChromaticAberration}
                                onChange={(v) => handlePostProcessingChange('enableChromaticAberration', v)}
                                icon={Ghost}
                            />
                            {config.postProcessing.enableChromaticAberration && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.chromaticAberrationOffset}
                                    min={0}
                                    max={0.02}
                                    step={0.001}
                                    onChange={(v) => handlePostProcessingChange('chromaticAberrationOffset', v)}
                                />
                            )}
                        </div>

                        {/* Vignette */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Vignette"
                                value={config.postProcessing.enableVignette}
                                onChange={(v) => handlePostProcessingChange('enableVignette', v)}
                                icon={EyeOff}
                            />
                            {config.postProcessing.enableVignette && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.vignetteIntensity}
                                    min={0}
                                    max={3}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('vignetteIntensity', v)}
                                />
                            )}
                        </div>

                        {/* Scanline */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Scanlines"
                                value={config.postProcessing.enableScanline}
                                onChange={(v) => handlePostProcessingChange('enableScanline', v)}
                                icon={BarChart3}
                            />
                            {config.postProcessing.enableScanline && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.scanlineDensity}
                                    min={0.5}
                                    max={3.0}
                                    step={0.05}
                                    onChange={(v) => handlePostProcessingChange('scanlineDensity', v)}
                                />
                            )}
                        </div>

                        {/* Pixelation */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Pixelation (8-Bit)"
                                value={config.postProcessing.enablePixelation}
                                onChange={(v) => handlePostProcessingChange('enablePixelation', v)}
                                icon={Grid}
                            />
                            {config.postProcessing.enablePixelation && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.pixelGranularity}
                                    min={2}
                                    max={32}
                                    step={1}
                                    onChange={(v) => handlePostProcessingChange('pixelGranularity', v)}
                                />
                            )}
                        </div>

                        {/* Color Shift */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Hue Shift"
                                value={config.postProcessing.enableColorShift}
                                onChange={(v) => handlePostProcessingChange('enableColorShift', v)}
                                icon={Palette}
                            />
                            {config.postProcessing.enableColorShift && (
                                <SliderControl
                                    label=""
                                    value={config.postProcessing.colorShiftHue}
                                    min={0}
                                    max={360}
                                    step={1}
                                    onChange={(v) => handlePostProcessingChange('colorShiftHue', v)}
                                    formatValue={(v) => `${Math.round(v)}°`}
                                />
                            )}
                        </div>

                        {/* Sepia */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Sepia"
                                value={config.postProcessing.enableSepia}
                                onChange={(v) => handlePostProcessingChange('enableSepia', v)}
                                icon={Palette}
                            />
                            {config.postProcessing.enableSepia && (
                                <SliderControl
                                    label="Intensity"
                                    value={config.postProcessing.sepiaIntensity}
                                    min={0}
                                    max={1.5}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('sepiaIntensity', v)}
                                />
                            )}
                        </div>

                        {/* Dot Screen */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Dot Screen"
                                value={config.postProcessing.enableDotScreen}
                                onChange={(v) => handlePostProcessingChange('enableDotScreen', v)}
                                icon={Grid2X2}
                            />
                            {config.postProcessing.enableDotScreen && (
                                <SliderControl
                                    label="Scale"
                                    value={config.postProcessing.dotScale}
                                    min={0.1}
                                    max={3.0}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('dotScale', v)}
                                />
                            )}
                        </div>

                        {/* Grid Effect */}
                        <div className="space-y-2">
                            <ToggleControl
                                label="Grid Effect"
                                value={config.postProcessing.enableGrid}
                                onChange={(v) => handlePostProcessingChange('enableGrid', v)}
                                icon={Grid3X3}
                            />
                            {config.postProcessing.enableGrid && (
                                <SliderControl
                                    label="Scale"
                                    value={config.postProcessing.gridScale}
                                    min={0.1}
                                    max={5.0}
                                    step={0.1}
                                    onChange={(v) => handlePostProcessingChange('gridScale', v)}
                                />
                            )}
                        </div>

                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Display Settings */}
                <Section title="Canvas Layout" icon={Monitor} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-1.5">
                        {Object.keys(RESOLUTIONS).map((key) => (
                            <button
                                key={key}
                                onClick={() => handleResolutionChange(key)}
                                className={`text-[11px] py-2 px-3 rounded-lg font-medium border transition-all duration-200 ${config.resolution.name === RESOLUTIONS[key as keyof typeof RESOLUTIONS].name
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                                    : 'bg-neutral-900/50 border-neutral-800/50 text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300 hover:border-neutral-700'
                                    }`}
                            >
                                {RESOLUTIONS[key as keyof typeof RESOLUTIONS].name}
                            </button>
                        ))}
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Typography */}
                <Section title="Typography" icon={Type} defaultOpen={false}>

                    {/* Karaoke Mode */}
                    <div className="bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800/50">
                        <label className="text-[10px] text-neutral-500 font-medium px-1 block mb-2 uppercase tracking-wider">Karaoke Style</label>
                        <div className="grid grid-cols-3 gap-1">
                            {[
                                { id: 'None', label: 'Off' },
                                { id: 'Word', label: 'Word Pop' },
                                { id: 'Slider', label: 'Slider' },
                                { id: 'Typewriter', label: 'Typewriter' },
                                { id: 'Bounce', label: 'Bounce' },
                                { id: 'Reveal', label: 'Reveal' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => handleChange('karaokeMode', mode.id as KaraokeMode)}
                                    className={`py-1.5 rounded-md text-[9px] uppercase font-bold tracking-wider transition-all duration-200 border ${config.karaokeMode === mode.id
                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                        : 'bg-neutral-800/40 border-transparent text-neutral-500 hover:bg-neutral-700/40 hover:text-neutral-300'
                                        }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lyric Line Visibility */}
                    <div className="bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800/50">
                        <label className="text-[10px] text-neutral-500 font-medium px-1 block mb-2 uppercase tracking-wider">Visible Lines</label>
                        <div className="flex gap-1">
                            {[
                                { id: 'showPrevious', label: 'Previous', icon: ArrowUp },
                                { id: 'showCurrent', label: 'Current', icon: Disc },
                                { id: 'showNext', label: 'Next', icon: ArrowDown },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleLyricDisplayToggle(item.id as keyof ProjectConfig['lyricDisplay'])}
                                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md text-[9px] uppercase font-bold tracking-wider transition-all duration-200 border ${config.lyricDisplay[item.id as keyof ProjectConfig['lyricDisplay']]
                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                        : 'bg-neutral-800/40 border-transparent text-neutral-500 hover:bg-neutral-700/40 hover:text-neutral-300'
                                        }`}
                                >
                                    <item.icon size={13} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lyric Vertical Position */}
                    <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50">
                        <SliderControl
                            label="Vertical Margin"
                            value={config.lyricDisplay.verticalOffset || 0}
                            min={-10}
                            max={10}
                            step={0.1}
                            onChange={(v) => setConfig(prev => ({ ...prev, lyricDisplay: { ...prev.lyricDisplay, verticalOffset: v } }))}
                        />
                    </div>

                    {/* Fonts & Sizing */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Font Family</label>
                            <div className="flex gap-0 relative bg-neutral-900/60 border border-neutral-800/60 rounded-lg items-center overflow-hidden">
                                <input
                                    type="text"
                                    value={localFont}
                                    onChange={(e) => setLocalFont(e.target.value)}
                                    onKeyDown={handleFontKeyDown}
                                    placeholder={config.customFontUrl ? "Custom Font URL" : "e.g. Roboto, Montserrat"}
                                    className="flex-1 bg-transparent border-none text-[11px] text-white focus:outline-none focus:ring-0 px-3 py-2 transition-colors placeholder:text-neutral-700 min-w-0 font-medium"
                                />

                                <button
                                    onClick={handleApplyFont}
                                    disabled={!localFont.trim()}
                                    className="bg-neutral-800 hover:bg-green-500/20 text-neutral-400 hover:text-green-400 px-3 self-stretch text-[9px] uppercase font-bold tracking-tighter border-l border-neutral-800/60 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Load
                                </button>

                                {config.customFontUrl && (
                                    <button
                                        onClick={handleClearCustomFont}
                                        className="text-neutral-600 hover:text-red-400 p-1.5 transition-colors"
                                        title="Clear Custom Font"
                                    >
                                        <X size={12} />
                                    </button>
                                )}

                                <div className="relative border-l border-neutral-800/60">
                                    <input
                                        type="file"
                                        accept=".ttf,.otf,.woff"
                                        onChange={handleFontUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                        title="Upload Custom Font"
                                    />
                                    <div className="bg-transparent hover:bg-neutral-800/80 text-neutral-500 hover:text-green-400 px-2.5 py-2 flex items-center justify-center transition-colors">
                                        <Upload size={13} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Text Alignment */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Alignment</label>
                            <div className="flex gap-1 bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <button
                                        key={align}
                                        onClick={() => handleChange('textAlign', align)}
                                        className={`flex-1 py-1.5 rounded-md text-[9px] uppercase font-bold tracking-wider transition-all duration-200 border ${config.textAlign === align
                                            ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                            : 'bg-transparent border-transparent text-neutral-500 hover:text-white'
                                            }`}
                                    >
                                        {align}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <ToggleControl
                                label="Bold"
                                value={config.fontWeight === 'bold'}
                                onChange={(v) => handleChange('fontWeight', v ? 'bold' : 'normal')}
                                icon={TypeIcon}
                            />
                            <ToggleControl
                                label="Italic"
                                value={config.fontStyle === 'italic'}
                                onChange={(v) => handleChange('fontStyle', v ? 'italic' : 'normal')}
                                icon={TypeIcon}
                            />
                        </div>

                        <div className="space-y-3 bg-neutral-900/30 p-3 rounded-lg border border-neutral-800/40">
                            <SliderControl
                                label="Size"
                                value={config.fontSize}
                                min={0.5}
                                max={5}
                                step={0.1}
                                onChange={(v) => handleChange('fontSize', v)}
                                formatValue={(v) => `${v}x`}
                            />
                            <SliderControl
                                label="Letter Spacing"
                                value={config.letterSpacing}
                                min={-0.1}
                                max={1.0}
                                step={0.01}
                                onChange={(v) => handleChange('letterSpacing', v)}
                            />
                            <SliderControl
                                label="Word Spacing"
                                value={config.wordSpacing}
                                min={0}
                                max={2.0}
                                step={0.05}
                                onChange={(v) => handleChange('wordSpacing', v)}
                            />
                            <SliderControl
                                label="Stroke Width"
                                value={config.strokeWidth}
                                min={0}
                                max={0.3}
                                step={0.001}
                                onChange={(v) => handleChange('strokeWidth', v)}
                            />
                            <SliderControl
                                label="Glow Intensity"
                                value={config.textGlowStrength}
                                min={0}
                                max={5}
                                step={0.1}
                                onChange={(v) => handleChange('textGlowStrength', v)}
                            />
                        </div>

                        {/* Text Shadow Control */}
                        <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 space-y-3">
                            <ToggleControl
                                label="Text Shadow"
                                value={config.enableTextShadow}
                                onChange={(v) => handleChange('enableTextShadow', v)}
                            />

                            {config.enableTextShadow && (
                                <div className="space-y-3 pt-2 border-t border-neutral-800/40">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={config.textShadowColor}
                                            onChange={(e) => handleChange('textShadowColor', e.target.value)}
                                            className="w-6 h-6 rounded bg-transparent border-none p-0 cursor-pointer"
                                        />
                                        <span className="text-[10px] text-neutral-500 font-mono">{config.textShadowColor.toUpperCase()}</span>
                                    </div>
                                    <SliderControl
                                        label="Offset"
                                        value={config.textShadowOffset}
                                        min={0}
                                        max={0.2}
                                        step={0.005}
                                        onChange={(v) => handleChange('textShadowOffset', v)}
                                    />
                                    <SliderControl
                                        label="Opacity"
                                        value={config.textShadowOpacity}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        onChange={(v) => handleChange('textShadowOpacity', v)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Text Wave effect */}
                        <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50 space-y-3">
                            <ToggleControl
                                label="Text Distortion (Wave)"
                                value={config.enableTextWave}
                                onChange={(v) => handleChange('enableTextWave', v)}
                                icon={Waves}
                            />

                            {config.enableTextWave && (
                                <div className="space-y-3 pt-2 border-t border-neutral-800/40">
                                    <SliderControl
                                        label="Frequency"
                                        value={config.textWaveFrequency}
                                        min={0.1}
                                        max={10}
                                        step={0.1}
                                        onChange={(v) => handleChange('textWaveFrequency', v)}
                                    />
                                    <SliderControl
                                        label="Speed"
                                        value={config.textWaveSpeed}
                                        min={0}
                                        max={5}
                                        step={0.1}
                                        onChange={(v) => handleChange('textWaveSpeed', v)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Colors */}
                <Section title="Theme Colors" icon={Palette} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-2">
                        <ColorControl
                            label="Primary"
                            value={config.primaryColor}
                            onChange={(v) => handleChange('primaryColor', v)}
                        />
                        <ColorControl
                            label="Secondary"
                            value={config.secondaryColor}
                            onChange={(v) => {
                                handleChange('secondaryColor', v);
                                handleChange('strokeColor', v);
                            }}
                        />
                    </div>
                </Section>

                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                {/* Effects & Particles */}
                <Section title="Particles" icon={Sparkles} defaultOpen={false}>
                    <div className="space-y-3 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/50">
                        <SliderControl
                            label="Count"
                            value={config.particleCount}
                            min={0}
                            max={500}
                            step={10}
                            onChange={(v) => handleChange('particleCount', v)}
                        />
                        <SliderControl
                            label="Size"
                            value={config.particleSize}
                            min={0.1}
                            max={10}
                            step={0.1}
                            onChange={(v) => handleChange('particleSize', v)}
                        />
                        <SliderControl
                            label="Speed"
                            value={config.particleSpeed}
                            min={0}
                            max={5}
                            step={0.1}
                            onChange={(v) => handleChange('particleSpeed', v)}
                        />
                        <SliderControl
                            label="Opacity"
                            value={config.particleOpacity}
                            min={0}
                            max={1}
                            step={0.05}
                            onChange={(v) => handleChange('particleOpacity', v)}
                        />
                    </div>
                </Section>

                {/* Export MP4 Section */}
                <div className="h-px bg-linear-to-r from-transparent via-neutral-800 to-transparent" />

                <Section title="Export MP4" icon={FileVideo} defaultOpen={true} badge="WebCodecs">
                    <div className="space-y-3">
                        {/* Export Settings */}
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/60 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Frame Rate</label>
                                <div className="flex gap-1.5">
                                    {[24, 30, 60].map((fps) => (
                                        <button
                                            key={fps}
                                            onClick={() => setExportFps(fps)}
                                            disabled={isExporting}
                                            className={`flex-1 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all duration-200 border ${exportFps === fps
                                                ? 'bg-green-500/10 border-green-500/60 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                                                : 'bg-neutral-800/50 border-transparent text-neutral-500 hover:bg-neutral-700/50 hover:text-neutral-300'
                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            {fps} FPS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Quality</label>
                                <div className="flex gap-1.5">
                                    {[
                                        { label: 'Medium', value: 4_000_000 },
                                        { label: 'High', value: 8_000_000 },
                                        { label: 'Ultra', value: 16_000_000 },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setExportBitrate(opt.value)}
                                            disabled={isExporting}
                                            className={`flex-1 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-all duration-200 border ${exportBitrate === opt.value
                                                ? 'bg-green-500/10 border-green-500/60 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                                                : 'bg-neutral-800/50 border-transparent text-neutral-500 hover:bg-neutral-700/50 hover:text-neutral-300'
                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[9px] text-neutral-600 flex items-center gap-1.5">
                                <Info size={10} />
                                <span>Resolution: {config.resolution.width}×{config.resolution.height}</span>
                            </div>
                        </div>

                        {/* Export Button */}
                        {!isExporting && !exportDownloadUrl && (
                            <button
                                onClick={() => onExportMP4(exportFps, exportBitrate)}
                                disabled={!hasMedia || isRecording}
                                className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-800 disabled:to-neutral-800 text-white disabled:text-neutral-500 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-400/30 disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                <FileVideo size={14} />
                                Export MP4
                            </button>
                        )}

                        {/* Export Progress */}
                        {isExporting && exportProgress && (
                            <div className="space-y-2">
                                <div className="bg-neutral-900/80 p-3 rounded-lg border border-green-500/20 space-y-2">
                                    {/* Progress bar */}
                                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-linear-to-r from-green-500 to-emerald-400 rounded-full transition-[width] duration-200"
                                            style={{ width: `${exportProgress.percent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Loader size={10} className="animate-spin text-green-400" />
                                            <span className="text-[10px] text-green-400 font-medium">{exportProgress.percent}%</span>
                                        </div>
                                        <span className="text-[9px] text-neutral-500 font-mono">
                                            {exportProgress.currentFrame}/{exportProgress.totalFrames}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-neutral-500 truncate">{exportProgress.message}</p>
                                </div>
                                <button
                                    onClick={onCancelExport}
                                    className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2 px-4 rounded-lg text-[11px] font-medium transition-all"
                                >
                                    <XCircle size={13} />
                                    Cancel Export
                                </button>
                            </div>
                        )}

                        {/* Download Ready */}
                        {exportDownloadUrl && (
                            <div className="space-y-2">
                                <a
                                    href={exportDownloadUrl}
                                    download="lumina-export.mp4"
                                    className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 shadow-lg shadow-green-500/30"
                                >
                                    <Download size={14} />
                                    Download MP4
                                </a>
                                <button
                                    onClick={() => onExportMP4(exportFps, exportBitrate)}
                                    disabled={!hasMedia || isRecording}
                                    className="w-full flex items-center justify-center gap-1.5 bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white py-2 px-4 rounded-lg text-[11px] font-medium border border-neutral-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <FileVideo size={12} />
                                    Re-Export
                                </button>
                            </div>
                        )}
                    </div>
                </Section>

                {/* Keyboard Shortcuts Reference */}
                <div className="bg-neutral-900/30 p-3 rounded-lg border border-neutral-800/30 space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-medium uppercase tracking-wider">
                        <Keyboard size={10} />
                        Shortcuts
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                            { key: 'Space', action: 'Play / Pause' },
                            { key: 'X', action: 'Stop' },
                            { key: 'R', action: 'Record' },
                            { key: 'S', action: 'Stop Rec' },
                            { key: 'F', action: 'Fullscreen' },
                            { key: '← →', action: 'Seek ±5s' },
                        ].map(({ key, action }) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className="kbd">{key}</span>
                                <span className="text-[9px] text-neutral-600">{action}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-8"></div> {/* Spacer */}
            </div>
        </div>
    );
};

export default Controls;