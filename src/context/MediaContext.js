import { createContext, useContext, useRef, useState, useCallback } from "react";
import { useSocket } from "./SocketContext";

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

        // Always manage the stream in MediaContext
        if (!stream) {
            // Create stream if it doesn't exist
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
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
            stream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
        }

        // If in a meeting, emit socket event and trigger WebRTC renegotiation
        const activeMeetingId = sessionStorage.getItem("activeMeetingId") || meetingIdRef.current;
        if (activeMeetingId && socket) {
            // Emit socket event to notify other participants (even if MeetingRoom is not mounted)
            socket.emit("updateMediaState", {
                meetingId: activeMeetingId,
                audioMuted: newMuted,
                videoMuted
            });

            // If turning mic back on, ensure audio tracks are added to peer connections
            if (!newMuted && hasJoinedRef.current) {
                const stream = localStreamRef.current;
                const audioTracks = stream ? stream.getAudioTracks() : [];

                if (stream && audioTracks.length > 0) {
                    // Ensure tracks are enabled
                    audioTracks.forEach(t => t.enabled = true);

                    // Add or replace audio tracks in all peer connections
                    for (const [, pc] of peersRef.current.entries()) {
                        const audioSenders = pc.getSenders().filter(s => s.track && s.track.kind === 'audio');

                        // If no audio senders, add all audio tracks
                        if (audioSenders.length === 0) {
                            audioTracks.forEach(track => {
                                try {
                                    pc.addTrack(track, stream);
                                    console.log("➕ Added audio track to peer connection from MediaContext");
                                } catch (err) {
                                    console.error("❌ Error adding audio track to peer:", err);
                                }
                            });
                        } else {
                            // Replace existing audio tracks or ensure they're enabled
                            audioTracks.forEach((track, index) => {
                                const sender = audioSenders[index];
                                if (sender) {
                                    if (sender.track !== track) {
                                        // Different track, replace it
                                        try {
                                            sender.replaceTrack(track).then(() => {
                                                console.log("🔄 Replaced audio track in peer connection from MediaContext");
                                            }).catch(err => console.error("❌ Error replacing audio track:", err));
                                        } catch (err) {
                                            console.error("❌ Error replacing audio track:", err);
                                        }
                                    } else {
                                        // Same track, just ensure it's enabled
                                        sender.track.enabled = true;
                                    }
                                } else {
                                    // More tracks than senders, add the new one
                                    try {
                                        pc.addTrack(track, stream);
                                        console.log("➕ Added additional audio track to peer connection from MediaContext");
                                    } catch (err) {
                                        console.error("❌ Error adding additional audio track to peer:", err);
                                    }
                                }
                            });
                        }
                    }
                } else if (!stream) {
                    // No stream exists, need to get it
                    try {
                        const newStream = await navigator.mediaDevices.getUserMedia({
                            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                            video: false,
                        });
                        localStreamRef.current = newStream;
                        const newAudioTracks = newStream.getAudioTracks();
                        newAudioTracks.forEach(t => t.enabled = true);

                        // Add to all peer connections
                        for (const [, pc] of peersRef.current.entries()) {
                            newAudioTracks.forEach(track => {
                                try {
                                    pc.addTrack(track, newStream);
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
                        pc.createOffer().then(offer => {
                            pc.setLocalDescription(offer).then(() => {
                                socket.emit("webrtcOffer", {
                                    toSocketId: peerSocketId,
                                    meetingId: activeMeetingId,
                                    sdp: offer
                                }, () => { });
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
            // Create stream if it doesn't exist
            try {
                const newStream = new MediaStream();
                if (!newMuted) {
                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    });
                    const videoTrack = mediaStream.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.enabled = true;
                        newStream.addTrack(videoTrack);
                        cameraVideoTrackRef.current = videoTrack;
                    }
                    // Add audio tracks
                    mediaStream.getAudioTracks().forEach((t) => {
                        t.enabled = !audioMuted;
                        newStream.addTrack(t);
                    });
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
                    // Need to get camera track
                    try {
                        const mediaStream = await navigator.mediaDevices.getUserMedia({
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
            socket.emit("updateMediaState", {
                meetingId: activeMeetingId,
                audioMuted,
                videoMuted: newMuted
            });

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
                            // No video sender, add track
                            try {
                                pc.addTrack(cameraTrack, stream);
                                console.log("➕ Added video track to peer connection from MediaContext");
                            } catch (err) {
                                console.error("❌ Error adding video track to peer:", err);
                            }
                        } else if (videoSender.track !== cameraTrack) {
                            // Different track, replace it
                            try {
                                videoSender.replaceTrack(cameraTrack).then(() => {
                                    console.log("🔄 Replaced video track in peer connection from MediaContext");
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
                        pc.createOffer().then(offer => {
                            pc.setLocalDescription(offer).then(() => {
                                socket.emit("webrtcOffer", {
                                    toSocketId: peerSocketId,
                                    meetingId: activeMeetingId,
                                    sdp: offer
                                }, () => { });
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

    // Stop all tracks (cleanup)
    const stopAllTracks = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
        }
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

