/**
 * Message formatting, sorting, and link extraction for MainChat.
 */

export function formatMessages(msgs) {
  if (!Array.isArray(msgs)) return [];
  const nonDeleted = msgs.filter((msg) => !msg.is_deleted);
  return nonDeleted.map((msg) => {
    const formattedMsg = { ...msg };
    const media = Array.isArray(msg.media) ? [...msg.media] : [];
    if (msg.message) {
      const urlRegex = /https?:\/\/[^\s<>,;]+/g;
      const urls = msg.message.match(urlRegex) || [];
      urls.forEach((url, index) => {
        try {
          const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
          const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);
          if (!isFileUrl) {
            const hostname = new URL(cleanUrl).hostname.replace("www.", "");
            media.push({
              id: `link-${msg.id}-${index}`,
              media_url: cleanUrl,
              file_name: hostname,
              media_type: "link",
              created_at: msg.created_at,
              sender_name: msg.sender_name,
            });
          }
        } catch (e) {
          console.warn("Invalid URL in message:", url, e);
        }
      });
    }
    formattedMsg.media = media;
    return formattedMsg;
  });
}

export function sortMessagesChronologically(msgs) {
  if (!Array.isArray(msgs)) return [];
  return [...msgs].sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

export function extractMessageLinksFromMessages(messages) {
  const links = [];
  messages?.forEach((msg) => {
    if (msg.is_deleted || !msg.message) return;
    const urlRegex = /https?:\/\/[^\s<>,;]+/g;
    const urls = msg.message.match(urlRegex) || [];
    urls.forEach((url) => {
      try {
        const cleanUrl = url.replace(/[.,;:!?)]+$/, "");
        const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);
        if (!isFileUrl) {
          const domain = new URL(cleanUrl).hostname.replace("www.", "");
          links.push({
            id: `msg-${msg.id}-${cleanUrl}`,
            media_url: cleanUrl,
            file_name: domain,
            original_url: cleanUrl,
            created_at: msg.created_at,
            sender_name: msg.sender_name,
            message_id: msg.id,
            isLink: true,
          });
        }
      } catch (e) {
        console.warn("Invalid URL in message:", url, e);
      }
    });
  });
  return links;
}

export function combineBackendAndMessageLinks(backendLinks, extractedLinks) {
  const seenUrls = new Set();
  const combined = [];
  backendLinks.forEach((link) => {
    const url = link.media_url || link.file_url || "";
    if (!url) return;
    try {
      const norm = new URL(url).href.toLowerCase().replace(/\/$/, "");
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        combined.push({ ...link, isLink: true });
      }
    } catch {
      if (!seenUrls.has(url.toLowerCase())) {
        seenUrls.add(url.toLowerCase());
        combined.push({ ...link, isLink: true });
      }
    }
  });
  extractedLinks.forEach((link) => {
    const url = link.media_url || link.original_url || "";
    if (!url) return;
    try {
      const norm = new URL(url).href.toLowerCase().replace(/\/$/, "");
      if (!seenUrls.has(norm)) {
        seenUrls.add(norm);
        combined.push(link);
      }
    } catch {
      if (!seenUrls.has(url.toLowerCase())) {
        seenUrls.add(url.toLowerCase());
        combined.push(link);
      }
    }
  });
  return combined;
}

const FILE_TYPE_EXT_MAP = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-rar-compressed": "rar",
  "application/x-zip-compressed": "zip",
};

export function getDownloadFileName(item) {
  const getExtensionFromFileType = (fileType) => {
    if (!fileType) return null;
    if (FILE_TYPE_EXT_MAP[fileType]) return FILE_TYPE_EXT_MAP[fileType];
    const parts = fileType.split("/");
    if (parts.length === 2) {
      const subtype = parts[1].split(";")[0].trim();
      if (subtype && subtype.length <= 5 && !subtype.includes(".")) return subtype;
    }
    return null;
  };
  const getExtensionFromUrl = (url) => {
    if (!url) return null;
    try {
      const cleanUrl = url.split("?")[0].split("#")[0];
      const match = cleanUrl.match(/\.([a-zA-Z0-9]{1,5})$/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  };
  const getExtensionFromFileName = (fileName) => {
    if (!fileName) return null;
    const match = fileName.match(/\.([a-zA-Z0-9]{1,5})$/);
    return match ? match[1].toLowerCase() : null;
  };

  const urlForName =
    (typeof item.file_url === "string" && item.file_url.trim()) ||
    (typeof item.media_url === "string" && item.media_url.trim()) ||
    "";
  let extension =
    getExtensionFromFileType(item.file_type || item.media_type) ||
    getExtensionFromUrl(item.file_url || item.media_url) ||
    getExtensionFromFileName(item.file_name);

  if (item.file_name) {
    const existingExt = getExtensionFromFileName(item.file_name);
    if (existingExt) return item.file_name;
    return extension ? `${item.file_name}.${extension}` : item.file_name;
  }
  if (urlForName) {
    try {
      const urlPath = urlForName.split("?")[0].split("#")[0];
      const lastPart = decodeURIComponent(urlPath.split("/").pop() || "");
      if (lastPart?.includes(".")) return lastPart;
      if (lastPart) return extension ? `${lastPart}.${extension}` : lastPart;
    } catch (e) {}
  }
  return extension ? `document.${extension}` : "document";
}

export function getFileExtensionForLabel(fileName) {
  if (!fileName) return "FILE";
  const parts = fileName.split(".");
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toUpperCase();
    return ext.length <= 4 ? ext : "FILE";
  }
  return "FILE";
}

export function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}
