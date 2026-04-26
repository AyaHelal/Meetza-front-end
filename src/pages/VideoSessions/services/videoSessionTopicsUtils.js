/** Normalize topics from API (array, string, or nested en/ar). */
export function getValidTopicsList(val) {
  if (Array.isArray(val)) {
    return val.filter(t => typeof t === 'string' && t.trim() !== '');
  }
  if (typeof val === "string" && val.trim() !== "" && val.toLowerCase() !== "null") {
    return val
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/** Merge English, Arabic, and generic topic lists into unique strings. */
export function mergeTopicLists(topics) {
  if (!topics) return [];
  const arTopics = getValidTopicsList(topics.ar);
  const enTopics = getValidTopicsList(topics.en);
  const rawTopics = getValidTopicsList(topics);
  return [...new Set([...enTopics, ...arTopics, ...rawTopics])];
}
