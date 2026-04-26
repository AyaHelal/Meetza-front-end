/** Shared parsing + fingerprinting for /notification REST + socket payloads. */

export function parseNotificationsFromApiResponse(body) {
  if (!body) return [];
  if (body.success && body.data && Array.isArray(body.data)) return body.data;
  if (Array.isArray(body)) return body;
  if (body.notifications && Array.isArray(body.notifications)) return body.notifications;
  if (body.data && Array.isArray(body.data)) return body.data;
  return [];
}

export function countUnreadNotifications(list) {
  if (!Array.isArray(list)) return 0;
  return list.filter((n) => !n.is_read && n.is_read !== true).length;
}

/** Cheap fingerprint so we detect new items without deep compare. */
export function notificationsListFingerprint(list) {
  if (!Array.isArray(list)) return "";
  const unread = countUnreadNotifications(list);
  const head = list[0];
  const tail = list[list.length - 1];
  const h = head ? String(head.id ?? head.notification_id ?? "") : "";
  const t = tail ? String(tail.id ?? tail.notification_id ?? "") : "";
  return `${list.length}|${unread}|${h}|${t}`;
}

/** Unwrap common socket/API shapes. */
export function normalizeSocketNotificationPayload(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.length ? normalizeSocketNotificationPayload(raw[0]) : null;
  }
  if (typeof raw !== "object") return null;
  if (raw.notification && typeof raw.notification === "object") {
    return normalizeSocketNotificationPayload(raw.notification);
  }
  if (raw.data != null && typeof raw.data === "object") {
    return normalizeSocketNotificationPayload(raw.data);
  }
  const hasId = raw.id != null || raw.notification_id != null;
  if (hasId || raw.title || raw.message || raw.description) {
    return raw;
  }
  return null;
}
