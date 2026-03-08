import { useCallback } from "react";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Returns handleToggleVideo. Refs/setters from opts.
 */
export function useMeetingToggleVideo(opts) {
  const {
    videoMuted,
    audioMuted,
    screenSharing,
    setVideoMuted,
    setContextVideoMuted,
    localStreamRef,
    cameraVideoTrackRef,
    peersRef,
    meetingIdRef,
    makingOfferRef,
    socket,
    ensureMediaTracks,
    setLocalStream,
    localVideoRef,
    localVideoRef2,
  } = opts;

  const handleToggleVideo = useCallback(async () => {
    const nextMuted = !videoMuted;
    const mid = meetingIdRef.current;
    if (nextMuted) {
      setVideoMuted(true);
      setContextVideoMuted(true);
      const cameraTrack = cameraVideoTrackRef.current;
      if (cameraTrack) cameraTrack.enabled = false;
    } else {
      try {
        await ensureMediaTracks({ needVideo: true });
        const cameraTrack = cameraVideoTrackRef.current;
        if (!cameraTrack) {
          setVideoMuted(true);
          setContextVideoMuted(true);
          return;
        }
        cameraTrack.enabled = true;
        const stream = localStreamRef.current;
        if (screenSharing) {
          for (const [peerSocketId, pc] of peersRef.current.entries()) {
            if (pc.signalingState === "closed" || pc.connectionState === "closed") continue;
            const already = pc.getSenders().some((s) => s.track === cameraTrack);
            if (!already) {
              try {
                pc.addTrack(cameraTrack, stream);
                if (pc.signalingState === "stable" && !makingOfferRef.current) {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, offer, () => {});
                }
              } catch (err) {
              }
            }
          }
        }
        if (localVideoRef?.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        if (localVideoRef2?.current) {
          localVideoRef2.current.srcObject = stream;
          localVideoRef2.current.play().catch(() => {});
        }
        setLocalStream(stream);
        setVideoMuted(false);
        setContextVideoMuted(false);
      } catch (err) {
        console.error("Failed to turn on camera:", err);
        setVideoMuted(true);
        setContextVideoMuted(true);
        return;
      }
    }
    if (socket && mid) meetingSocketService.updateMediaState(socket, mid, audioMuted, nextMuted);
  }, [videoMuted, audioMuted, screenSharing, setVideoMuted, setContextVideoMuted, localStreamRef, cameraVideoTrackRef, peersRef, meetingIdRef, makingOfferRef, socket, ensureMediaTracks, setLocalStream, localVideoRef, localVideoRef2]);

  return { handleToggleVideo };
}
