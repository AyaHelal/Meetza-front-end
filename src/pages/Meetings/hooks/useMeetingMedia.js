import { useCallback } from "react";
import * as meetingMediaService from "../services/meetingMediaService";

/**
 * Provides ensureLocalMedia and ensureMediaTracks. Refs come from args.
 */
export function useMeetingMedia(opts) {
  const {
    localStreamRef,
    setLocalStream,
    peersRef,
    cameraVideoTrackRef,
    addTracksToAllPeers,
    audioMuted,
    videoMuted,
  } = opts;

  const ensureLocalMedia = useCallback(() => {
    return meetingMediaService.ensureLocalMedia({ localStreamRef, setLocalStream });
  }, [localStreamRef, setLocalStream]);

  const ensureMediaTracks = useCallback(
    (options) => {
      return meetingMediaService.ensureMediaTracks(
        {
          localStreamRef,
          peersRef,
          cameraVideoTrackRef,
          setLocalStream,
          addTracksToAllPeers,
          ensureLocalMedia,
          audioMuted,
          videoMuted,
        },
        options
      );
    },
    [localStreamRef, peersRef, cameraVideoTrackRef, setLocalStream, addTracksToAllPeers, ensureLocalMedia, audioMuted, videoMuted]
  );

  return { ensureLocalMedia, ensureMediaTracks };
}
