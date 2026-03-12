import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export type ExportProgress = {
    phase: 'encoding' | 'muxing' | 'done' | 'error';
    percent: number;
    currentFrame: number;
    totalFrames: number;
    message: string;
};

export type ExportOptions = {
    canvas: HTMLCanvasElement;
    audioElement: HTMLVideoElement;
    audioContext: AudioContext;
    sourceNode: MediaElementAudioSourceNode;
    analyserNode: AnalyserNode;
    width: number;
    height: number;
    fps: number;
    videoBitrate: number;
    onProgress: (progress: ExportProgress) => void;
};

/**
 * WebCodecs-based MP4 exporter.
 * Captures frames from the Three.js canvas, encodes them using the hardware-accelerated
 * WebCodecs VideoEncoder, and muxes the result into an MP4 container using mp4-muxer.
 *
 * Audio is captured from the AudioContext's MediaStreamDestination and encoded
 * alongside the video stream.
 *
 * Visualizer sync: Pre-decodes the audio into an AudioBuffer, then for each frame,
 * renders a small window of audio through an OfflineAudioContext with an AnalyserNode
 * to compute accurate FFT data. This data is then injected into a synthetic analyser
 * wrapper so the visualizer components react correctly during export.
 */
export class WebCodecsExporter {
    private abortController: AbortController | null = null;
    private isExporting = false;

    /**
     * Check if WebCodecs API is available in the browser.
     */
    static isSupported(): boolean {
        return (
            typeof VideoEncoder !== 'undefined' &&
            typeof VideoFrame !== 'undefined' &&
            typeof AudioEncoder !== 'undefined'
        );
    }

    /**
     * Pre-decode the audio file into an AudioBuffer for offline FFT computation.
     */
    private async decodeAudioSource(
        audioElement: HTMLVideoElement,
        sampleRate: number,
    ): Promise<AudioBuffer> {
        const response = await fetch(audioElement.src);
        const arrayBuffer = await response.arrayBuffer();
        const offlineCtx = new OfflineAudioContext(2, 1, sampleRate);
        return offlineCtx.decodeAudioData(arrayBuffer);
    }

    /**
     * Compute FFT frequency data for a given time position in the audio.
     * Uses an OfflineAudioContext to render a small window of audio through an AnalyserNode.
     * Returns a Uint8Array matching the format of AnalyserNode.getByteFrequencyData().
     */
    private async computeFFTAtTime(
        audioBuffer: AudioBuffer,
        timeInSeconds: number,
        fftSize: number,
    ): Promise<Uint8Array> {
        const sampleRate = audioBuffer.sampleRate;
        // We need at least fftSize samples for the analyser to produce meaningful data.
        // Render a window of fftSize * 2 samples to ensure the analyser has enough data.
        const renderSamples = fftSize * 2;
        const renderDuration = renderSamples / sampleRate;

        // Calculate the start offset, ensuring we don't go before the beginning
        const startOffset = Math.max(0, timeInSeconds - renderDuration / 2);

        const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            renderSamples,
            sampleRate,
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = offlineCtx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0; // No smoothing for frame-accurate data

        source.connect(analyser);
        analyser.connect(offlineCtx.destination);

        source.start(0, startOffset, renderDuration);

        await offlineCtx.startRendering();

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);

