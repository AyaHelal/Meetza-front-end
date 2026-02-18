/**
 * Media type and file name utilities for group chat messages.
 * Used for normalizing message media and deriving extensions/types.
 */

export const MEDIA_TYPE_MAP = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"],
  video: ["mp4", "mov", "webm", "mkv"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "webm"],
};

export const MIME_EXTENSION_MAP = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
  "audio/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

export const deriveExtensionFromMime = (mime) => {
  if (!mime) return "";
  const cleanMime = mime.split(";")[0]?.trim().toLowerCase();
  if (MIME_EXTENSION_MAP[cleanMime]) {
    return MIME_EXTENSION_MAP[cleanMime];
  }
  if (cleanMime.includes("/")) {
    const subtype = cleanMime.split("/")[1];
    if (subtype === "plain") return "txt";
    if (subtype) {
      return subtype;
    }
  }
  return "";
};

export const extractExtension = (mediaItem) => {
  const fromName = mediaItem?.file_name?.split(".").pop();
  if (fromName) {
    return fromName.toLowerCase();
  }

  const url = mediaItem?.media_url || mediaItem?.file_url || "";
  if (!url) return "";
  const cleanUrl = url.split("?")[0];
  if (cleanUrl.includes(".")) {
    return cleanUrl.split(".").pop().toLowerCase();
  }
  const mimeExt = deriveExtensionFromMime(
    mediaItem?.file_type || mediaItem?.media_type
  );
  return mimeExt || "";
};

export const deriveMediaTypeFromExtension = (extension) => {
  if (!extension) return "document";
  if (MEDIA_TYPE_MAP.image.includes(extension)) return "image";
  if (MEDIA_TYPE_MAP.video.includes(extension)) return "video";
  if (MEDIA_TYPE_MAP.audio.includes(extension)) return "audio";
  return "document";
};

export const deriveFileName = (mediaItem) => {
  const extension =
    extractExtension(mediaItem) ||
    deriveExtensionFromMime(mediaItem?.file_type || mediaItem?.media_type);

  const ensureExtension = (name) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (!trimmed) return "";
    if (trimmed.includes(".") && trimmed.split(".").pop().length <= 6) {
      return trimmed;
    }
    if (extension) {
      return `${trimmed}.${extension}`;
    }
    return trimmed;
  };

  if (mediaItem?.file_name) {
    const normalized = ensureExtension(mediaItem.file_name);
    if (normalized) return normalized;
  }

  const url = mediaItem?.media_url || mediaItem?.file_url;
  if (url) {
    try {
      const parsed = new URL(url);
      const candidate = decodeURIComponent(
        parsed.pathname.split("/").pop() || ""
      );
      if (candidate) {
        if (candidate.includes(".") || !extension) {
          return candidate;
        }
        return `${candidate}.${extension}`;
      }
    } catch (err) {
      const fallback = url.split("?")[0].split("/").pop();
      if (fallback) {
        if (fallback.includes(".") || !extension) {
          return fallback;
        }
        return `${fallback}.${extension}`;
      }
    }
  }

  if (extension) {
    return `document.${extension}`;
  }
  return "document";
};

export const normalizeMediaItems = (mediaItems, messageId) => {
  if (!Array.isArray(mediaItems)) return [];
  return mediaItems.map((item, index) => {
    const mediaUrl = item?.media_url || item?.file_url || "";
    const extension = extractExtension(item);

    const mediaType = typeof item?.media_type === "string" ? item.media_type : "";
    const fileType = typeof item?.file_type === "string" ? item.file_type : "";
    const declaredType = mediaType || fileType;
    let normalizedType = declaredType?.toLowerCase() || "";

    if (
      mediaType === "voice_note" ||
      mediaType === "voice" ||
      normalizedType === "voice_note" ||
      normalizedType === "voice"
    ) {
      normalizedType = "voice_note";
    } else if (normalizedType.startsWith("image")) {
      normalizedType = "image";
    } else if (normalizedType.startsWith("video")) {
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      } else {
        normalizedType = "video";
      }
    } else if (normalizedType.startsWith("audio")) {
      normalizedType = "audio";
    } else if (
      !normalizedType ||
      normalizedType === "file" ||
      normalizedType === "document"
    ) {
      normalizedType = deriveMediaTypeFromExtension(extension);
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      }
    } else {
      normalizedType =
        deriveMediaTypeFromExtension(extension) || "document";
      if (mediaType === "voice_note" || mediaType === "voice") {
        normalizedType = "voice_note";
      }
    }

    return {
      ...item,
      id: item?.id || `${messageId || "msg"}-media-${index}`,
      media_url: mediaUrl,
      file_url: mediaUrl,
      file_name: deriveFileName(item),
      media_type: normalizedType,
    };
  });
};
