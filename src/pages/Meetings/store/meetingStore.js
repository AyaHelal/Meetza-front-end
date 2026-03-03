/**
 * Meeting store – participants, mediaStateMap, hasJoined.
 * Currently provided by MeetingContext (src/context/MeetingContext).
 * Migrate here or wire to Zustand/context for meeting-scoped state.
 */
// Re-export from app context so meeting module can import from ./store/meetingStore
export {
  useMeetingContext,
  MeetingProvider,
} from "../../../context/MeetingContext";
