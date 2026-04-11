/**
 * Formatters and helpers for group chat messages and links.
 */
import { normalizeMediaItems } from "../groupChatMessageMedia";

function formatParentMessagePreview(parent) {
  if (!parent || typeof parent !== "object") return null;
  const sender = parent.sender_name ?? parent.sender;
  const textRaw = parent.message ?? parent.text ?? "";
  if (!sender && !String(textRaw).trim()) return null;
  return {
    id: parent.id,
    sender: sender || "User",
    text: String(textRaw).slice(0, 240),
    senderPhoto: parent.sender_photo ?? parent.senderPhoto,
  };
}

export function formatMessage(msg) {
  const parentMessageId = msg.parent_message_id ?? msg.parentMessageId ?? null;
  const parentRaw = msg.parent_message;
  return {
    id: msg.id,
    sender: msg.sender_name,
    initials: msg.sender_name?.charAt(0)?.toUpperCase() || "U",
    time: msg.created_at
      ? new Date(msg.created_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
    date: msg.created_at
      ? new Date(msg.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    created_at: msg.created_at || new Date().toISOString(),
    text: msg.message,
    message: msg.message,
    senderPhoto: msg.sender_photo,
    senderEmail: msg.sender_email,
    media: normalizeMediaItems(msg.media, msg.id),
    is_read: msg.is_read,
    read_at: msg.read_at,
    is_deleted: msg.is_deleted,
    parent_message_id: parentMessageId,
    parent_message: formatParentMessagePreview(parentRaw),
  };
}

export function getMediaLabel(mediaType, fileName) {
  switch (mediaType) {
    case "audio":
    case "voice_note":
      return "🎤 Audio";
    case "image":
      return "📷 Photo";
    case "video":
      return "📷 Video";
    case "document":
    default:
      return fileName || "📄 Document";
  }
}

export function deriveMediaCategory(file, fallbackCategory) {
  if (fallbackCategory && fallbackCategory !== "file") return fallbackCategory;
  const mime = file?.type || "";
  if (mime.startsWith("image")) return "image";
  if (mime.startsWith("video")) return "video";
  if (mime.startsWith("audio")) return "audio";
  return "document";
}

export function getMessageSubject(message, getMediaLabelFn = getMediaLabel) {
  if (message.text) return message.text;
  if (message.media && message.media.length > 0) {
    const media = message.media[0];
    return getMediaLabelFn(media.media_type, media.file_name);
  }
  return "No messages yet";
}

export function extractLinksFromMessages(messages = []) {
  const links = [];
  messages?.forEach((msg) => {
    if (msg.is_deleted || (msg.media && msg.media.length > 0)) return;
    if (msg.message) {
      const urlRegex = /https?:\/\/[^\s<>,;]+/g;
      const urls = msg.message.match(urlRegex) || [];
      urls.forEach((url) => {
        try {
          const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
          const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);
          if (!isFileUrl) {
            const urlObj = new URL(cleanUrl);
            links.push({
              id: `link-${msg.id}-${cleanUrl}`,
              media_url: cleanUrl,
              file_name: urlObj.hostname.replace("www.", ""),
              original_url: cleanUrl,
              created_at: msg.created_at,
              sender_name: msg.sender_name,
              message_id: msg.id,
              isLink: true,
              is_downloadable: false,
            });
          }
        } catch (e) {}
      });
    }
  });
  return links;
}

/** Image/Video/Audio/Document extensions for last-message preview normalization */
const IMG_EXT = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "avif"];
const VIDEO_EXT = ["mp4", "mov", "webm", "mkv", "avi"];
const AUDIO_EXT = ["mp3", "wav", "m4a", "aac", "ogg", "webm"];
const DOC_EXT = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z"];

/**
 * Normalize last_message string for chat list preview: show emoji label for media (photo/video/audio/document), not file name or URL.
 */
export function normalizeLastMessagePreview(text) {
  const str = typeof text === "string" ? text.trim() : "";
  if (!str) return null;
  let ext = "";
  if (/^https?:\/\//i.test(str)) {
    const match = str.match(/\.([a-z0-9]+)(\?|$)/i);
    ext = match ? match[1].toLowerCase() : "";
  } else if (str.includes(".")) {
    const part = str.split(".").pop();
    if (part && part.length <= 6 && !/\s/.test(part)) ext = part.toLowerCase();
  }
  if (IMG_EXT.includes(ext)) return "📷 Photo";
  if (VIDEO_EXT.includes(ext)) return "🎥 Video";
  if (AUDIO_EXT.includes(ext)) return "🎤 Audio";
  if (DOC_EXT.includes(ext)) return "📄 Document";
  return str;
}

/**
 * Get preview string from last message API response (for ChatsPanel message preview fetch).
 * Returns message text or emoji label for media (📷 Photo, 🎥 Video, 🎤 Audio, 📄 Document).
 */
export function getLastMessagePreview(lastMsg) {
  if (!lastMsg) return null;
  if (lastMsg.message && String(lastMsg.message).trim()) return lastMsg.message.trim();
  const media = lastMsg.media;
  if (!Array.isArray(media) || media.length === 0) return null;
  const first = media[0];
  const mediaType = (first?.media_type || first?.file_type || "").toLowerCase();
  const mediaUrl = first?.media_url || first?.file_url || "";
  if (mediaType) {
    if (mediaType.includes("image") || mediaType === "photo") return "📷 Photo";
    if (mediaType.includes("video")) return "🎥 Video";
    if (mediaType.includes("audio") || mediaType === "voice" || mediaType === "voice_note") return "🎤 Audio";
    if (mediaType.includes("file") || mediaType === "document") return "📄 Document";
  }
  if (mediaUrl) {
    const urlMatch = mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i);
    const ext = urlMatch ? urlMatch[1].toLowerCase() : "";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "avif"].includes(ext)) return "📷 Photo";
    if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "🎥 Video";
    if (["mp3", "wav", "m4a", "aac", "ogg", "webm"].includes(ext)) return "🎤 Audio";
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) return "📄 Document";
  }
  return "📎 Attachment";
}

/**
 * Format raw group from API to chat list item shape.
 */
export function formatGroupForChatItem(group, unread = 0) {
  const rawSubject = group.last_message || "No messages yet";
  const subject = normalizeLastMessagePreview(rawSubject) ?? rawSubject;
  return {
    id: group.id,
    name: group.group_name,
    subject: subject || "No messages yet",
    avatar: group.group_name?.charAt(0)?.toUpperCase() || "G",
    avatarImage: group.group_photo || null,
    date: group.last_message_at
      ? new Date(group.last_message_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })
      : new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
    unread: unread ?? group.unread ?? group.unread_count ?? 0,
    group_name: group.group_name,
    group_content_id: group.group_content_id,
    contentName: group.contentName || "No content",
  };
}
