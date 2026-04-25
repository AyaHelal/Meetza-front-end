/**
 * Helpers for MessageItem: link detection, display text, media type, file names.
 */
import { getMediaLabel } from "./groupChatFormatters";

export function isLinkItem(item) {
  const declaredType = item?.media_type || item?.file_type || '';
  if (declaredType === 'link' || declaredType.includes('link')) return true;
  const url = item?.media_url || item?.file_url || item?.url || item?.resource_url || '';
  return /^https?:\/\//i.test(url);
}

export function getDisplayText(message, finalMedia) {
  const messageText = message.message || message.text || '';
  if (!messageText || !finalMedia?.length) return messageText;

  const linkUrls = finalMedia
    .filter((item) => isLinkItem(item))
    .map((item) => (item.media_url || item.file_url || item.url || item.resource_url || '').replace(/[.,;:!?)]+$/, ''))
    .filter(Boolean);

  if (linkUrls.length === 0) return messageText;

  let displayText = messageText;
  linkUrls.forEach((url) => {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    displayText = displayText.replace(new RegExp(escapedUrl + '[.,;:!?)]*', 'gi'), '').trim();
  });
  displayText = displayText.replace(/\s+/g, ' ').trim();
  return displayText || '';
}

/** Short preview for reply banner / quoted context (matches MessageItem media + text rules). */
export function getReplySnippetForMessage(message) {
  if (!message || message.is_deleted) return "";
  const raw = String(message.message || message.text || "").trim();
  const isLinkMessage = raw && /^https?:\/\/\S+$/i.test(raw);
  const finalMedia =
    message.media?.length > 0
      ? message.media
      : isLinkMessage
        ? [{ media_type: "link", media_url: raw }]
        : [];
  const displayText = getDisplayText(message, finalMedia);
  if (displayText) return displayText.slice(0, 120);
  if (finalMedia.length > 0) {
    const m = finalMedia[0];
    return getMediaLabel(m.media_type, m.file_name).slice(0, 120);
  }
  return raw.slice(0, 120);
}

export function getExtension(mediaItem) {
  const fileName = mediaItem?.file_name || '';
  if (fileName.includes('.')) return fileName.split('.').pop().toLowerCase();
  const url = mediaItem?.media_url || mediaItem?.file_url || mediaItem?.url || mediaItem?.resource_url || '';
  if (url.includes('.')) return url.split('?')[0].split('.').pop().toLowerCase();
  return '';
}

const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar', '7z'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'];

export function getMediaType(mediaItem) {
  const explicitMediaType = mediaItem?.media_type || '';
  if (explicitMediaType === 'voice_note' || explicitMediaType === 'voice') return 'audio';

  const declaredType = mediaItem?.media_type || mediaItem?.file_type || '';
  const mediaUrl = mediaItem?.media_url || mediaItem?.file_url || mediaItem?.url || mediaItem?.resource_url || '';

  if (declaredType === 'link' || declaredType.includes('link')) return 'link';

  const isHttpLink = /^https?:\/\//i.test(mediaUrl);
  if (isHttpLink) {
    const extension = getExtension(mediaItem);
    if (DOCUMENT_EXTENSIONS.includes(extension)) return 'document';
    if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
    if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
    return 'link';
  }

  if (typeof declaredType === 'string' && declaredType.length > 0) {
    if (declaredType === 'voice_note' || declaredType === 'voice') return 'audio';
    if (declaredType.startsWith('image')) return 'image';
    if (declaredType.startsWith('video') && declaredType !== 'voice_note') {
      if (mediaItem?.media_type === 'voice_note' || mediaItem?.media_type === 'voice') return 'audio';
      return 'video';
    }
    if (declaredType.startsWith('audio')) return 'audio';
    if (declaredType === 'document' || declaredType === 'file') return 'document';
    if (declaredType === 'media') {
      const mimeType = mediaItem?.file_mime || mediaItem?.file_type || '';
      if (mediaItem?.media_type === 'voice_note' || mediaItem?.media_type === 'voice') return 'audio';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType.startsWith('image/')) return 'image';
    }
  }

  if (explicitMediaType === 'voice_note' || explicitMediaType === 'voice') return 'audio';

  const extension = getExtension(mediaItem);
  if (extension === 'webm' && (explicitMediaType === 'voice_note' || explicitMediaType === 'voice')) return 'audio';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'].includes(extension)) return 'image';
  if (['mp4', 'mov', 'mkv'].includes(extension)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extension)) return 'audio';
  if (extension) return 'document';
  return 'document';
}

export function getFileNameFromMedia(mediaItem) {
  if (mediaItem?.file_name) return mediaItem.file_name;
  const url = mediaItem?.media_url || mediaItem?.file_url || mediaItem?.url || mediaItem?.resource_url;
  if (url) {
    try {
      const parsedUrl = new URL(url);
      const candidate = decodeURIComponent(parsedUrl.pathname.split('/').pop());
      if (candidate) return candidate;
    } catch {
      const parts = url.split('?')[0].split('/');
      const fallback = parts.pop();
      if (fallback) return fallback;
    }
  }
  return 'attachment';
}

export function ensureFileExtension(name, mediaItem) {
  if (!name) return 'document';
  if (name.includes('.') && name.split('.').pop().length <= 6) return name;
  const extension = getExtension(mediaItem);
  if (extension) {
    const nameWithoutExt = name.split('.')[0];
    return `${nameWithoutExt}.${extension}`;
  }
  return name;
}
