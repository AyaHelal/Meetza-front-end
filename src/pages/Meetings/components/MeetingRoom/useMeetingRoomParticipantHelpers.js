import { useCallback } from "react";

export function useMeetingRoomParticipantHelpers({ peerMetaRef, remoteStreams }) {
  const getPeerLabel = useCallback((socketId) => {
    const meta = peerMetaRef?.current?.get(socketId);
    return meta?.member_name || meta?.member_id || socketId;
  }, [peerMetaRef]);

  const getParticipantStream = useCallback(
    (participant) => {
      const memberId = participant?.member_id;
      const email = participant?.member_email;
      for (const [socketId, meta] of (peerMetaRef?.current?.entries() ?? [])) {
        if (memberId && meta?.member_id && String(meta.member_id) === String(memberId)) {
          const stream = remoteStreams.find((x) => x.socketId === socketId)?.stream;
          if (stream) return stream;
        }
        if (email && meta?.member_email && String(meta.member_email).toLowerCase() === String(email).toLowerCase()) {
          const stream = remoteStreams.find((x) => x.socketId === socketId)?.stream;
          if (stream) return stream;
        }
      }
      if (memberId || email) {
        console.warn("⚠️ Could not match participant to stream:", {
          memberId,
          email,
          availableStreams: remoteStreams.length,
          availableMeta: Array.from(peerMetaRef?.current?.keys() ?? []),
        });
      }
      return null;
    },
    [peerMetaRef, remoteStreams]
  );

  return { getPeerLabel, getParticipantStream };
}
