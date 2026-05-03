import { useCallback } from "react";
import { getDisplayMediaForScreen } from "../services/meetingMediaService";
import { getCameraTrack, isScreenShareVideoTrack } from "../components/meetingRoomUtils";
import * as meetingSocketService from "../services/meetingSocketService";
import { smartToast } from "../../../API/toastManager";

/**
 * Returns handleToggleScreenShare. Start: getDisplayMedia, add screen track to peers, wire onended.
 * Stop: remove screen senders, renegotiate, restore camera stream.
 */
export function useMeetingScreenShare(opts) {
  const {
    screenSharing,
    setScreenSharing,
    videoMuted,
    localStreamRef,
    cameraVideoTrackRef,
    screenTrackRef,
    peersRef,
    meetingIdRef,
    socket,
    setLocalStream,
    localVideoRef,
    localVideoRef2,
    ensureLocalMedia,
  } = opts;

  const handleToggleScreenShare = useCallback(async () => {
    // Use ref as source of truth: if we have an active screen track, we're sharing → stop immediately (no picker).
    const currentScreenTrack = screenTrackRef.current;
    const isActuallySharing = currentScreenTrack && currentScreenTrack.readyState === "live";
    const shouldStop = screenSharing || isActuallySharing;

    if (shouldStop) {
      const stream = localStreamRef.current;
      const screenTrack = screenTrackRef.current;
      const mid = meetingIdRef.current;
      if (screenTrack) {
        screenTrack.onended = null;
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          const screenSender = pc.getSenders().find((s) => s.track && isScreenShareVideoTrack(s.track));
          if (screenSender) {
            try {
              pc.removeTrack(screenSender);
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, offer, () => {});
              }
            } catch (err) {
              console.error("Failed to remove screen track for", peerSocketId, err);
            }
          }
        }
        screenTrack.stop();
        screenTrackRef.current = null;
      }
      if (stream) {
        const cameraTrack = cameraVideoTrackRef.current;
        const restored = cameraTrack && !videoMuted
          ? new MediaStream([...stream.getAudioTracks(), cameraTrack])
          : new MediaStream(stream.getAudioTracks());
        localStreamRef.current = restored;
        setLocalStream(restored);
        if (localVideoRef?.current) localVideoRef.current.srcObject = restored;
        if (localVideoRef2?.current) localVideoRef2.current.srcObject = restored;
      }
      setScreenSharing(false);
      if (socket && meetingIdRef.current) meetingSocketService.screenShareStopped(socket, meetingIdRef.current, { socketId: socket.id });
      smartToast.info("Share screen stopped.");
      return {};
    }

    // Not sharing → start: show picker.
    let stream = localStreamRef.current;
    if (!stream) {
      try {
        stream = await ensureLocalMedia();
      } catch {
        return { error: "Could not start screen share. Please join the meeting first." };
      }
    }

    {
      try {
        const { screenTrack } = await getDisplayMediaForScreen();
        screenTrackRef.current = screenTrack;
        setScreenSharing(true);
        const mid = meetingIdRef.current;
        if (socket && mid) meetingSocketService.screenShareStarted(socket, mid, { socketId: socket.id });

        const streamForScreen = new MediaStream([...stream.getAudioTracks(), screenTrack]);
        for (const [peerSocketId, pc] of peersRef.current.entries()) {
          try {
            pc.addTrack(screenTrack, streamForScreen);
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              if (socket && mid) meetingSocketService.sendWebrtcOffer(socket, mid, peerSocketId, offer, () => {});
            }
          } catch (err) {
            console.error("Failed to add screen track for", peerSocketId, err);
          }
        }

        const cameraTrack = getCameraTrack(stream);
        const newStream = new MediaStream([
          ...stream.getAudioTracks(),
          ...(cameraTrack ? [cameraTrack] : []),
          screenTrack,
        ]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        if (localVideoRef?.current) localVideoRef.current.srcObject = newStream;
        if (localVideoRef2?.current) localVideoRef2.current.srcObject = newStream;

        screenTrack.onended = async () => {
          const m = meetingIdRef.current;
          try {
            for (const [peerSocketId, pc] of peersRef.current.entries()) {
              const screenSender = pc.getSenders().find((s) => s.track && isScreenShareVideoTrack(s.track));
              if (screenSender) {
                try {
                  pc.removeTrack(screenSender);
                  if (pc.signalingState === "stable") {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (socket && m) meetingSocketService.sendWebrtcOffer(socket, m, peerSocketId, offer, () => {});
                  }
                } catch (err) {
                  console.error("Failed to remove screen track for", peerSocketId, err);
                }
              }
            }
            const cam = cameraVideoTrackRef.current;
            const restored = cam && !videoMuted
              ? new MediaStream([...stream.getAudioTracks(), cam])
              : new MediaStream(stream.getAudioTracks());
            localStreamRef.current = restored;
            setLocalStream(restored);
            if (localVideoRef?.current) localVideoRef.current.srcObject = restored;
            if (localVideoRef2?.current) localVideoRef2.current.srcObject = restored;
          } finally {
            setScreenSharing(false);
            screenTrackRef.current = null;
            if (socket && m) meetingSocketService.screenShareStopped(socket, m, { socketId: socket.id });
            smartToast.info("Share screen stopped.");
          }
        };
      } catch (e) {
        console.error("Screen share failed:", e);
        setScreenSharing(false);
        return { error: "Screen share failed." };
      }
    }
    return {};
  }, [screenSharing, videoMuted, localStreamRef, cameraVideoTrackRef, screenTrackRef, peersRef, meetingIdRef, socket, setLocalStream, setScreenSharing, localVideoRef, localVideoRef2, ensureLocalMedia]);

  return { handleToggleScreenShare };
}