        return frequencyData;
    }

    /**
     * Start MP4 export. Returns a Blob containing the MP4 data.
     */
    async export(options: ExportOptions): Promise<Blob> {
        if (!WebCodecsExporter.isSupported()) {
            throw new Error('WebCodecs API is not supported in this browser. Please use Chrome 94+ or Edge 94+.');
        }

        if (this.isExporting) {
            throw new Error('Export is already in progress.');
        }

        this.isExporting = true;
        this.abortController = new AbortController();

        const {
            canvas,
            audioElement,
            audioContext,
            sourceNode,
            analyserNode,
            width,
            height,
            fps,
            videoBitrate,
            onProgress,
        } = options;

        // Determine total duration and frames
        const duration = audioElement.duration;
        if (!duration || isNaN(duration) || duration <= 0) {
            throw new Error('Audio/video has no valid duration. Please load a media file first.');
        }

        const totalFrames = Math.ceil(duration * fps);
        const frameDurationUs = Math.round(1_000_000 / fps); // microseconds per frame

        onProgress({
            phase: 'encoding',
            percent: 0,
            currentFrame: 0,
            totalFrames,
            message: 'Initializing encoder...',
        });

        // Pre-decode audio for offline FFT computation (for visualizer sync)
        onProgress({
            phase: 'encoding',
            percent: 0,
            currentFrame: 0,
            totalFrames,
            message: 'Decoding audio for visualizer sync...',
        });
        const decodedAudio = await this.decodeAudioSource(audioElement, audioContext.sampleRate);
        const fftSize = analyserNode.fftSize;

        // Create MP4 Muxer
        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width,
                height,
            },
            audio: {
                codec: 'aac',
                numberOfChannels: 2,
                sampleRate: audioContext.sampleRate,
            },
            fastStart: 'in-memory',
        });

        // Setup Video Encoder
        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => {
                muxer.addVideoChunk(chunk, meta ?? undefined);
            },
            error: (e) => {
                console.error('VideoEncoder error:', e);
            },
        });

        videoEncoder.configure({
            codec: 'avc1.640028', // H.264 High Profile Level 4.0
            width,
            height,
            bitrate: videoBitrate,
            framerate: fps,
            hardwareAcceleration: 'prefer-hardware',
        });

        // Setup Audio Encoder
        const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
                muxer.addAudioChunk(chunk, meta ?? undefined);
            },
            error: (e) => {
                console.error('AudioEncoder error:', e);
            },
        });

        audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC-LC
            numberOfChannels: 2,
            sampleRate: audioContext.sampleRate,
            bitrate: 128000,
        });

        // Setup audio capture via OfflineAudioContext for precise frame-by-frame rendering
        // We'll capture audio in chunks aligned to video frames
        const audioDestination = audioContext.createMediaStreamDestination();
        sourceNode.connect(audioDestination);

        // Create a synthetic analyser data buffer that we'll inject FFT data into.
        // We'll use an AudioBufferSourceNode connected to the real analyser to feed it
        // pre-computed audio for each frame.
        const syntheticFrequencyData = new Uint8Array(analyserNode.frequencyBinCount);

        // Monkey-patch the analyser's getByteFrequencyData to return our synthetic data during export.
        // This is the most reliable way to make all visualizer components react correctly
        // without modifying any of them.
        const originalGetByteFrequencyData = analyserNode.getByteFrequencyData.bind(analyserNode);
        const originalGetByteTimeDomainData = analyserNode.getByteTimeDomainData.bind(analyserNode);
        analyserNode.getByteFrequencyData = (array: Uint8Array) => {
            array.set(syntheticFrequencyData.subarray(0, array.length));
        };

        // For time-domain data (used by Waveform visualizer), compute from the decoded audio
        let syntheticTimeDomainData: Uint8Array<ArrayBufferLike> = new Uint8Array(analyserNode.fftSize).fill(128);
        analyserNode.getByteTimeDomainData = (array: Uint8Array) => {
            array.set(syntheticTimeDomainData.subarray(0, array.length));
        };

        try {
            // Seek to start
            audioElement.currentTime = 0;
            audioElement.muted = true;

            // Wait for seek to complete
            await new Promise<void>((resolve) => {
                const onSeeked = () => {
                    audioElement.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                audioElement.addEventListener('seeked', onSeeked);
            });

            // Process frame by frame
            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                if (this.abortController?.signal.aborted) {
                    throw new Error('Export cancelled.');
                }

                const timeInSeconds = frameIndex / fps;
                const timestampUs = frameIndex * frameDurationUs;

                // Compute FFT data for this frame's time position
                const fftData = await this.computeFFTAtTime(decodedAudio, timeInSeconds, fftSize);
                syntheticFrequencyData.set(fftData);

                // Compute time-domain data for this frame
                syntheticTimeDomainData = this.computeTimeDomainAtTime(decodedAudio, timeInSeconds, fftSize);

                // Seek audio to current frame time (for lyric sync via currentTime)
                audioElement.currentTime = timeInSeconds;

                // Wait for the seek to process
                await new Promise<void>((resolve) => {
                    const onSeeked = () => {
                        audioElement.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    if (Math.abs(audioElement.currentTime - timeInSeconds) < 0.01) {
                        resolve();
                    } else {
                        audioElement.addEventListener('seeked', onSeeked);
                    }
                });

                // Small delay to let the canvas render the current frame
                await new Promise((resolve) => requestAnimationFrame(resolve));
                await new Promise((resolve) => requestAnimationFrame(resolve));

                // Capture the canvas frame
                const videoFrame = new VideoFrame(canvas, {
                    timestamp: timestampUs,
                    duration: frameDurationUs,
                });

                const isKeyFrame = frameIndex % (fps * 2) === 0; // Keyframe every 2 seconds
                videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
                videoFrame.close();

                // Update progress
                const percent = Math.round(((frameIndex + 1) / totalFrames) * 100);
                onProgress({
                    phase: 'encoding',
                    percent,
                    currentFrame: frameIndex + 1,
                    totalFrames,
                    message: `Encoding frame ${frameIndex + 1} / ${totalFrames}`,
                });
            }

            // Capture audio using OfflineAudioContext for precise rendering
            onProgress({
                phase: 'encoding',
                percent: 95,
                currentFrame: totalFrames,
                totalFrames,
                message: 'Encoding audio...',
            });

            // Render audio offline for precise capture
            await this.captureAudio(audioElement, audioContext, audioEncoder, duration);

            // Flush encoders
            await videoEncoder.flush();
            await audioEncoder.flush();

            // Finalize muxer
            onProgress({
                phase: 'muxing',
                percent: 98,
                currentFrame: totalFrames,
                totalFrames,
                message: 'Finalizing MP4...',
            });

            muxer.finalize();

            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: 'video/mp4' });

            onProgress({
                phase: 'done',
                percent: 100,
                currentFrame: totalFrames,
                totalFrames,
                message: 'Export complete!',
            });

            return blob;
        } catch (error) {
            onProgress({
                phase: 'error',
                percent: 0,
                currentFrame: 0,
                totalFrames,
                message: error instanceof Error ? error.message : 'Unknown error occurred.',
            });
            throw error;
        } finally {
            // Restore the original AnalyserNode methods
            analyserNode.getByteFrequencyData = originalGetByteFrequencyData;
            analyserNode.getByteTimeDomainData = originalGetByteTimeDomainData;

            // Cleanup
            this.isExporting = false;
            this.abortController = null;

            audioElement.muted = false;

            try { sourceNode.disconnect(audioDestination); } catch { /* ignore */ }

            if (videoEncoder.state !== 'closed') {
                videoEncoder.close();
            }
            if (audioEncoder.state !== 'closed') {
                audioEncoder.close();
            }
        }
    }

    /**
     * Compute time-domain data (waveform) at a given time position.
     * Returns a Uint8Array in the same format as AnalyserNode.getByteTimeDomainData().
     */
    private computeTimeDomainAtTime(
        audioBuffer: AudioBuffer,
        timeInSeconds: number,
        fftSize: number,
    ): Uint8Array {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(timeInSeconds * sampleRate);
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const result = new Uint8Array(fftSize);

        for (let i = 0; i < fftSize; i++) {
            const sampleIndex = startSample + i;
            if (sampleIndex >= 0 && sampleIndex < channelData.length) {
                // Convert from -1..1 float to 0..255 byte (128 = silence)
                result[i] = Math.round((channelData[sampleIndex] + 1) * 128);
                result[i] = Math.max(0, Math.min(255, result[i]));
            } else {
                result[i] = 128; // Silence
            }
        }

        return result;
    }

    /**
     * Capture audio from the media element using an OfflineAudioContext
     * for frame-accurate audio encoding.
     */
    private async captureAudio(
        audioElement: HTMLVideoElement,
        audioContext: AudioContext,
        audioEncoder: AudioEncoder,
        duration: number,
    ): Promise<void> {
        const sampleRate = audioContext.sampleRate;
        const numberOfChannels = 2;
        const totalSamples = Math.ceil(duration * sampleRate);

        // Use MediaElementSource to capture audio via an OfflineAudioContext
        // Since we can't create another MediaElementSource from the same element,
        // we'll use a different approach: decode the audio from the media element's source.

        // Get the audio blob from the media element's source
        const response = await fetch(audioElement.src);
        const arrayBuffer = await response.arrayBuffer();

        // Decode the audio
        const offlineCtx = new OfflineAudioContext(numberOfChannels, totalSamples, sampleRate);
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

        // Encode audio in chunks (4096 samples per chunk)
        const chunkSize = 4096;
        const totalChunks = Math.ceil(audioBuffer.length / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Export cancelled.');
            }

            const offset = i * chunkSize;
            const length = Math.min(chunkSize, audioBuffer.length - offset);
            const timestampUs = Math.round((offset / sampleRate) * 1_000_000);

            const planarBuf = this.createPlanarBuffer(audioBuffer, offset, length, numberOfChannels);

            const audioData = new AudioData({
                format: 'f32-planar' as AudioSampleFormat,
                sampleRate,
                numberOfFrames: length,
                numberOfChannels,
                timestamp: timestampUs,
                data: planarBuf.buffer as ArrayBuffer,
            });

            audioEncoder.encode(audioData);
            audioData.close();
        }
    }

    /**
     * Create a planar Float32 buffer from an AudioBuffer.
     */
    private createPlanarBuffer(
        audioBuffer: AudioBuffer,
        offset: number,
        length: number,
        numberOfChannels: number,
    ): Float32Array {
        const planarData = new Float32Array(length * numberOfChannels);
        for (let ch = 0; ch < numberOfChannels; ch++) {
            const channelData = audioBuffer.getChannelData(Math.min(ch, audioBuffer.numberOfChannels - 1));
            const channelOffset = ch * length;
            for (let s = 0; s < length; s++) {
                planarData[channelOffset + s] = channelData[offset + s] ?? 0;
            }
        }
        return planarData;
    }

    /**
     * Cancel an in-progress export.
     */
    cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Check if an export is currently in progress.
     */
    get exporting(): boolean {
        return this.isExporting;
    }
}

// Singleton instance
export const webCodecsExporter = new WebCodecsExporter();
