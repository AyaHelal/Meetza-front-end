import { useMemo } from "react";
import { getCameraTrack, getScreenShareTrack } from "../components/meetingRoomUtils";

/**
 * Unified tiles for grid/slider. Returns unifiedTiles, memberTiles, adminTile, adminTileForMembers.
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
  isMeetingAdmin,
  meetingInfo,
  currentUserFromToken,
}) {
  const unifiedTiles = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    const tiles = [];

    list.forEach((p) => {
      const sid = p?.socketId || p?.id;
      const isSelf = sid === socket?.id || (selfMemberId && String(p?.member_id) === String(selfMemberId));
      const nameFromToken = currentUserFromToken?.name;
      const photoFromToken = currentUserFromToken?.photo || currentUserFromToken?.user_photo;
      const base = {
        ...p,
        isSelf,
        label: isSelf && nameFromToken ? nameFromToken : (p?.member_name || p?.member_email || "Participant"),
        member_photo: isSelf && photoFromToken ? photoFromToken : (p?.member_photo || p?.memberPhoto || p?.user_photo || p?.photo || null),
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
  }, [participants, remoteStreams, socket?.id, selfMemberId, videoMuted, screenSharing, mediaStateMap, localStreamRef, localStream, currentUserFromToken]);

  const { memberTiles, adminTile } = useMemo(() => {
    if (!isMeetingAdmin) {
      return { memberTiles: unifiedTiles, adminTile: null };
    }
    const members = unifiedTiles.filter((tile) => !tile.isSelf);
    const adminScreenTile = unifiedTiles.find((tile) => tile.isSelf && tile.isScreenShare);
    const adminCameraTile = unifiedTiles.find((tile) => tile.isSelf && !tile.isScreenShare);
    const admin = adminScreenTile || adminCameraTile || null;
    return { memberTiles: members, adminTile: admin };
  }, [unifiedTiles, isMeetingAdmin]);

  const adminTileForMembers = useMemo(() => {
    if (isMeetingAdmin || !meetingInfo?.administrator_id) return null;
    const adminTiles = unifiedTiles.filter((tile) => {
      const tileUserId = tile?.member_id || tile?.user_id || tile?.userId || tile?.id;
      return tileUserId && String(tileUserId) === String(meetingInfo.administrator_id);
    });
    if (!adminTiles.length) return null;
    const screenTile = adminTiles.find((tile) => tile.isScreenShare);
    return screenTile || adminTiles[0] || null;
  }, [unifiedTiles, meetingInfo?.administrator_id, isMeetingAdmin]);

  return { unifiedTiles, memberTiles, adminTile, adminTileForMembers };
}
