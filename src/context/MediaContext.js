import { createContext, useContext, useRef, useState, useCallback } from "react";
import { useSocket } from "./SocketContext";
import * as meetingSocketService from "../pages/Meetings/services/meetingSocketService";
import * as webrtcService from "../services/webrtcService";

const MediaContext = createContext(null);

export const useMediaContext = () => {
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error("useMediaContext must be used within a MediaProvider");
    }
    return context;
};

/**
 * MediaProvider manages persistent media streams (mic/camera) across the entire app.
 * This ensures mic/camera stay active even when navigating between pages.
 * 
 * Features:
 * - Persistent refs that survive component unmounts
 * - State management for audio/video muted state
 * - Direct control of media streams
 * - WebRTC peer connection management for meeting synchronization
 */
export const MediaProvider = ({ children }) => {
    // Get socket for emitting media state updates even when not in meeting page
    const { socket } = useSocket();

    // Persistent refs that survive component unmounts
    const localStreamRef = useRef(null);
    const cameraVideoTrackRef = useRef(null);
    const screenTrackRef = useRef(null);

    // Store peer connections and meeting state so we can trigger renegotiation even when MeetingRoom is not mounted
    const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
    const meetingIdRef = useRef(null);
    const hasJoinedRef = useRef(false);

    // Functions to register/unregister peer connections from MeetingRoom
    const registerPeerConnection = useCallback((socketId, pc) => {
        peersRef.current.set(socketId, pc);
    }, []);

    const unregisterPeerConnection = useCallback((socketId) => {
        peersRef.current.delete(socketId);
    }, []);

    const setMeetingId = useCallback((id) => {
        meetingIdRef.current = id;
    }, []);

    const setHasJoined = useCallback((joined) => {
        hasJoinedRef.current = joined;
    }, []);

    // State for muted status (persisted in sessionStorage)
    const [audioMuted, setAudioMutedState] = useState(() => {
        try {
            const v = sessionStorage.getItem("meetza_audioMuted");
            return v !== null ? v === "true" : true;
        } catch { return true; }
    });

    const [videoMuted, setVideoMutedState] = useState(() => {
        try {
            const v = sessionStorage.getItem("meetza_videoMuted");
            return v !== null ? v === "true" : true;
        } catch { return true; }
    });

    // Mute meeting speaker (when outside meeting page) - only affects local playback
    const [meetingSpeakerMuted, setMeetingSpeakerMutedState] = useState(false);
    /** Refs from MeetingRoom: { remoteVideoRefsMap, localParticipantAudioMutedRef, localParticipantVolumeRef } */
    const meetingMediaRefsRef = useRef(null);

    const setMeetingSpeakerMuted = useCallback((valueOrUpdater) => {
        setMeetingSpeakerMutedState((prev) => {
            const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
            const refs = meetingMediaRefsRef.current;
            if (refs?.remoteVideoRefsMap?.current) {
                try {
                    const map = refs.remoteVideoRefsMap.current;
                    const lap = refs.localParticipantAudioMutedRef?.current ?? {};
                    const lpv = refs.localParticipantVolumeRef?.current ?? {};
                    map.forEach((el, socketId) => {
                        if (el) {
                            el.muted = !!next || !!lap[socketId];
                            el.volume = next ? 0 : (lpv[socketId] ?? 1);
                        }
                    });
                } catch (e) {
                }
            }
            return next;
        });
    }, []);

    const setMeetingMediaRefs = useCallback((refs) => {
        meetingMediaRefsRef.current = refs;
    }, []);

    // Persist state to sessionStorage
    const setAudioMuted = useCallback((muted) => {
        setAudioMutedState(muted);
        try {
            sessionStorage.setItem("meetza_audioMuted", String(muted));
        } catch { }
    }, []);

    const setVideoMuted = useCallback((muted) => {
        setVideoMutedState(muted);
        try {
            sessionStorage.setItem("meetza_videoMuted", String(muted));
        } catch { }
    }, []);

    // Toggle audio (mic) - always manages streams, and syncs with meeting if active
    const toggleAudio = useCallback(async () => {
        const newMuted = !audioMuted;
        const stream = localStreamRef.current;

        if (!stream) {
            try {
                const newStream = await webrtcService.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false,
                });
                localStreamRef.current = newStream;
                setAudioMuted(newMuted);
                newStream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
            } catch (e) {
                console.error("Failed to get audio:", e);
                return;
            }
        } else {
            setAudioMuted(newMuted);
            
            // If stream exists but has NO audio tracks, we must fetch them
            if (stream.getAudioTracks().length === 0 && !newMuted) {
                try {
                    const audioMedia = await webrtcService.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                        video: false,
                    });
                    audioMedia.getAudioTracks().forEach(t => {
                        t.enabled = true;
                        stream.addTrack(t);
                    });
                } catch (e) {
                    console.error("Failed to get audio track to attach:", e);
                    setAudioMuted(true);
                    return;
                }
            } else {
                stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
            }
        }

        // If in a meeting, emit socket event and trigger WebRTC renegotiation
        const activeMeetingId = sessionStorage.getItem("activeMeetingId") || meetingIdRef.current;
        if (activeMeetingId && socket) {
            // Emit socket event to notify other participants (even if MeetingRoom is not mounted)
            meetingSocketService.updateMediaState(socket, activeMeetingId, newMuted, videoMuted);

            // If turning mic back on, ensure audio tracks are in peer connections and renegotiate (عشان الباقي يسمعك لو فتحت المايك وانت برة صفحة الميتينج)
            if (!newMuted && hasJoinedRef.current) {
                const stream = localStreamRef.current;
                const audioTracks = stream ? stream.getAudioTracks().filter(t => t.readyState === "live") : [];

                if (stream && audioTracks.length > 0) {
                    audioTracks.forEach(t => t.enabled = true);

                    for (const [peerSocketId, pc] of peersRef.current.entries()) {
                        if (pc.signalingState === "closed" || pc.connectionState === "closed") continue;
                        const audioSenders = pc.getSenders().filter(s => s.track && s.track.kind === "audio");

                        if (audioSenders.length === 0) {
                            try {
                                webrtcService.addTrack(pc, audioTracks[0], stream);
                            } catch (err) {
                                console.error("❌ Error adding audio track to peer:", err);
                            }
                        } else {
                            const sender = audioSenders[0];
                            const track = audioTracks[0];
                            if (sender.track !== track) {
                                try {
                                    await webrtcService.replaceTrack(sender, track);
                                } catch (err) {
                                    console.error("❌ Error replacing audio track:", err);
                                }
                            } else {
                                sender.track.enabled = true;
                            }
                        }
                    }
                } else if (!stream || audioTracks.length === 0) {
                    // This block theoretically shouldn't be hit anymore because the top logic ensures the track is added,
                    // but we keep/fix it for safety in case stream tracks are dropped externally.
                    try {
                        const audioMedia = await webrtcService.getUserMedia({
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                            video: false,
                        });
                        const newAudioTracks = audioMedia.getAudioTracks();
                        newAudioTracks.forEach(t => t.enabled = true);
                        
                        let currentStream = localStreamRef.current;
                        if (!currentStream) {
                            currentStream = webrtcService.createEmptyStream();
                            localStreamRef.current = currentStream;
                        }
                        
                        newAudioTracks.forEach(t => currentStream.addTrack(t));

                        // Add to all peer connections
                        for (const [, pc] of peersRef.current.entries()) {
                            newAudioTracks.forEach(track => {
                                try {
                                    webrtcService.addTrack(pc, track, currentStream);
                                } catch (err) {
                                    console.error("❌ Error adding audio track to peer:", err);
                                }
                            });
                        }
                    } catch (err) {
                        console.error("❌ Error getting audio track:", err);
                        setAudioMuted(true); // Revert on error
                        return;
                    }
                }
            }

            // Trigger WebRTC renegotiation for all peer connections (works even when MeetingRoom is not mounted)
            if (hasJoinedRef.current && peersRef.current.size > 0) {
                for (const [peerSocketId, pc] of peersRef.current.entries()) {
                    try {
                        webrtcService.createOffer(pc).then(offer => {
                            webrtcService.setLocalDescription(pc, offer).then(() => {
                                meetingSocketService.sendWebrtcOffer(socket, activeMeetingId, peerSocketId, offer, () => {});
                            }).catch(err => console.error("❌ Error renegotiating after audio toggle:", err));
                        }).catch(err => console.error("❌ Error creating offer after audio toggle:", err));
                    } catch (err) {
                        console.error("❌ Error in audio toggle renegotiation:", err);
                    }
                }
            }

            // Dispatch event with new state to trigger MeetingRoom's update if it's mounted
            window.dispatchEvent(new CustomEvent('toggleMeetingAudio', {
                detail: { audioMuted: newMuted, videoMuted }
            }));
        }
    }, [audioMuted, videoMuted, socket, setAudioMuted]);

    // Toggle video (camera) - always manages streams, and syncs with meeting if active
    const toggleVideo = useCallback(async () => {
        const newMuted = !videoMuted;
        const stream = localStreamRef.current;

        // Always manage the stream in MediaContext
        if (!stream) {
            try {
                const newStream = webrtcService.createEmptyStream();
                if (!newMuted) {
                    // Only request video here, decouple it from audio
                    const mediaStream = await webrtcService.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                        audio: false,
                    });
                    const videoTrack = mediaStream.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.enabled = true;
                        newStream.addTrack(videoTrack);
                        cameraVideoTrackRef.current = videoTrack;
                    }
                }
                localStreamRef.current = newStream;
                setVideoMuted(newMuted);
            } catch (e) {
                console.error("Failed to get video:", e);
                return;
            }
        } else {
            setVideoMuted(newMuted);

            if (newMuted) {
                // Turn off camera
                const cameraTrack = cameraVideoTrackRef.current;
                if (cameraTrack) {
                    cameraTrack.enabled = false;
                }
            } else {
                // Turn on camera
                const cameraTrack = cameraVideoTrackRef.current;
                if (cameraTrack) {
                    cameraTrack.enabled = true;
                } else {
                    try {
                        const mediaStream = await webrtcService.getUserMedia({
                            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                            audio: false,
                        });
                        const videoTrack = mediaStream.getVideoTracks()[0];
                        if (videoTrack) {
                            videoTrack.enabled = true;
                            stream.addTrack(videoTrack);
                            cameraVideoTrackRef.current = videoTrack;
                        }
                    } catch (e) {
                        console.error("Failed to get video:", e);
                        setVideoMuted(true); // Revert on error
                        return;
                    }
                }
            }
        }

        // If in a meeting, emit socket event and trigger WebRTC renegotiation
        const activeMeetingId = sessionStorage.getItem("activeMeetingId") || meetingIdRef.current;
        if (activeMeetingId && socket) {
            // Emit socket event to notify other participants (even if MeetingRoom is not mounted)
            meetingSocketService.updateMediaState(socket, activeMeetingId, audioMuted, newMuted);

            // If turning camera back on, ensure video track is added to peer connections
            if (!newMuted && hasJoinedRef.current) {
                const stream = localStreamRef.current;
                const cameraTrack = cameraVideoTrackRef.current;

                if (stream && cameraTrack) {
                    // Ensure track is enabled
                    cameraTrack.enabled = true;

                    // Add or replace track in all peer connections
                    for (const [, pc] of peersRef.current.entries()) {
                        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (!videoSender) {
                            try {
                                webrtcService.addTrack(pc, cameraTrack, stream);
                            } catch (err) {
                                console.error("❌ Error adding video track to peer:", err);
                            }
                        } else if (videoSender.track !== cameraTrack) {
                            try {
                                webrtcService.replaceTrack(videoSender, cameraTrack).then(() => {
                                }).catch(err => console.error("❌ Error replacing video track:", err));
                            } catch (err) {
                                console.error("❌ Error replacing video track:", err);
                            }
                        } else {
                            // Same track, just ensure it's enabled
                            videoSender.track.enabled = true;
                        }
                    }
                }
            }

            // Trigger WebRTC renegotiation for all peer connections (works even when MeetingRoom is not mounted)
            if (hasJoinedRef.current && peersRef.current.size > 0) {
                for (const [peerSocketId, pc] of peersRef.current.entries()) {
                    try {
                        webrtcService.createOffer(pc).then(offer => {
                            webrtcService.setLocalDescription(pc, offer).then(() => {
                                meetingSocketService.sendWebrtcOffer(socket, activeMeetingId, peerSocketId, offer, () => {});
                            }).catch(err => console.error("❌ Error renegotiating after video toggle:", err));
                        }).catch(err => console.error("❌ Error creating offer after video toggle:", err));
                    } catch (err) {
                        console.error("❌ Error in video toggle renegotiation:", err);
                    }
                }
            }

            // Dispatch event with new state to trigger MeetingRoom's update if it's mounted
            window.dispatchEvent(new CustomEvent('toggleMeetingVideo', {
                detail: { audioMuted, videoMuted: newMuted }
            }));
        }
    }, [videoMuted, audioMuted, socket, setVideoMuted]);

    const stopAllTracks = useCallback(() => {
        webrtcService.stopAllTracks(localStreamRef.current);
        localStreamRef.current = null;
        cameraVideoTrackRef.current = null;
        screenTrackRef.current = null;
    }, []);

    // Function to get existing peer connections (for restoring state when returning)
    const getPeerConnections = useCallback(() => {
        return peersRef.current;
    }, []);

    const value = {
        localStreamRef,
        cameraVideoTrackRef,
        screenTrackRef,
        audioMuted,
        videoMuted,
        meetingSpeakerMuted,
        setMeetingSpeakerMuted,
        setMeetingMediaRefs,
        toggleAudio,
        toggleVideo,
        setAudioMuted,
        setVideoMuted,
        stopAllTracks,
        // Functions for MeetingRoom to register peer connections
        registerPeerConnection,
        unregisterPeerConnection,
        getPeerConnections,
        setMeetingId,
        setHasJoined,
    };

    return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

