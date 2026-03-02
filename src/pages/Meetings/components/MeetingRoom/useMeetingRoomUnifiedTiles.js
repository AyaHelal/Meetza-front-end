import { useMemo } from "react";
import { getCameraTrack, getScreenShareTrack } from "./meetingRoomUtils";

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
      const base = {
        ...p,
        isSelf,
        label: p?.member_name || p?.member_email || "Participant",
        member_photo: p?.member_photo || p?.memberPhoto || p?.user_photo || p?.photo || null,
      };

      if (isSelf) {
        const stream = localStream ?? localStreamRef?.current ?? null;

        let cameraStream = null;
        if (screenSharing) {
          const cameraTrack = stream ? getCameraTrack(stream) : null;
          if (cameraTrack && cameraTrack.readyState === "live") {
            const audioTracks = stream ? stream.getAudioTracks() : [];
            cameraStream = new MediaStream([cameraTrack, ...audioTracks]);
          }
        } else {
          cameraStream = stream;
        }
        const showCameraVideo = cameraStream && !videoMuted &&
          cameraStream.getVideoTracks?.().some?.((t) => t.readyState === "live");
        tiles.push({
          ...base,
          stream: cameraStream,
          isScreenShare: false,
          isScreenOnlyTile: false,
          showVideo: !!showCameraVideo,
        });

        if (screenSharing) {
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
        }
      } else {
        const entries = remoteStreams.filter((x) => x.socketId === sid);
        const remoteVideoMuted = (mediaStateMap[sid] ?? null)?.videoMuted ?? true;

        entries.forEach((entry) => {
          const stream = entry?.stream ?? null;
          const isScreen = entry?.isScreenShare === true;
          if (!stream) return;
          // Screen-share tile needs a video track; camera tile can have 0 video tracks (show placeholder)
          if (isScreen && !stream.getVideoTracks?.().length) return;

          const showVideo = isScreen || !remoteVideoMuted;
          tiles.push({
            ...base,
            tileId: isScreen ? `${sid}-screen` : sid,
            stream,
            isScreenShare: isScreen,
            isScreenOnlyTile: isScreen,
            showVideo: !!showVideo,
            label: isScreen ? base.label + " (Screen)" : base.label,
          });
        });
      }
    });

    return tiles;
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing, mediaStateMap, localStreamRef, localStream]);
}
