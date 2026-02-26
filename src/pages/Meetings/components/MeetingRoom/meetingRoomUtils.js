/** Normalize backend participant to unified shape { socketId, member_id, member_name, member_photo, member_email } */
export const toParticipant = (p) => ({
  socketId: p?.socketId || p?.id,
  member_id: p?.member_id ?? p?.memberId ?? p?.userId ?? p?.user_id,
  member_name: p?.member_name ?? p?.memberName ?? p?.name,
  member_photo: p?.member_photo ?? p?.memberPhoto ?? p?.photo ?? p?.user_photo,
  member_email: p?.member_email ?? p?.memberEmail ?? p?.email,
});

export const getReactionIcon = (type) => {
  if (typeof type !== "string") return "👍";
  try {
    if (/[\p{Emoji}]/u.test(type)) return type;
  } catch {
    if (/[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]?/.test(type)) return type;
  }
  const map = { like: "👍", heart: "❤️", laugh: "😂", clap: "👏", wow: "😮", celebration: "🎉" };
  return map[type.toLowerCase?.()] || type;
};

/** Get camera track only (exclude screen share) from stream. */
export const getCameraTrack = (stream) => {
  if (!stream) return null;
  for (const t of stream.getVideoTracks()) {
    try {
      const s = t.getSettings?.();
      if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") continue;
      if ((t.label || "").toLowerCase().includes("screen")) continue;
      return t;
    } catch { return t; }
  }
  return null;
};

/** True if the video track is a screen share (displaySurface or label). */
export const isScreenShareVideoTrack = (videoTrack) => {
  if (!videoTrack) return false;
  try {
    const s = videoTrack.getSettings?.();
    if (s?.displaySurface === "monitor" || s?.displaySurface === "window" || s?.displaySurface === "browser") return true;
    if ((videoTrack.label || "").toLowerCase().includes("screen")) return true;
  } catch { }
  return false;
};

/** True if the stream has any screen-share video track. */
export const isScreenShareStream = (stream) => {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => isScreenShareVideoTrack(t));
};

export const getScreenShareTrack = (stream) => {
  if (!stream) return null;
  const t = stream.getVideoTracks().find(isScreenShareVideoTrack);
  return t && t.readyState === "live" ? t : null;
};

/** Toggle fullscreen for a DOM element (with vendor prefixes). */
export const toggleFullscreenForElement = (el) => {
  if (!el) return;
  const doc = document;
  const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
  if (isFullscreen) {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (exit) exit.call(doc);
  } else {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el);
  }
};
