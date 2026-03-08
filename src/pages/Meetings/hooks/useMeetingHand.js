import { useState, useCallback } from "react";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Hand-raised state + handleToggleHand. Persists to sessionStorage and emits via socket.
 */
export function useMeetingHand(opts) {
  const { meetingIdRef, socket } = opts;

  const [handRaised, setHandRaised] = useState(() => {
    try {
      const v = sessionStorage.getItem("meetza_handRaised");
      return v !== null ? v === "true" : false;
    } catch {
      return false;
    }
  });

  const handleToggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    try {
      sessionStorage.setItem("meetza_handRaised", String(next));
    } catch (error) {
    }
    const mid = meetingIdRef?.current;
    if (socket && mid) {
      meetingSocketService.raiseHand(socket, mid, next);
    }
  }, [handRaised, meetingIdRef, socket]);

  return { handRaised, setHandRaised, handleToggleHand };
}
