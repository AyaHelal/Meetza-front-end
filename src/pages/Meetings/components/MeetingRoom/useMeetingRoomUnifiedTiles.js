import { useMemo } from "react";

/**
 * One tile per participant. Priority: screen share > camera > profile.
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
}) {
  return useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return list.map((p) => {
      const sid = p?.socketId || p?.id;
      const isSelf = sid === socket?.id || (selfMemberId && String(p?.member_id) === String(selfMemberId));
      let stream = null;
      let isScreenShare = false;
      if (isSelf) {
        stream = localStreamRef?.current ?? null;
        isScreenShare = screenSharing;
      } else {
        const entry = remoteStreams.find((x) => x.socketId === sid);
        stream = entry?.stream ?? null;
        isScreenShare = entry?.isScreenShare ?? false;
      }
      const remoteMediaState = !isSelf ? mediaStateMap[sid] : null;
      const remoteVideoMuted = remoteMediaState?.videoMuted ?? true;
      const hasVideoTracks = stream && stream.getVideoTracks().length > 0;
      const showVideo = stream && hasVideoTracks && (
        isSelf
          ? (!videoMuted || isScreenShare)
          : (!remoteVideoMuted || isScreenShare)
      );
      return {
        ...p,
        isSelf,
        stream: showVideo ? stream : null,
        isScreenShare,
        label: p?.member_name || p?.member_email || "Participant",
        member_photo: p?.member_photo || p?.memberPhoto || p?.user_photo || p?.photo || null,
      };
    });
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing, mediaStateMap, localStreamRef]);
}
