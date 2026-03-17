import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Play, Pause, Download, StopCircle, Maximize, Minimize, Settings2, Square, Circle, SkipBack, SkipForward, Repeat, Repeat1, ArrowRight, ListMusic, Type, Trash2, X, Volume2, VolumeX } from 'lucide-react';
import { DEFAULT_CONFIG, ProjectConfig, LyricLine } from './types';
import { parseLyrics, detectFormat } from './services/parser';
import { webCodecsExporter, ExportProgress } from './services/webcodecs-exporter';
import Controls from './components/Controls';
import LyricScene from './components/LyricScene';

const App: React.FC = () => {
    const [config, setConfig] = useState<ProjectConfig>(DEFAULT_CONFIG);
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [mediaName, setMediaName] = useState<string | null>(null);
    const [lyricName, setLyricName] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showMobileControls, setShowMobileControls] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // MP4 Export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
    const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);

    // Playlist and Repeat state
    const [playlist, setPlaylist] = useState<{ id: string, file: File, url: string, name: string, lyrics?: LyricLine[], lyricName?: string | null }[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
    const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
    const [showPlaylist, setShowPlaylist] = useState(false);

    const audioRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Audio Context for Visualization
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
        }
    }, [volume, isMuted, mediaSrc]);

    // Cleanup audio context on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
                analyserRef.current = null;
                sourceNodeRef.current = null;
            }
            if (mediaSrc) {
                URL.revokeObjectURL(mediaSrc);
            }
        };
    }, []);

    // We do not revoke media URLs when mediaSrc changes because the playlist still needs them.
    // They will be cleaned up by the browser when the app closes or track is removed.

    // Setup Audio Context when media changes or plays
    const setupAudioContext = useCallback(() => {
        if (!audioRef.current) return;

        let ctx = audioContextRef.current;
        let analyser = analyserRef.current;

        if (!ctx) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            ctx = new AudioContextClass();
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyser.connect(ctx.destination);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;
        }

        if (!sourceNodeRef.current) {
            try {
                const source = ctx.createMediaElementSource(audioRef.current);
                source.connect(analyser);
                sourceNodeRef.current = source;
            } catch (err) {
                console.warn("Could not wire new media element to audio context:", err);
            }
        }
    }, []);

    // Media Handlers
    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const newTracks = files.map(file => ({
                id: crypto.randomUUID(),
                file,
                url: URL.createObjectURL(file),
                name: file.name,
                lyrics: [],
                lyricName: null
            }));

            setPlaylist(prev => [...prev, ...newTracks]);

            // If nothing is playing, start the first uploaded track
            if (currentTrackIndex === -1) {
                loadTrack(newTracks[0].url, newTracks[0].name, 0, newTracks[0].lyrics, newTracks[0].lyricName);
            }

            // Clear input value so the same file can be uploaded again if needed
            e.target.value = '';
        }
    };

    const loadTrack = (url: string, name: string, index: number, trackLyrics?: LyricLine[], trackLyricName?: string | null) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        // Disconnect old media source if it exists because the <video> DOM element will be recreated
        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        setMediaSrc(url);
        setMediaName(name);
        setCurrentTrackIndex(index);
        setDownloadUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        setLyrics(trackLyrics || []);
        setLyricName(trackLyricName || null);
    };

    const nextTrack = useCallback(() => {
        if (playlist.length === 0) return;
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= playlist.length) {
            if (repeatMode === 'all') {
                nextIndex = 0;
            } else {
                return; // End of playlist
            }
        }
        const track = playlist[nextIndex];
        loadTrack(track.url, track.name, nextIndex, track.lyrics, track.lyricName);
        setTimeout(() => togglePlay(), 100);
    }, [playlist, currentTrackIndex, repeatMode]);

    const prevTrack = useCallback(() => {
        if (playlist.length === 0) return;
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) {
            if (repeatMode === 'all') {
                prevIndex = playlist.length - 1;
            } else {
                prevIndex = 0;
            }
        }
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0; // Just restart current if > 3s
            return;
        }
        const track = playlist[prevIndex];
        loadTrack(track.url, track.name, prevIndex, track.lyrics, track.lyricName);
        setTimeout(() => togglePlay(), 100);
    }, [playlist, currentTrackIndex, repeatMode, currentTime]);

    const handleLyricUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLyricName(file.name);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = ev.target?.result as string;
                const format = detectFormat(file.name, content);
                const parsed = parseLyrics(content, format);
                setLyrics(parsed);

                // Keep track of lyrics per track in the playlist
                if (currentTrackIndex >= 0 && currentTrackIndex < playlist.length) {
                    setPlaylist(prev => {
                        const newPlaylist = [...prev];
                        newPlaylist[currentTrackIndex] = {
                            ...newPlaylist[currentTrackIndex],
                            lyrics: parsed,
                            lyricName: file.name
                        };
                        return newPlaylist;
                    });
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    // Playback Control
    const togglePlay = useCallback(async () => {
        if (audioRef.current) {
            // Ensure audio context is ready AND source is connected
            if (!audioContextRef.current || !sourceNodeRef.current) {
                setupAudioContext();
            }

            try {
                if (audioContextRef.current?.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                if (audioRef.current.paused) {
                    await audioRef.current.play();
                } else {
                    audioRef.current.pause();
                }
            } catch (err) {
                console.error("Playback Error:", err);
                setIsPlaying(false);
            }
        }
    }, [setupAudioContext]);

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
            setIsPlaying(false);
        }
    }, []);

    const seekBy = useCallback((seconds: number) => {
        if (audioRef.current && !isRecording) {
            audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
        }
    }, [isRecording, duration]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const handleSeekStart = () => setIsDragging(true);
    const handleSeekEnd = () => setIsDragging(false);

    const removeTrack = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setPlaylist(prev => {
            const newPlaylist = [...prev];
            newPlaylist.splice(index, 1);
            return newPlaylist;
        });

        if (currentTrackIndex === index) {
            stopPlayback();
            setMediaSrc(null);
            setMediaName(null);
            setLyrics([]);
            setLyricName(null);
            setCurrentTrackIndex(-1);
        } else if (currentTrackIndex > index) {
            setCurrentTrackIndex(prev => prev - 1);
        }
    };

    const clearPlaylist = () => {
        setPlaylist([]);
        stopPlayback();
        setMediaSrc(null);
        setMediaName(null);
        setLyrics([]);
        setLyricName(null);
        setCurrentTrackIndex(-1);
    };

    // Recording Logic (moved up for useEffect dependency)
    const startRecording = useCallback(() => {
        if (!canvasRef.current || !audioRef.current) return;

        if (!audioContextRef.current) setupAudioContext();
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();

        setIsRecording(true);
        setDownloadUrl(null);
        chunksRef.current = [];

        const canvasStream = canvasRef.current.captureStream(60);

        if (audioContextRef.current && sourceNodeRef.current) {
            const dest = audioContextRef.current.createMediaStreamDestination();
            sourceNodeRef.current.connect(dest);

            const combinedTracks = [
                ...canvasStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ];

            const combinedStream = new MediaStream(combinedTracks);

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm; codecs=vp9',
                videoBitsPerSecond: 8000000
            });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setIsRecording(false);
                setIsPlaying(false);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();

            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPlaying(true);
        }

    }, [setupAudioContext]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            if (audioRef.current) audioRef.current.pause();
        }
    }, []);

    // WebCodecs MP4 Export
    const handleExportMP4 = useCallback(async (fps: number, bitrate: number) => {
        if (!canvasRef.current || !audioRef.current) return;
        if (!audioContextRef.current || !sourceNodeRef.current) {
            setupAudioContext();
        }
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        if (!audioContextRef.current || !sourceNodeRef.current || !analyserRef.current) return;

        // Revoke previous download URL
        if (exportDownloadUrl) {
            URL.revokeObjectURL(exportDownloadUrl);
            setExportDownloadUrl(null);
        }

        // Pause playback before starting export
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
        }

        setIsExporting(true);
        setExportProgress(null);

        try {
            const blob = await webCodecsExporter.export({
                canvas: canvasRef.current,
                audioElement: audioRef.current,
                audioContext: audioContextRef.current,
                sourceNode: sourceNodeRef.current,
                analyserNode: analyserRef.current!,
                width: config.resolution.width,
                height: config.resolution.height,
                fps,
                videoBitrate: bitrate,
                onProgress: (progress) => {
                    setExportProgress(progress);
                },
            });

            const url = URL.createObjectURL(blob);
            setExportDownloadUrl(url);
        } catch (err) {
            if ((err as Error).message !== 'Export cancelled.') {
                console.error('MP4 Export failed:', err);
            }
        } finally {
            setIsExporting(false);
        }
    }, [setupAudioContext, exportDownloadUrl, config.resolution]);

    const handleCancelExport = useCallback(() => {
        webCodecsExporter.cancel();
    }, []);

    // Sync state with audio time
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(audio.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        // Force duration check immediately in case metadata loaded before listener attached
        if (audio.readyState >= 1) {
            handleLoadedMetadata();
        }

        const handleEnded = () => {
            if (isRecording) {
                stopRecording();
            }
            if (repeatMode === 'one') {
                audio.currentTime = 0;
                audio.play();
            } else if (currentTrackIndex < playlist.length - 1 || repeatMode === 'all') {
                nextTrack();
            } else {
                setIsPlaying(false);
            }
        };

        const handlePlayPause = () => {
            setIsPlaying(!audio.paused);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlayPause);
        audio.addEventListener('pause', handlePlayPause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlayPause);
            audio.removeEventListener('pause', handlePlayPause);
        };
    }, [isRecording, mediaSrc, isDragging, stopRecording, repeatMode, currentTrackIndex, playlist.length, nextTrack]);

    // Font Injection & Registration
    useEffect(() => {
        const genericFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
        if (config.fontFamily !== 'Custom' && !genericFonts.includes(config.fontFamily.toLowerCase().trim())) {
            const fontName = config.fontFamily.trim().replace(/ /g, '+');
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
            link.rel = 'stylesheet';
            link.crossOrigin = 'anonymous';

            link.onerror = () => {
                console.warn(`Could not load font "${config.fontFamily}" - falling back to system fonts`);
                if (document.head.contains(link)) {
                    document.head.removeChild(link);
                }
            };

            document.head.appendChild(link);
            return () => {
                if (document.head.contains(link)) {
                    document.head.removeChild(link);
                }
            }
        } else if (config.customFontUrl) {
            // Register custom font for Canvas/CSS access
            const font = new FontFace('LuminaCustom', `url(${config.customFontUrl})`);
            font.load().then(f => {
                document.fonts.add(f);
                console.log("Custom font registered successfully");
            }).catch(err => {
                console.error("Failed to load custom font for measurement:", err);
            });
        }
    }, [config.fontFamily, config.customFontUrl]);

    // Fullscreen Logic
    const toggleFullscreen = useCallback(() => {
        if (!previewContainerRef.current) return;

        if (!document.fullscreenElement) {
            previewContainerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    }, []);

    // Listen for fullscreen change events (ESC key)
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is an input or textarea
            if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (mediaSrc && !isRecording) {
                        togglePlay();
                    }
                    break;
                case 'KeyR':
                    if (mediaSrc && !isRecording) {
                        startRecording();
                    }
                    break;
                case 'KeyS':
                    if (isRecording) {
                        stopRecording();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seekBy(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekBy(5);
                    break;
                case 'KeyX':
                    if (mediaSrc && !isRecording) {
                        stopPlayback();
                    }
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mediaSrc, isRecording, togglePlay, startRecording, stopRecording, stopPlayback, seekBy, toggleFullscreen]);

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // Progress percentage for custom seek bar
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-neutral-950 text-neutral-200 overflow-hidden">
            {/* Hidden Media Element with Key to force recreation */}
            {mediaSrc && (
                <video
                    key={mediaSrc}
                    ref={audioRef}
                    src={mediaSrc}
                    className="hidden"
                    crossOrigin="anonymous"
                    playsInline
                    preload="auto"
                />
            )}

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col relative min-h-0 min-w-0">
                <div
                    ref={previewContainerRef}
                    className={`flex-1 relative bg-black flex items-center justify-center overflow-hidden group ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}
                >

                    {/* The 3D Canvas */}
                    <div
                        style={{
                            width: isFullscreen ? '100%' : config.resolution.width,
                            height: isFullscreen ? '100%' : config.resolution.height,
                            maxWidth: isFullscreen ? 'none' : '100%',
                            maxHeight: isFullscreen ? 'none' : '100%',
                            aspectRatio: isFullscreen ? 'auto' : `${config.resolution.width}/${config.resolution.height}`,
                            boxShadow: isFullscreen ? 'none' : '0 0 60px rgba(34, 197, 94, 0.06), 0 4px 40px rgba(0,0,0,0.5)'
                        }}
                        className={`relative transition-all duration-500 bg-neutral-900/30 ${isFullscreen ? '' : 'border border-neutral-800/50 rounded-lg'}`}
                    >
                        <Canvas
                            ref={canvasRef}
                            gl={{ preserveDrawingBuffer: true, alpha: false, localClippingEnabled: true }}
                            camera={{ position: [0, 0, 5], fov: 50 }}
                        >
                            <LyricScene
                                currentTime={currentTime}
                                lyrics={lyrics}
                                config={config}
                                analyser={analyserRef}
                                audioRef={audioRef}
                                onConfigChange={(newConfig) => setConfig(prev => ({ ...prev, ...newConfig }))}
                            />
                        </Canvas>
                    </div>

                    {/* Top Right Controls Overlay */}
                    <div className="absolute top-3 right-3 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {isFullscreen && (
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={!mediaSrc && !isRecording}
                                className={`bg-neutral-900/70 hover:bg-neutral-800 p-2 rounded-lg backdrop-blur-sm border transition-all duration-200 ${isRecording
                                    ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
                                    : 'text-neutral-400 hover:text-white border-neutral-800/50'
                                    } disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center`}
                                title={isRecording ? "Stop Recording" : "Record"}
                            >
                                {isRecording ? <Square size={16} fill="currentColor" /> : <Circle size={16} fill="currentColor" className="text-red-400" />}
                            </button>
                        )}
                        {/* Fullscreen Toggle Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="bg-neutral-900/70 hover:bg-neutral-800 p-2 rounded-lg text-neutral-400 hover:text-white backdrop-blur-sm border border-neutral-800/50 transition-all duration-200"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                    </div>

                    {/* Recording Overlay */}
                    {isRecording && (
                        <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
                            <div className="recording-glow bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 backdrop-blur-md">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                REC
                            </div>
                            <div className="bg-black/60 text-neutral-300 px-2.5 py-1.5 rounded-lg text-[10px] font-mono backdrop-blur-md border border-white/5">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>
                    )}

                    {/* Playlist Overlay */}
                    {showPlaylist && (
                        <div className="absolute bottom-4 left-4 z-50 w-[300px] max-h-[300px] flex flex-col bg-neutral-900/90 backdrop-blur-md border border-neutral-800/80 rounded-lg shadow-2xl overflow-hidden text-[11px] transform transition-all">
                            <div className="flex items-center justify-between p-2.5 bg-neutral-800/50 border-b border-neutral-700/50 text-neutral-300 font-medium shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <ListMusic size={12} />
                                    <span>Playlist</span>
                                    <span className="text-neutral-500 text-[10px] ml-1">({playlist.length})</span>
                                </div>
                                {playlist.length > 0 && (
                                    <button
                                        onClick={clearPlaylist}
                                        className="text-neutral-500 hover:text-red-400 p-1 rounded-md hover:bg-neutral-700 transition-colors"
                                        title="Clear Playlist"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 relative">
                                {playlist.length === 0 ? (
                                    <div className="text-center p-8 text-neutral-500 italic">No tracks loaded</div>
                                ) : (
                                    playlist.map((track, i) => (
                                        <div
                                            key={track.id}
                                            onClick={() => loadTrack(track.url, track.name, i, track.lyrics, track.lyricName)}
                                            className={`group/track flex flex-col p-2 rounded-md cursor-pointer transition-all ${currentTrackIndex === i ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'text-neutral-400 hover:bg-neutral-800/80 border border-transparent'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 truncate flex-1 pr-2" onClick={(e) => { e.stopPropagation(); loadTrack(track.url, track.name, i, track.lyrics, track.lyricName); }}>
                                                    {currentTrackIndex === i ? <Play size={10} fill="currentColor" className="shrink-0" /> : <div className="w-2.5 shrink-0" />}
                                                    <span className="truncate" title={track.name}>{track.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <label className="cursor-pointer bg-neutral-800/80 hover:bg-neutral-700/80 p-1.5 rounded text-neutral-400 hover:text-green-400 transition-colors shrink-0" title="Upload Lyric for this track" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="file"
                                                            accept=".srt,.lrc,.vtt,.ttml,.xml"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (ev) => {
                                                                        const content = ev.target?.result as string;
                                                                        const format = detectFormat(file.name, content);
                                                                        const parsed = parseLyrics(content, format);
                                                                        setPlaylist(prev => {
                                                                            const newPlaylist = [...prev];
                                                                            newPlaylist[i] = {
                                                                                ...newPlaylist[i],
                                                                                lyrics: parsed,
                                                                                lyricName: file.name
                                                                            };
                                                                            return newPlaylist;
                                                                        });
                                                                        // If this is the current track, update active lyrics immediately
                                                                        if (currentTrackIndex === i) {
                                                                            setLyrics(parsed);
                                                                            setLyricName(file.name);
                                                                        }
                                                                    };
                                                                    reader.readAsText(file);
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        <Type size={10} />
                                                    </label>
                                                    <button
                                                        onClick={(e) => removeTrack(e, i)}
                                                        className="p-1.5 rounded bg-neutral-800/80 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover/track:opacity-100"
                                                        title="Remove track"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                            {track.lyricName && (
                                                <div className="text-[9px] text-neutral-500 pl-4 flex items-center gap-1 opacity-70">
                                                    <Type size={8} />
                                                    <span className="truncate">{track.lyricName}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline & Playback Bar */}
                <div className={`bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-800/60 px-4 md:px-5 py-3 shrink-0 z-20 ${isFullscreen ? 'hidden' : ''}`}>
                    {/* Seek Bar */}
                    <div className="relative group/seek h-5 flex items-center mb-2 cursor-pointer">
                        <div className="absolute inset-x-0 h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-green-500 to-green-400 rounded-full transition-[width] duration-75"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            step="0.01"
                            value={currentTime}
                            onChange={handleSeek}
                            onMouseDown={handleSeekStart}
                            onMouseUp={handleSeekEnd}
                            onTouchStart={handleSeekStart}
                            onTouchEnd={handleSeekEnd}
                            disabled={isRecording || !mediaSrc}
                            className="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer z-10"
                        />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3">
                        {/* Playback Controls */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={prevTrack}
                                disabled={isRecording || playlist.length === 0}
                                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Previous Track"
                            >
                                <SkipBack size={13} fill="currentColor" />
                            </button>
                            <button
                                onClick={stopPlayback}
                                disabled={isRecording || !mediaSrc}
                                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Stop (X)"
                            >
                                <Square size={11} fill="currentColor" />
                            </button>

                            <button
                                onClick={() => seekBy(-5)}
                                disabled={isRecording || !mediaSrc}
                                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Seek -5s (←)"
                            >
                                <SkipBack size={13} />
                            </button>

                            <button
                                onClick={togglePlay}
                                disabled={isRecording || !mediaSrc}
                                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 hover:shadow-green-400/30 transition-all duration-200 hover:scale-105"
                            >
                                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                            </button>

                            <button
                                onClick={() => seekBy(5)}
                                disabled={isRecording || !mediaSrc}
                                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Seek +5s (→)"
                            >
                                <SkipForward size={13} />
                            </button>

                            <button
                                onClick={nextTrack}
                                disabled={isRecording || playlist.length === 0}
                                className="w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Next Track"
                            >
                                <SkipForward size={13} fill="currentColor" />
                            </button>

                            {/* Repeat Button */}
                            <button
                                onClick={() => {
                                    setRepeatMode(prev => prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none');
                                }}
                                className={`w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center transition-all ${repeatMode !== 'none' ? 'text-green-400 font-bold' : 'text-neutral-500 hover:text-white'}`}
                                title={`Repeat: ${repeatMode}`}
                            >
                                {repeatMode === 'one' ? <Repeat1 size={13} /> : <Repeat size={13} />}
                            </button>

                            {/* Playlist Toggle */}
                            <button
                                onClick={() => setShowPlaylist(!showPlaylist)}
                                className={`w-8 h-8 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 flex items-center justify-center transition-all ${showPlaylist ? 'text-green-400' : 'text-neutral-500 hover:text-white'}`}
                                title="Playlist"
                            >
                                <ListMusic size={13} />
                            </button>
                        </div>

                        {/* Time Display */}
                        <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 min-w-[80px]">
                            <span className="text-neutral-300">{formatTime(currentTime)}</span>
                            <span>/</span>
                            <span>{formatTime(duration)}</span>
                        </div>

                        {/* Volume Control */}
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="text-neutral-500 hover:text-white transition-colors"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    setVolume(parseFloat(e.target.value));
                                    if (parseFloat(e.target.value) > 0 && isMuted) {
                                        setIsMuted(false);
                                    }
                                }}
                                className="w-16 md:w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Recording Controls */}
                        <div className="flex items-center gap-2">
                            {!isRecording && (
                                <button
                                    onClick={startRecording}
                                    disabled={!mediaSrc}
                                    className="flex items-center gap-1.5 bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-700/50 text-[11px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Circle size={8} fill="currentColor" className="text-red-400" />
                                    <span className="hidden sm:inline">{downloadUrl ? "Re-Record" : "Record"}</span>
                                </button>
                            )}

                            {isRecording && (
                                <button
                                    onClick={stopRecording}
                                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all recording-glow"
                                >
                                    <StopCircle size={14} />
                                    <span className="hidden sm:inline">Stop</span>
                                </button>
                            )}

                            {downloadUrl && (
                                <a
                                    href={downloadUrl}
                                    download={`lumina-lyric-video.webm`}
                                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all shadow-lg shadow-green-500/20"
                                >
                                    <Download size={14} />
                                    <span className="hidden sm:inline">Save</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className={`
                ${isFullscreen ? 'hidden' : 'flex'} 
                flex-col border-l border-neutral-800/60 bg-neutral-950
                fixed inset-0 z-30 transition-transform duration-300 md:relative md:inset-auto md:z-0 md:w-80 md:shrink-0 md:transform-none
                ${showMobileControls ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
            `}>
                {/* Mobile Header for Sidebar */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
                    <h2 className="font-bold text-white text-sm">Settings</h2>
                    <button onClick={() => setShowMobileControls(false)} className="text-neutral-400 hover:text-white transition-colors">
                        <Minimize size={18} />
                    </button>
                </div>

                <Controls
                    config={config}
                    setConfig={setConfig}
                    onMediaUpload={handleMediaUpload}
                    onLyricUpload={handleLyricUpload}
                    mediaName={mediaName}
                    lyricName={lyricName}
                    isRecording={isRecording}
                    isExporting={isExporting}
                    exportProgress={exportProgress}
                    exportDownloadUrl={exportDownloadUrl}
                    onExportMP4={handleExportMP4}
                    onCancelExport={handleCancelExport}
                    hasMedia={!!mediaSrc}
                />
            </div>

            {/* Mobile Floating Button to Toggle Sidebar */}
            <button
                onClick={() => setShowMobileControls(true)}
                className={`md:hidden absolute top-3 right-3 z-20 bg-neutral-800/80 text-white p-2.5 rounded-full shadow-lg border border-neutral-700/50 backdrop-blur-sm ${isFullscreen ? 'hidden' : ''}`}
            >
                <Settings2 size={18} />
            </button>

        </div>
    );
};

export default App;