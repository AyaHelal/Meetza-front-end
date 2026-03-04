import { useCallback } from "react";
import * as webrtcService from "../../../services/webrtcService";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Returns handleToggleAudio. All logic here; no refs in component.
 */
export function useMeetingToggleAudio(opts) {
  const {
    audioMuted,
    videoMuted,
    setAudioMuted,
    setContextAudioMuted,
    localStreamRef,
    peersRef,
    meetingIdRef,
    socket,
    ensureMediaTracks,
  } = opts;

  const handleToggleAudio = useCallback(async () => {
    const nextMuted = !audioMuted;
    if (nextMuted) {
      setAudioMuted(true);
      setContextAudioMuted(true);
      const stream = localStreamRef.current;
      if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = false));
    } else {
      const stream = localStreamRef.current;
      const existingAudio = stream?.getAudioTracks().filter((t) => t.readyState === "live") ?? [];
      if (existingAudio.length > 0) {
        existingAudio.forEach((t) => (t.enabled = true));
        for (const [, pc] of peersRef.current.entries()) {
          pc.getSenders()
            .filter((s) => s.track?.kind === "audio")
            .forEach((s) => {
              if (s.track) s.track.enabled = true;
            });
        }
        setAudioMuted(false);
        setContextAudioMuted(false);
      } else {
        try {
          if (stream) {
            stream.getAudioTracks().forEach((t) => {
              t.stop();
              stream.removeTrack(t);
            });
          }
          for (const [, pc] of peersRef.current.entries()) {
            pc.getSenders().filter((s) => s.track?.kind === "audio").forEach((s) => {
              try {
                if (s.track) s.track.stop();
                pc.removeTrack(s);
              } catch (e) {}
            });
          }
          await ensureMediaTracks({ needAudio: true, needVideo: false });
          const streamAfter = localStreamRef.current;
          if (!streamAfter) {
            setAudioMuted(true);
            setContextAudioMuted(true);
            return;
          }
          const audioTracks = streamAfter.getAudioTracks().filter((t) => t.readyState === "live");
          audioTracks.forEach((t) => (t.enabled = true));
          if (audioTracks.length === 0) {
            setAudioMuted(true);
            setContextAudioMuted(true);
            return;
          }
          for (const [peerSocketId, pc] of peersRef.current.entries()) {
            if (pc.signalingState === "closed" || pc.connectionState === "closed") continue;
            const senders = pc.getSenders().filter((s) => s.track?.kind === "audio" && s.track?.readyState === "live");
            if (senders.length === 0) {
              try {
                pc.addTrack(audioTracks[0], streamAfter);
                if (pc.signalingState === "stable") {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  const mid = meetingIdRef.current;
                  if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, offer, () => {});
                }
              } catch (err) {
                console.error("Error adding audio to peer", peerSocketId, err);
              }
            } else {
              const sender = senders[0];
              if (sender.track !== audioTracks[0]) {
                try {
                  await webrtcService.replaceTrack(sender, audioTracks[0]);
                } catch (err) {
                  console.error("Error replacing audio for peer", peerSocketId, err);
                }
              }
              if (sender.track) sender.track.enabled = true;
            }
          }
          setAudioMuted(false);
          setContextAudioMuted(false);
        } catch (err) {
          console.error("Failed to unmute audio:", err);
          setAudioMuted(true);
          setContextAudioMuted(true);
          return;
        }
      }
    }
    const mid = meetingIdRef.current;
    if (socket && mid) meetingSocketService.updateMediaState(socket, mid, nextMuted, videoMuted);
  }, [audioMuted, videoMuted, setAudioMuted, setContextAudioMuted, localStreamRef, peersRef, meetingIdRef, socket, ensureMediaTracks]);

  return { handleToggleAudio };
}
