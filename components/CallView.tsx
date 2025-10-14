import React, { useEffect, useRef, useState } from 'react';
// FIX: Removed LiveSession as it is not an exported member of @google/genai
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils/audio';
import { ModelIcon, EndCallIcon, MuteIcon, UnmuteIcon, VideoIcon, CameraOffIcon } from './Icon';

const FRAME_RATE = 10; // Send 10 frames per second for video
const JPEG_QUALITY = 0.7;

interface CallViewProps {
  mode: 'audio' | 'video';
  onEndCall: (transcriptionHistory: string[]) => void;
}

export const CallView: React.FC<CallViewProps> = ({ mode, onEndCall }) => {
    const [status, setStatus] = useState('Connecting...');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [transcription, setTranscription] = useState<{ user: string; model: string }>({ user: '', model: '' });
    const transcriptionHistory = useRef<string[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // FIX: Changed LiveSession to any as it's not an exported type.
    const sessionPromise = useRef<Promise<any> | null>(null);
    const mediaStream = useRef<MediaStream | null>(null);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const outputAudioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set()).current;
    const nextStartTime = useRef(0);
    const frameInterval = useRef<number | null>(null);
    
    const cleanup = () => {
        console.log("Cleaning up call resources...");
        if (frameInterval.current) {
            clearInterval(frameInterval.current);
            frameInterval.current = null;
        }

        if (mediaStream.current) {
            mediaStream.current.getTracks().forEach(track => track.stop());
            mediaStream.current = null;
        }
        
        if (scriptProcessor.current) {
            scriptProcessor.current.disconnect();
            scriptProcessor.current = null;
        }
        
        inputAudioContext.current?.close().catch(console.error);
        outputAudioContext.current?.close().catch(console.error);
        
        audioSources.forEach(source => source.stop());
        audioSources.clear();

        sessionPromise.current?.then(session => session.close()).catch(console.error);
    };

    const endCall = () => {
        setStatus('Call ended');
        cleanup();
        onEndCall(transcriptionHistory.current);
    };

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

        const setupCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: mode === 'video'
                });
                mediaStream.current = stream;

                if (mode === 'video' && videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // FIX: Cast window to any to access browser-specific webkitAudioContext
                inputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                // FIX: Cast window to any to access browser-specific webkitAudioContext
                outputAudioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

                sessionPromise.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            setStatus('Connected');
                            const source = inputAudioContext.current!.createMediaStreamSource(stream);
                            const processor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessor.current = processor;
                            
                            processor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                // FIX: Use a more performant loop for audio data conversion.
                                const l = inputData.length;
                                const int16 = new Int16Array(l);
                                for (let i = 0; i < l; i++) {
                                    int16[i] = inputData[i] * 32768;
                                }
                                const pcmBlob: GenAIBlob = {
                                    data: encode(new Uint8Array(int16.buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };
                                // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
                                sessionPromise.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputAudioContext.current!.destination);

                             if (mode === 'video' && videoRef.current && canvasRef.current) {
                                const videoEl = videoRef.current;
                                const canvasEl = canvasRef.current;
                                const ctx = canvasEl.getContext('2d');
                                frameInterval.current = window.setInterval(() => {
                                    if (ctx && videoEl.readyState >= 2) {
                                        canvasEl.width = videoEl.videoWidth;
                                        canvasEl.height = videoEl.videoHeight;
                                        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                                        canvasEl.toBlob(
                                            async (blob) => {
                                                if (blob) {
                                                    const base64Data = await new Promise<string>(resolve => {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                                                        reader.readAsDataURL(blob);
                                                    });
                                                    sessionPromise.current?.then((session) => {
                                                        session.sendRealtimeInput({
                                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                                        });
                                                    });
                                                }
                                            },
                                            'image/jpeg',
                                            JPEG_QUALITY
                                        );
                                    }
                                }, 1000 / FRAME_RATE);
                            }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            // Handle transcriptions
                            if (message.serverContent?.inputTranscription) {
                                setTranscription(prev => ({...prev, user: prev.user + message.serverContent.inputTranscription.text}));
                            }
                             if (message.serverContent?.outputTranscription) {
                                setTranscription(prev => ({...prev, model: prev.model + message.serverContent.outputTranscription.text}));
                            }
                            if(message.serverContent?.turnComplete) {
                                setTranscription(prev => {
                                    if (prev.user.trim()) transcriptionHistory.current.push(`You: ${prev.user}`);
                                    if (prev.model.trim()) transcriptionHistory.current.push(`HITMi: ${prev.model}`);
                                    return { user: '', model: '' };
                                });
                            }

                            // Handle audio playback
                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData) {
                                const audioContext = outputAudioContext.current!;
                                nextStartTime.current = Math.max(nextStartTime.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.addEventListener('ended', () => audioSources.delete(source));
                                source.start(nextStartTime.current);
                                nextStartTime.current += audioBuffer.duration;
                                audioSources.add(source);
                            }

                            const interrupted = message.serverContent?.interrupted;
                            if (interrupted) {
                                for (const source of audioSources.values()) {
                                    source.stop();
                                }
                                audioSources.clear();
                                nextStartTime.current = 0;
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                           console.error(e);
                           setStatus('Connection error. Please try again.');
                        },
                        onclose: () => {
                            setStatus('Connection closed.');
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction: 'You are HITMi, a helpful guide. Keep your responses conversational and brief.',
                    },
                });

            } catch (err) {
                console.error("Error setting up call:", err);
                setStatus('Failed to start call. Check permissions.');
            }
        };

        setupCall();
        return () => cleanup();
    }, [mode]);

    useEffect(() => {
        if (mediaStream.current) {
            mediaStream.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
        }
    }, [isMuted]);

    useEffect(() => {
        if (mediaStream.current) {
            mediaStream.current.getVideoTracks().forEach(track => track.enabled = !isCameraOff);
        }
    }, [isCameraOff]);

    return (
        <div className="absolute inset-0 bg-gray-900 text-white flex flex-col items-center justify-center z-50">
            {mode === 'video' && (
                <>
                 <video ref={videoRef} autoPlay playsInline muted className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}></video>
                 <canvas ref={canvasRef} className="hidden"></canvas>
                 <div className="absolute inset-0 bg-black/50"></div>
                </>
            )}
            
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 h-full w-full">
                <div className="absolute top-8">
                    <ModelIcon className="h-12 w-12 text-blue-400 mx-auto" />
                    <p className="mt-2 text-lg font-medium tracking-wider">{status}</p>
                </div>

                <div className="flex-grow flex flex-col justify-center items-center w-full max-w-4xl space-y-2 overflow-y-auto p-4">
                     {transcriptionHistory.current.map((line, index) => (
                        <p key={index} className="text-gray-400 text-lg">{line}</p>
                     ))}
                     {transcription.user && <p className="text-white text-xl font-semibold">{`You: ${transcription.user}`}</p>}
                     {transcription.model && <p className="text-blue-300 text-xl font-semibold">{`HITMi: ${transcription.model}`}</p>}
                </div>
                
                <div className="absolute bottom-8 flex items-center space-x-6">
                    <button onClick={() => setIsMuted(prev => !prev)} className="bg-white/10 p-4 rounded-full" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? <UnmuteIcon className="h-6 w-6 text-yellow-400" /> : <MuteIcon className="h-6 w-6" />}
                    </button>
                    {mode === 'video' && (
                        <button onClick={() => setIsCameraOff(prev => !prev)} className="bg-white/10 p-4 rounded-full" aria-label={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}>
                            {isCameraOff ? <CameraOffIcon className="h-6 w-6 text-yellow-400" /> : <VideoIcon className="h-6 w-6" />}
                        </button>
                    )}
                    <button onClick={endCall} className="bg-red-600 p-4 rounded-full" aria-label="End Call">
                        <EndCallIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};