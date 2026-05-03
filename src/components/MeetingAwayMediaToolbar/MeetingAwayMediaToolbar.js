import React from "react";
import {
  VideoCamera,
  Microphone,
  MicrophoneSlash,
  VideoCameraSlash,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { useMediaContext } from "../../context/MediaContext";
import "./MeetingAwayMediaToolbar.css";

/**
 * Mic / camera / meeting speaker / optional "Return to meeting".
 * Uses MediaContext so controls stay in sync with MeetingRoom (including hidden instance when navigating away).
 */
export default function MeetingAwayMediaToolbar({
  variant = "inline",
  showSpeaker = true,
  showReturn = false,
  onReturn,
}) {
  const {
    audioMuted,
    videoMuted,
    meetingSpeakerMuted,
    setMeetingSpeakerMuted,
    toggleAudio,
    toggleVideo,
  } = useMediaContext();

  const useStatusClasses = variant === "inline";

  const micCamSpeakerReturn = (
    <>
      <button
        type="button"
        className={
          useStatusClasses
            ? `status-icon status-mic ${!audioMuted ? "active" : ""}`.trim()
            : `ma-toolbar-btn ma-toolbar-btn--mic ${!audioMuted ? "active" : ""}`.trim()
        }
        onClick={toggleAudio}
        aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
        title={audioMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {audioMuted ? <MicrophoneSlash size={20} /> : <Microphone size={20} weight="fill" />}
      </button>
      <button
        type="button"
        className={
          useStatusClasses
            ? `status-icon status-camera ${!videoMuted ? "active" : ""}`.trim()
            : `ma-toolbar-btn ma-toolbar-btn--camera ${!videoMuted ? "active" : ""}`.trim()
        }
        onClick={toggleVideo}
        aria-label={videoMuted ? "Turn on camera" : "Turn off camera"}
        title={videoMuted ? "Turn on camera" : "Turn off camera"}
      >
        {videoMuted ? <VideoCameraSlash size={20} /> : <VideoCamera size={20} weight="fill" />}
      </button>
      {showSpeaker && (
        <button
          type="button"
          className={
            useStatusClasses
              ? `status-icon status-speaker ${!meetingSpeakerMuted ? "active" : ""}`.trim()
              : `ma-toolbar-btn ma-toolbar-btn--speaker ${!meetingSpeakerMuted ? "active" : ""}`.trim()
          }
          onClick={() => setMeetingSpeakerMuted((m) => !m)}
          title={meetingSpeakerMuted ? "Unmute meeting sound" : "Mute meeting sound"}
          aria-label={meetingSpeakerMuted ? "Unmute meeting sound" : "Mute meeting sound"}
        >
          {meetingSpeakerMuted ? (
            <SpeakerSlash size={20} />
          ) : (
            <SpeakerHigh size={20} weight="fill" />
          )}
        </button>
      )}
      {showReturn && onReturn && (
        <button
          type="button"
          className={
            useStatusClasses
              ? "status-icon status-return-to-meeting"
              : "ma-toolbar-btn ma-toolbar-btn--return"
          }
          onClick={onReturn}
          aria-label="Return to meeting"
          title="Return to meeting"
        >
          <VideoCamera size={20} weight="fill" />
          <span className="status-return-label">Return to meeting</span>
        </button>
      )}
    </>
  );

  if (variant === "mobileBar") {
    return (
      <div
        className="ma-toolbar ma-toolbar--mobileBar"
        role="toolbar"
        aria-label="Meeting controls"
      >
        {micCamSpeakerReturn}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        className="ma-toolbar ma-toolbar--sidebar"
        role="toolbar"
        aria-label="Meeting controls"
      >
        {micCamSpeakerReturn}
      </div>
    );
  }

  return micCamSpeakerReturn;
}
