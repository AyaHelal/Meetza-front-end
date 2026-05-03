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
  meetingSpeakerMuted,
  toggleFullscreenForScreenShare,
  toggleFullscreenForMember,
}) => {
  const firstSelfIndex = unifiedTiles.findIndex((t) => t?.isSelf);

  return (
    <div className="meeting-room-grid">
      {unifiedTiles.map((tile, index) => {
        const key = tile?.tileId || tile?.socketId || tile?.member_id || tile?.label;
        const isRemoteScreenShare = tile?.isScreenOnlyTile && !tile?.isSelf && !!tile?.stream;
        const handRaisedForTile = tile?.isSelf ? handRaised : handRaisedMap[tile?.socketId];
        const isFirstSelfTile = tile?.isSelf && index === firstSelfIndex;

        return (
          <MeetingRoomParticipantTile
            key={key}
            tile={tile}
            isFirstSelfTile={isFirstSelfTile}
            handRaisedForTile={handRaisedForTile}
            isRemoteScreenShare={isRemoteScreenShare}
            localVideoRef={localVideoRef}
            remoteVideoRefsMap={remoteVideoRefsMap}
            localParticipantAudioMuted={localParticipantAudioMuted}
            localParticipantVolume={localParticipantVolume}
            meetingSpeakerMuted={meetingSpeakerMuted}
            onToggleFullscreenScreenShare={toggleFullscreenForScreenShare}
            onToggleFullscreenMember={toggleFullscreenForMember}
          />
        );
      })}
    </div>
  );
};

export default MeetingRoomGrid;
