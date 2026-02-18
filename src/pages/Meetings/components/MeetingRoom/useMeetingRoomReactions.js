import { useState, useRef, useCallback, useEffect } from "react";
import { loadHandRaisedMapFromStorage, loadReactionsFromStorage } from "./meetingRoomStorage";

const EMOJI_LIST = ["👍", "❤️", "😂", "👏", "😮", "🎉"];

/**
 * Reactions state, floating emojis, addReactionToMap, spawnFloatingEmojis, and effects for loading from storage + closing picker on outside click.
 */
export function useMeetingRoomReactions({ meetingId, setHandRaisedMap, meetingIdRef }) {
  const [reactionsMap, setReactionsMap] = useState(() => ({}));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const emojiPickerRef = useRef(null);

  const addReactionToMap = useCallback((memberKey, type, name) => {
    setReactionsMap((prev) => {
      const next = { ...prev };
      const entry = next[memberKey] ? { ...next[memberKey] } : {};
      entry[type] = { name, timestamp: Date.now() };
      next[memberKey] = entry;

      const currentMeetingId = meetingIdRef?.current;
      if (currentMeetingId) {
        try {
          localStorage.setItem(`meeting_reactions_${currentMeetingId}`, JSON.stringify(next));
        } catch (error) {
          console.warn("Failed to save reactions to localStorage:", error);
        }
      }
      return next;
    });
  }, [meetingIdRef]);

  const spawnFloatingEmojis = useCallback((emoji, name, count = 1) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const left = window.innerWidth / 2;
    const top = window.innerHeight - 150;
    const item = { id, emoji, name, left, top };
    setFloatingEmojis((prev) => [...prev, item]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((f) => f.id !== item.id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (meetingId) {
      const storedReactions = loadReactionsFromStorage(meetingId);
      if (Object.keys(storedReactions).length > 0) {
        setReactionsMap(storedReactions);
      } else {
        setReactionsMap({});
      }
      const storedHandRaised = loadHandRaisedMapFromStorage(meetingId);
      if (Object.keys(storedHandRaised).length > 0) {
        setHandRaisedMap(storedHandRaised);
      } else {
        setHandRaisedMap({});
      }
    } else {
      setReactionsMap({});
      setHandRaisedMap({});
    }
  }, [meetingId, setHandRaisedMap]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onDocClick = (ev) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(ev.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showEmojiPicker]);

  return {
    reactionsMap,
    setReactionsMap,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    emojiList: EMOJI_LIST,
    floatingEmojis,
    addReactionToMap,
    spawnFloatingEmojis,
  };
}
