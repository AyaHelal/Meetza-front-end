import { useMemo } from "react";
import { getCameraTrack, getScreenShareTrack, isScreenShareVideoTrack } from "./meetingRoomUtils";

/**
 */
export function useMeetingRoomUnifiedTiles({
  participants,
  remoteStreams,
  socket,
  selfMemberId,
  videoMuted,
  screenSharing,
  mediaStateMap,
  localStreamRef,
  localStream,
}) {
  return useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    const tiles = [];

    list.forEach((p) => {
      const sid = p?.socketId || p?.id;
      const isSelf = sid === socket?.id || (selfMemberId && String(p?.member_id) === String(selfMemberId));
      let stream = null;
      let remoteIsScreenShare = false;
      if (isSelf) {
        stream = localStream ?? localStreamRef?.current ?? null;
      } else {
        const entry = remoteStreams.find((x) => x.socketId === sid);
        stream = entry?.stream ?? null;
        remoteIsScreenShare = entry?.isScreenShare ?? false;
      }

      const remoteMediaState = !isSelf ? mediaStateMap[sid] : null;
      const remoteVideoMuted = remoteMediaState?.videoMuted ?? true;
      const base = {
        ...p,
        isSelf,
        label: p?.member_name || p?.member_email || "Participant",
        member_photo: p?.member_photo || p?.memberPhoto || p?.user_photo || p?.photo || null,
      };

      let cameraStream = null;
      if (isSelf) {
        if (screenSharing) {
          const cameraTrack = stream ? getCameraTrack(stream) : null;
          if (cameraTrack && cameraTrack.readyState === "live") {
            const audioTracks = stream ? stream.getAudioTracks() : [];
            cameraStream = new MediaStream([cameraTrack, ...audioTracks]);
          }
        } else {
          cameraStream = stream;
        }
      } else {
        if (!remoteIsScreenShare && stream && stream.getTracks?.().some((t) => t.readyState === "live")) {
          cameraStream = stream;
        }
      }

      const showCameraVideo = cameraStream && (isSelf ? !videoMuted : !remoteVideoMuted) &&
        cameraStream.getVideoTracks?.().some?.((t) => t.readyState === "live");

      tiles.push({
        ...base,
        stream: cameraStream,
        isScreenShare: false,
        isScreenOnlyTile: false,
        showVideo: !!showCameraVideo,
      });

      if (isSelf && screenSharing) {
        const screenTrack = stream ? getScreenShareTrack(stream) : null;
        const screenStream = screenTrack
          ? new MediaStream([screenTrack, ...(stream ? stream.getAudioTracks() : [])])
          : null;
        if (screenStream) {
          tiles.push({
            ...base,
            tileId: `${sid}-screen`,
            stream: screenStream,
            isScreenShare: true,
            isScreenOnlyTile: true,
            showVideo: true,
            label: base.label + " (Screen)",
          });
        }
      } else if (!isSelf && remoteIsScreenShare && stream) {
        const liveTracks = stream.getTracks().filter((t) => t.readyState === "live");
        const hasScreen = liveTracks.some((t) => t.kind === "video" && isScreenShareVideoTrack(t));
        if (hasScreen) {
          tiles.push({
            ...base,
            tileId: `${sid}-screen`,
            stream: new MediaStream(liveTracks),
            isScreenShare: true,
            isScreenOnlyTile: true,
            showVideo: true,
            label: base.label + " (شاشة)",
          });
        }
      }
    });

    return tiles;
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing, mediaStateMap, localStreamRef, localStream]);
}
