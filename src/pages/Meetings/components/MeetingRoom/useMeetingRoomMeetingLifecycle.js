import { useEffect } from "react";
import api from "../../../../API/axiosInstance";

/**
 * Runs: fetch meeting title when meetingId changes, periodic meeting status check, meetingEnded socket listener.
 */
export function useMeetingRoomMeetingLifecycle({
  meetingId,
  meetingIdRef,
  socket,
  onMeetingEnded,
  setMeetingTitle,
}) {
  // Fetch meeting title from API when meetingId changes
  useEffect(() => {
    if (!meetingId) {
      setMeetingTitle("");
      return;
    }
    const fetchMeetingTitle = async () => {
      try {
        const res = await api.get(`/meeting/${meetingId}`);
        const root = res?.data;
        let meeting;
        if (root?.data) {
          meeting = Array.isArray(root.data)
            ? root.data.find((m) => String(m.id) === String(meetingId))
            : root.data;
        } else if (root?.id) {
          meeting = root;
        }
        setMeetingTitle(meeting?.title || "");
      } catch {
        setMeetingTitle("");
      }
    };
    fetchMeetingTitle();
  }, [meetingId, setMeetingTitle]);

  // Periodically check if meeting is still active (every 10 seconds)
  useEffect(() => {
    if (!meetingId) return;

    const checkMeetingStatus = async () => {
      try {
        const res = await api.get(`/meeting/${meetingId}`);
        const root = res?.data;

        let meeting;
        if (root?.data) {
          if (Array.isArray(root.data)) {
            meeting = root.data.find((m) => m.id === meetingId);
          } else {
            meeting = root.data;
          }
        } else {
          meeting = root?.id ? root : null;
        }

        if (!meeting) {
          onMeetingEnded();
          return;
        }

        const status = meeting?.status || "";
        const normalizedStatus = (status || "").toString().trim().toLowerCase();

        if (["finished", "ended", "closed"].includes(normalizedStatus)) {
          onMeetingEnded();
          return;
        }

        const endTime = meeting?.end_time;
        if (endTime) {
          const endDateTime = new Date(endTime);
          const now = new Date();
          if (now >= endDateTime) {
            onMeetingEnded();
            return;
          }
        }
      } catch (error) {
        if (error.response?.status === 404) {
          onMeetingEnded();
        } else {
          console.warn("⚠️ Could not check meeting status:", error);
        }
      }
    };

    const interval = setInterval(checkMeetingStatus, 10000);
    return () => clearInterval(interval);
  }, [meetingId, onMeetingEnded]);

  // Socket listener for meeting end event
  useEffect(() => {
    if (!socket) return;

    const onMeetingEndedEvent = (data) => {
      const mid = data?.meetingId;
      if (!mid || mid !== meetingIdRef.current) return;
      onMeetingEnded();
    };

    socket.on("meetingEnded", onMeetingEndedEvent);

    return () => {
      socket.off("meetingEnded", onMeetingEndedEvent);
    };
  }, [socket, onMeetingEnded, meetingIdRef]);
}
