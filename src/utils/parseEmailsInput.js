/**
 * Split pasted text into unique trimmed emails (comma, semicolon, or whitespace).
 * @param {string} text
 * @returns {string[]}
 */
export function parseEmailsInput(text) {
  if (!text || typeof text !== "string") return [];
  const parts = text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}
