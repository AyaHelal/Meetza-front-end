export const loadHandRaisedMapFromStorage = (mid) => {
  if (!mid) return {};
  try {
    const stored = localStorage.getItem(`meeting_handRaised_${mid}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load handRaisedMap from localStorage:", error);
  }
  return {};
};

export const loadReactionsFromStorage = (mid) => {
  if (!mid) return {};
  try {
    const stored = localStorage.getItem(`meeting_reactions_${mid}`);
    if (stored) {
      const reactions = JSON.parse(stored);
      const oneDayAgo = Date.now() - 60 * 1000;
      const filtered = {};
      Object.entries(reactions).forEach(([memberKey, reactionEntry]) => {
        const filteredEntry = {};
        Object.entries(reactionEntry).forEach(([type, data]) => {
          const timestamp = typeof data === "object" && data.timestamp ? data.timestamp : 0;
          if (timestamp > oneDayAgo) {
            filteredEntry[type] = data;
          }
        });
        if (Object.keys(filteredEntry).length > 0) {
          filtered[memberKey] = filteredEntry;
        }
      });
      return filtered;
    }
  } catch (error) {
    console.warn("Failed to load reactions from localStorage:", error);
  }
  return {};
};
