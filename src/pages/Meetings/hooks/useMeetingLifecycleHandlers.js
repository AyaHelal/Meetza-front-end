import { useCallback } from "react";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import * as meetingService from "../services/meetingService";
import * as meetingSocketService from "../services/meetingSocketService";

/**
 * Leave meeting and meeting-ended handlers. Uses meetingService for API; socket/WebRTC via callbacks.
 */
export function useMeetingLifecycleHandlers({
  meetingId,
  meetingInfo,
  isRecording,
  stopRecording,
  stopMeetingRtc,
  navigate,
  socket,
  recordingStartedRef,
}) {
  const handleLeaveMeeting = useCallback(async () => {
    try {
      if (!meetingId) {
        smartToast.error("Missing meeting id. Can't leave meeting.");
        return;
      }

      if (isRecording) {
        await stopRecording({
          meetingId,
          title: meetingInfo?.title,
          group_id: meetingInfo?.group_id,
          description: meetingInfo?.description,
        });
        if (recordingStartedRef?.current !== undefined) recordingStartedRef.current = false;
      }

      stopMeetingRtc();
      await meetingService.leaveMeeting(api, meetingId);
      try {
        sessionStorage.removeItem("activeMeetingId");
        sessionStorage.removeItem("activeMeetingGroupId");
      } catch (e) {
        /* ignore */
      }
      smartToast.success("Left the meeting.");
      navigate("/home");
    } catch (error) {
      console.error("❌ Error leaving meeting:", error);
      smartToast.error(
        error.response?.data?.message || error.message || "Failed to leave meeting. Please try again."
      );
    }
  }, [
    meetingId,
    meetingInfo?.title,
    meetingInfo?.group_id,
    meetingInfo?.description,
    isRecording,
    stopRecording,
    stopMeetingRtc,
    navigate,
    recordingStartedRef,
  ]);

  const handleMeetingEnded = useCallback(async () => {
    try {
      if (!meetingId) return;

      if (isRecording) {
        await stopRecording({
          meetingId,
          title: meetingInfo?.title,
          group_id: meetingInfo?.group_id,
          description: meetingInfo?.description,
        });
        if (recordingStartedRef?.current !== undefined) recordingStartedRef.current = false;
      }

      stopMeetingRtc();
      if (socket) meetingSocketService.meetingEnded(socket, meetingId, () => {});

      try {
        await meetingService.leaveMeeting(api, meetingId);
        try {
          sessionStorage.removeItem("activeMeetingId");
          sessionStorage.removeItem("activeMeetingGroupId");
        } catch (e) {
          /* ignore */
        }
      } catch (e) {
      }

      smartToast.info("Meeting time has ended. Exiting...");
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      console.error("❌ Error in handleMeetingEnded:", error);
    }
  }, [
    meetingId,
    meetingInfo?.title,
    meetingInfo?.group_id,
    meetingInfo?.description,
    isRecording,
    stopRecording,
    stopMeetingRtc,
    socket,
    navigate,
    recordingStartedRef,
  ]);

  return { handleLeaveMeeting, handleMeetingEnded };
}
