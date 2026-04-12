/**
 * Detect PDF attachments across chat media, group content, and meeting resources.
 */

function extFromString(s) {
  if (!s || typeof s !== "string") return "";
  const base = s.split("?")[0].split("#")[0];
  const part = base.includes("/") ? base.split("/").pop() : base;
  const i = part.lastIndexOf(".");
  if (i === -1 || i === part.length - 1) return "";
  return part.slice(i + 1).toLowerCase();
}

export function isPdfResource(item) {
  if (!item || typeof item !== "object") return false;
  const mime = String(
    item.mime_type || item.content_type || item.file_mime || item.file_type || item.media_type || ""
  ).toLowerCase();
  if (mime.includes("pdf") || mime === "application/pdf") return true;

  const url = String(item.file_url || item.media_url || item.url || item.resource_url || "");
  if (url && /\.pdf(\?|#|$)/i.test(url)) return true;

  const name = String(item.file_name || item.title || item.original_name || item.name || "");
  if (name.toLowerCase().endsWith(".pdf")) return true;

  const ext = extFromString(url) || extFromString(name);
  return ext === "pdf";
}
