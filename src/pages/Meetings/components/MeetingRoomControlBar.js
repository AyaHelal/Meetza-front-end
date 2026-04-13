import React from "react";
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  HandWaving,
  MonitorArrowUp,
  Smiley,
  ChatCircleDots,
  SpeakerHigh,
  SpeakerSlash,
  ArrowUp,
  Record,
  Stop,
} from "@phosphor-icons/react";

const MeetingRoomControlBar = ({
  showCommentInput,
  setShowCommentInput,
  commentText,
  setCommentText,
  audioMuted,
  videoMuted,
  micLockedByAdmin = false,
  handRaised,
  screenSharing,
  meetingId,
  unifiedTiles,
  localParticipantAudioMuted,
  handleToggleAudio,
  handleToggleHand,
  handleToggleVideo,
  handleToggleScreenShare,
  setShowEmojiPicker,
  handleSendComment,
  handleMuteUnmuteAllParticipants,
  socket,
  isConnected,
  showEmojiPicker,
  emojiPickerRef,
  emojiList,
  selectEmoji,
  isMeetingAdmin,
  isRecording,
  isRecordingPaused,
  onStartRecording,
  onStopRecording,
  onEndRecording,
}) => {
  const remoteIds = unifiedTiles.filter((t) => !t?.isSelf && t?.socketId).map((t) => t.socketId);
  const hasRemote = remoteIds.length > 0;
  const allMuted = hasRemote && remoteIds.every((sid) => !!localParticipantAudioMuted[sid]);

  return (
    <div className={`meeting-room-control-bar ${showCommentInput ? "has-input" : ""}`}>
      <div className="meeting-room-controls">
        <button
          type="button"
          className={`meeting-room-control-btn ${audioMuted || micLockedByAdmin ? "" : "active"} ${micLockedByAdmin ? "meeting-room-control-btn--mic-locked" : ""}`}
          aria-label="Microphone"
          onClick={handleToggleAudio}
          disabled={!meetingId || micLockedByAdmin}
          title={
            !meetingId
              ? "Missing meeting id"
              : micLockedByAdmin
                ? "Microphone locked by host — wait to be unmuted"
                : audioMuted
                  ? "Unmute"
                  : "Mute"
          }
        >
          {audioMuted || micLockedByAdmin ? (
            <MicrophoneSlash size={22} weight="regular" />
          ) : (
            <Microphone size={22} weight="regular" />
          )}
        </button>
        <button
          type="button"
          className={`meeting-room-control-btn ${handRaised ? "active" : ""}`}
          aria-label="Raise hand"
          onClick={handleToggleHand}
          disabled={!meetingId}
        >
          <HandWaving size={22} weight="regular" />
        </button>
        <button
          type="button"
          className={`meeting-room-control-btn ${videoMuted ? "" : "active"}`}
          aria-label="Camera"
          onClick={handleToggleVideo}
          disabled={!meetingId}
          title={!meetingId ? "Missing meeting id" : videoMuted ? "Turn camera on" : "Turn camera off"}
        >
          <VideoCamera size={22} weight="regular" />
        </button>
        <button
          type="button"
          className={`meeting-room-control-btn ${screenSharing ? "active" : ""}`}
          aria-label="Share screen"
          onClick={handleToggleScreenShare}
          disabled={!meetingId}
        >
          <MonitorArrowUp size={22} weight="regular" />
        </button>
        {isMeetingAdmin && !isRecording && (
          <button
            type="button"
            className="meeting-room-control-btn record-btn"
            aria-label="Start recording"
            onClick={onStartRecording}
            disabled={!meetingId}
            title="Start recording (screen + mic + participants)"
          >
            <Record size={22} weight="regular" />
          </button>
        )}
        {isMeetingAdmin && isRecording && (
          <>
            <button
              type="button"
              className={`meeting-room-control-btn record-btn ${!isRecordingPaused ? "recording" : ""}`}
              aria-label={isRecordingPaused ? "Resume recording" : "Stop (pause) recording"}
              onClick={isRecordingPaused ? onStartRecording : onStopRecording}
              disabled={!meetingId}
              title={isRecordingPaused ? "Resume recording" : "Stop (pause) recording"}
            >
              {isRecordingPaused ? (
                <Record size={22} weight="regular" />
              ) : (
                <Stop size={22} weight="fill" />
              )}
            </button>
            <button
              type="button"
              className="meeting-room-control-btn record-btn record-end-btn"
              aria-label="End recording"
              onClick={onEndRecording}
              disabled={!meetingId}
              title="End recording (save or discard)"
            >
              End
            </button>
          </>
        )}
        <button
          type="button"
          className="meeting-room-control-btn"
          aria-label="Reactions"
          onClick={() => setShowEmojiPicker((s) => !s)}
          disabled={!meetingId}
          title={!meetingId ? "Missing meeting id" : "Send like"}
        >
          <Smiley size={22} weight="regular" />
        </button>
        <button
          type="button"
          className="meeting-room-control-btn"
          aria-label="Chat"
          onClick={() => setShowCommentInput(true)}
        >
          <ChatCircleDots size={22} weight="regular" />
        </button>
        <button
          type="button"
          className={`meeting-room-control-btn ${allMuted ? "muted-all" : "active"}`}
          aria-label={allMuted ? "Unmute all participants (for you)" : "Mute all participants (for you)"}
          onClick={handleMuteUnmuteAllParticipants}
          disabled={!meetingId || !hasRemote}
          title={!hasRemote ? "No other participants" : allMuted ? "Unmute all (for you)" : "Mute all (for you)"}
        >
          {allMuted ? (
            <SpeakerSlash size={22} weight="regular" />
          ) : (
            <SpeakerHigh size={22} weight="regular" />
          )}
        </button>
      </div>
      {showCommentInput && (
        <div className="meeting-room-comment-wrapper">
          <input
            type="text"
            placeholder="Type a Comment..."
            className="meeting-room-comment-input visible"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendComment();
              }
            }}
            autoFocus
            onBlur={() => {
              setTimeout(() => {
                if (!commentText.trim()) {
                  setShowCommentInput(false);
                }
              }, 200);
            }}
          />
          <button
            type="button"
            className="meeting-room-comment-send-btn"
            aria-label="Send comment"
            onClick={handleSendComment}
            disabled={!commentText.trim() || !socket || !isConnected || !meetingId}
          >
            <ArrowUp size={18} weight="regular" />
          </button>
        </div>
      )}
      {showEmojiPicker && (
        <div className="meeting-room-emoji-picker" ref={emojiPickerRef}>
          {emojiList.map((e) => (
            <button
              key={e}
              type="button"
              className="emoji-btn"
              onClick={() => selectEmoji(e)}
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingRoomControlBar;
