import React from "react";
import MeetingRoomParticipantTile from "./MeetingRoomParticipantTile";

const MeetingRoomGrid = ({
  unifiedTiles,
  handRaised,
  handRaisedMap,
  localVideoRef,
  remoteVideoRefsMap,
  localParticipantAudioMuted,
  localParticipantVolume,
  toggleFullscreenForScreenShare,
  toggleFullscreenForMember,
}) => {
  return (
    <div className="meeting-room-grid">
      {unifiedTiles.map((tile) => {
        const key = tile?.socketId || tile?.member_id || tile?.label;
        const isRemoteScreenShare = tile?.isScreenShare && !tile?.isSelf && !!tile?.stream;
        const handRaisedForTile = tile?.isSelf ? handRaised : handRaisedMap[tile?.socketId];

        return (
          <MeetingRoomParticipantTile
            key={key}
            tile={tile}
            handRaisedForTile={handRaisedForTile}
            isRemoteScreenShare={isRemoteScreenShare}
            localVideoRef={localVideoRef}
            remoteVideoRefsMap={remoteVideoRefsMap}
            localParticipantAudioMuted={localParticipantAudioMuted}
            localParticipantVolume={localParticipantVolume}
            onToggleFullscreenScreenShare={toggleFullscreenForScreenShare}
            onToggleFullscreenMember={toggleFullscreenForMember}
          />
        );
      })}
    </div>
  );
};

export default MeetingRoomGrid;
