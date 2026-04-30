import { useState, useRef, useEffect, useCallback } from 'react';

export const useVoiceRecording = (onFileReady) => {
    const [recording, setRecording] = useState(false);
    const [recordingError, setRecordingError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const discardRecordingRef = useRef(false);
    
    // Use a ref for the callback to avoid stale closures in the MediaRecorder onstop handler
    const onFileReadyRef = useRef(onFileReady);
    useEffect(() => {
        onFileReadyRef.current = onFileReady;
    }, [onFileReady]);

    const stopRecording = useCallback((discard = false) => {
        if (!mediaRecorderRef.current) {
            discardRecordingRef.current = false;
            setRecording(false);
            return;
        }
        discardRecordingRef.current = discard;
        const recorder = mediaRecorderRef.current;
        if (recorder.state === 'recording' || recorder.state === 'paused') {
            recorder.stop();
        } else {
            const stream = recorder.stream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            mediaRecorderRef.current = null;
            discardRecordingRef.current = false;
            setRecording(false);
        }
    }, []);

    useEffect(() => {
        return () => {
            stopRecording(true);
        };
    }, [stopRecording]);

    const startRecording = async () => {
        if (recording) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            setRecordingError('Voice recording is not supported in this browser');
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            setRecordingError('MediaRecorder is not supported in this browser');
            return;
        }
        setRecordingError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            
            const getSupportedMimeType = () => {
                const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
                for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
                return '';
            };
            
            const mimeType = getSupportedMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            
            recorder.ondataavailable = (event) => { 
                if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data); 
            };
            
            recorder.onerror = () => { 
                setRecordingError('Recording error occurred'); 
                stopRecording(true); 
            };
            
            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                const shouldDiscard = discardRecordingRef.current;
                discardRecordingRef.current = false;
                
                if (!shouldDiscard && audioChunksRef.current.length > 0) {
                    try {
                        const actualMimeType = recorder.mimeType || 'audio/webm';
                        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
                        
                        if (blob.size > 0) {
                            let extension = 'webm';
                            if (actualMimeType.includes('ogg')) extension = 'ogg';
                            else if (actualMimeType.includes('mp4')) extension = 'm4a';
                            else if (actualMimeType.includes('mpeg')) extension = 'mp3';
                            else if (actualMimeType.includes('wav')) extension = 'wav';
                            
                            const audioFile = new File([blob], `voice-${Date.now()}.${extension}`, { 
                                type: actualMimeType, 
                                lastModified: Date.now() 
                            });
                            
                            onFileReadyRef.current?.(audioFile, 'voice_note');
                        }
                    } catch (error) {
                        setRecordingError('Failed to create audio file: ' + error.message);
                    }
                }
                mediaRecorderRef.current = null;
                setRecording(false);
            };
            
            recorder.start(1000);
            setRecording(true);
        } catch (error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') setRecordingError('Microphone access denied.');
            else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') setRecordingError('No microphone found.');
            else setRecordingError('Failed to start recording: ' + error.message);
            setRecording(false);
        }
    };

    const handleRecordToggle = () => {
        if (recording) stopRecording(false);
        else startRecording();
    };

    return {
        recording,
        recordingError,
        setRecordingError,
        startRecording,
        stopRecording,
        handleRecordToggle
    };
};
