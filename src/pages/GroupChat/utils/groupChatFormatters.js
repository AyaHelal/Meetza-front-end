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

/**
 * At most one reaction row may be `reactedByMe` (current user). If the API sends more, keep the last and fix counts.
 * @param {Array<{ emoji: string, count: number, reactedByMe?: boolean }>} reactions
 */
export function dedupeSingleReactedByMe(reactions) {
  if (!Array.isArray(reactions) || reactions.length === 0) return reactions;
  const mineIdx = reactions.map((r, i) => (r.reactedByMe ? i : -1)).filter((i) => i >= 0);
  if (mineIdx.length <= 1) return reactions;
  const keepIdx = mineIdx[mineIdx.length - 1];
  return reactions
    .map((r, i) => {
      if (!r.reactedByMe) return r;
      if (i === keepIdx) return r;
      const c = Math.max(1, r.count || 1);
      if (c <= 1) return null;
      return { ...r, count: c - 1, reactedByMe: false };
    })
    .filter(Boolean);
}

/** @param {{ _ts?: number }} a @param {{ _ts?: number }} b */
function byReactionTimeDesc(a, b) {
  return (b._ts || 0) - (a._ts || 0);
}

/**
 * Same reactor on multiple solo rows — keep the newest only when we have real timestamps.
 * (Do not use message `sender_id` as reactor id; it wrongly merges everyone's reactions.)
 * @param {Array<object>} rows
 */
function collapseSameReactorRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows;
  const keys = rows.map((r) => r.reactorKey ?? null);
  if (!keys.every((k) => k != null && String(k) !== "")) return rows;
  const first = String(keys[0]);
  if (!keys.every((k) => String(k) === first)) return rows;
  const allSolo = rows.every((r) => Math.max(1, r.count || 1) === 1);
  if (!allSolo) return rows;
  const sorted = [...rows].sort(byReactionTimeDesc);
  const maxT = Math.max(0, ...sorted.map((r) => r._ts || 0));
  if (maxT <= 0) return rows;
  return [sorted[0]];
}

/**
 * Fallback when the API omits per-user keys: two sole reactions, no "mine" flag.
 * Only collapse when both rows have usable timestamps (otherwise array order is ambiguous and we
 * must not drop the newer emoji for other clients).
 * @param {Array<object>} rows
 */
function collapseTwinSoloStale(rows) {
  if (!Array.isArray(rows) || rows.length !== 2) return rows;
  if (rows.some((r) => r.reactorKey != null && String(r.reactorKey) !== "")) return rows;
  const c0 = Math.max(1, rows[0].count || 1);
  const c1 = Math.max(1, rows[1].count || 1);
  if (c0 !== 1 || c1 !== 1) return rows;
  if (rows.some((r) => r.reactedByMe)) return rows;
  if (String(rows[0].emoji) === String(rows[1].emoji)) return rows;
  const t0 = rows[0]._ts || 0;
  const t1 = rows[1]._ts || 0;
  if (t0 <= 0 && t1 <= 0) return rows;
  if (t0 === t1) return rows;
  return t0 > t1 ? [rows[0]] : [rows[1]];
}

function stripReactionNormInternals(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(({ _ts, reactorKey, ...pub }) => pub);
}

function pickNameFromUserShape(u) {
  if (!u || typeof u !== "object") return "";
  const parts = [u.first_name, u.firstName, u.last_name, u.lastName].filter(
    (x) => x != null && String(x).trim() !== ""
  );
  const joined = parts.map((x) => String(x).trim()).join(" ").trim();
  if (joined) return joined;
  const n = u.name ?? u.full_name ?? u.fullName ?? u.username ?? u.displayName;
  if (typeof n === "string" && n.trim()) return n.trim();
  const em = u.email ?? u.user_email ?? u.userEmail;
  if (typeof em === "string" && em.includes("@")) {
    const local = em.split("@")[0];
    return local ? local.trim() : em.trim();
  }
  return "";
}

/**
 * Add one user (e.g. from react ACK) into a label lookup clone so UUID lists resolve before members refresh.
 * @param {Map<string, string>} lookup
 * @param {object} user
 */
export function mergeUserIntoMemberLookup(lookup, user) {
  if (!user?.id || !(lookup instanceof Map)) return lookup;
  const id = String(user.id).trim();
  const label =
    (typeof user.name === "string" && user.name.trim()) ||
    (typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0].trim()
      : "");
  if (!label) return lookup;
  const next = new Map(lookup);
  next.set(id, label);
  return next;
}

export function buildMemberIdLookup(members) {
  const map = new Map();
  if (!Array.isArray(members)) return map;
  for (const m of members) {
    if (!m || typeof m !== "object") continue;
    const id = m.id ?? m.user_id ?? m.userId ?? m.member_id ?? m.memberId;
    if (id == null || String(id).trim() === "") continue;
    const idStr = String(id).trim();
    let label =
      (typeof m.name === "string" && m.name.trim()) ||
      (typeof m.full_name === "string" && m.full_name.trim()) ||
      (typeof m.fullName === "string" && m.fullName.trim()) ||
      "";
    if (!label && typeof m.email === "string" && m.email.includes("@")) {
      label = m.email.split("@")[0].trim();
    }
    if (!label) label = `${idStr.slice(0, 8)}…`;
    map.set(idStr, label);
  }
  return map;
}

/**
 * Map member id → { id, name, email, photo } for reaction detail sheets.
 * @param {unknown} members
 * @returns {Map<string, { id: string, name: string, email: string, photo: string | null }>}
 */
export function buildMemberRecordLookup(members) {
  const map = new Map();
  if (!Array.isArray(members)) return map;
  for (const m of members) {
    if (!m || typeof m !== "object") continue;
    const id = m.id ?? m.user_id ?? m.userId ?? m.member_id ?? m.memberId;
    if (id == null || String(id).trim() === "") continue;
    const idStr = String(id).trim();
    let name =
      (typeof m.name === "string" && m.name.trim()) ||
      (typeof m.full_name === "string" && m.full_name.trim()) ||
      (typeof m.fullName === "string" && m.fullName.trim()) ||
      "";
    const email = typeof m.email === "string" ? m.email.trim() : "";
    if (!name && email.includes("@")) name = email.split("@")[0].trim();
    if (!name) name = `${idStr.slice(0, 8)}…`;
    const photo = m.user_photo ?? m.photo ?? m.avatar ?? m.profile_photo ?? null;
    map.set(idStr, { id: idStr, name, email, photo: photo ? String(photo) : null });
  }
  return map;
}

/** Merge react-ACK `user` into {@link buildMemberRecordLookup} result. */
export function mergeUserIntoMemberRecordLookup(lookup, user) {
  if (!user?.id || !(lookup instanceof Map)) return lookup;
  const id = String(user.id).trim();
  const next = new Map(lookup);
  const name =
    (typeof user.name === "string" && user.name.trim()) ||
    (typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0].trim()
      : id.slice(0, 8));
  const email = typeof user.email === "string" ? user.email.trim() : "";
  const photo = user.user_photo ?? user.photo ?? null;
  next.set(id, { id, name, email, photo: photo ? String(photo) : null });
  return next;
}

/**
 * Per-emoji reactor rows for UI sheets (from raw `users` ids or embedded user objects).
 * @param {unknown} raw
 * @param {Map<string, { id: string, name: string, email: string, photo: string | null }>} [memberRecordLookup]
 * @returns {Map<string, Array<{ id: string, name: string, email: string, photo: string | null, emoji: string }>>}
 */
function collectReactionReactorsFromRaw(raw, memberRecordLookup) {
  /** @type {Map<string, Array<{ id: string, name: string, email: string, photo: string | null, emoji: string }>>} */
  const byEmoji = new Map();
  const add = (emoji, entry) => {
    const e = String(emoji || "").trim();
    if (!e || !entry?.id) return;
    if (!byEmoji.has(e)) byEmoji.set(e, []);
    byEmoji.get(e).push({ ...entry, emoji: e });
  };

  if (!Array.isArray(raw)) return byEmoji;

  for (const r of raw) {
    if (typeof r === "string") continue;
    if (!r || typeof r !== "object") continue;
    const emoji = r.emoji ?? r.reaction ?? r.unicode ?? r.symbol;
    if (!emoji) continue;
    if (!Array.isArray(r.users)) continue;

    r.users.forEach((u) => {
      if (u != null && typeof u === "object") {
        const idRaw = u.id ?? u.user_id ?? u.userId ?? "";
        const name = pickNameFromUserShape(u) || (String(idRaw).trim() ? String(idRaw).slice(0, 8) : "User");
        const id = String(idRaw || name).trim() || name;
        const email = typeof u.email === "string" ? u.email.trim() : "";
        const photo = u.user_photo ?? u.photo ?? null;
        add(emoji, {
          id,
          name,
          email,
          photo: photo ? String(photo) : null,
        });
        return;
      }
      if (typeof u === "string" && u.trim()) {
        const idStr = u.trim();
        const rec =
          memberRecordLookup instanceof Map ? memberRecordLookup.get(idStr) : null;
        if (rec) {
          add(emoji, { ...rec });
        } else {
          add(emoji, {
            id: idStr,
            name: `Unknown (${idStr.slice(0, 8)}…)`,
            email: "",
            photo: null,
          });
        }
      }
    });
  }
  return byEmoji;
}

function pickActorLabelFromRow(r) {
  if (!r || typeof r !== "object") return "";
  const direct =
    r.user_name ??
    r.userName ??
    r.name ??
    r.full_name ??
    r.fullName ??
    r.display_name ??
    r.displayName ??
    r.sender_name ??
    r.username;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = r.user ?? r.reactor ?? r.member ?? r.profile;
  const fromNested = pickNameFromUserShape(nested);
  if (fromNested) return fromNested;
  const em = r.user_email ?? r.userEmail ?? r.email;
  if (typeof em === "string" && em.trim()) {
    if (em.includes("@")) return (em.split("@")[0] || em).trim();
    return em.trim();
  }
  return "";
}

/**
 * Build display names per emoji from raw API/socket reaction rows (before aggregation).
 * @param {unknown} raw
 * @param {Map<string, string>} [memberLookup] — from {@link buildMemberIdLookup}
 * @returns {Map<string, string[]>}
 */
function collectReactionActorsByEmoji(raw, memberLookup) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  const add = (emoji, label) => {
    const e = String(emoji || "").trim();
    const L = String(label || "").trim();
    if (!e || !L) return;
    if (!map.has(e)) map.set(e, []);
    const list = map.get(e);
    if (!list.some((x) => x.toLowerCase() === L.toLowerCase())) list.push(L);
  };

  if (!Array.isArray(raw)) return map;

  for (const r of raw) {
    if (typeof r === "string") continue;
    if (!r || typeof r !== "object") continue;
    const emoji = r.emoji ?? r.reaction ?? r.unicode ?? r.symbol;
    if (!emoji) continue;
    if (Array.isArray(r.users)) {
      r.users.forEach((u) => {
        if (u != null && typeof u === "object") {
          const lbl = pickNameFromUserShape(u);
          if (lbl) add(emoji, lbl);
          return;
        }
        if (typeof u === "string" && u.trim()) {
          const idStr = u.trim();
          const resolved =
            memberLookup instanceof Map ? memberLookup.get(idStr) || memberLookup.get(idStr.toLowerCase()) : "";
          if (resolved) add(emoji, resolved);
          else add(emoji, `Unknown (${idStr.slice(0, 8)}…)`);
        }
      });
      continue;
    }
    const lbl = pickActorLabelFromRow(r);
    if (lbl) add(emoji, lbl);
  }
  return map;
}

/**
 * Attach `actors` (display names) to normalized reaction chips when the raw payload includes them.
 * @param {object} sourceMsg — shape with `reactions` / `message_reactions` / etc.
 * @param {Array<{ emoji: string, count: number, reactedByMe?: boolean }>} normalizedRows
 * @param {Map<string, string>} [memberLookup]
 * @param {Map<string, { id: string, name: string, email: string, photo: string | null }>} [memberRecordLookup]
 * @returns {Array<{ emoji: string, count: number, reactedByMe?: boolean, actors?: string[], reactors?: object[] }>}
 */
export function attachReactionActorsToRows(sourceMsg, normalizedRows, memberLookup, memberRecordLookup) {
  if (!Array.isArray(normalizedRows) || normalizedRows.length === 0) return normalizedRows || [];
  const raw =
    sourceMsg?.reactions ??
    sourceMsg?.message_reactions ??
    sourceMsg?.emoji_reactions ??
    sourceMsg?.reaction_summary;
  const byEmoji = collectReactionActorsByEmoji(raw, memberLookup);
  const reactorsByEmoji =
    memberRecordLookup instanceof Map
      ? collectReactionReactorsFromRaw(raw, memberRecordLookup)
      : new Map();
  return normalizedRows.map((row) => ({
    ...row,
    actors: byEmoji.has(row.emoji) ? [...byEmoji.get(row.emoji)] : [],
    reactors: reactorsByEmoji.has(row.emoji) ? [...reactorsByEmoji.get(row.emoji)] : [],
  }));
}

/** Normalize reactions and attach `actors` / `reactors` when raw payload and lookups allow. */
export function reactionsFromRawPayload(sourceMsg, memberLookup, memberRecordLookup) {
  if (!sourceMsg || typeof sourceMsg !== "object") return [];
  return attachReactionActorsToRows(
    sourceMsg,
    normalizeReactionsFromPayload(sourceMsg),
    memberLookup,
    memberRecordLookup
  );
}

/**
 * Client-side: switching emoji removes the previous `reactedByMe` row (or decrements if others share), then sets the new one.
 * @param {Array<{ emoji: string, count: number, reactedByMe?: boolean }>|undefined} reactions
 * @param {string} newEmoji
 */
export function optimisticReplaceMyReaction(reactions, newEmoji) {
  const emoji = String(newEmoji || "").trim();
  if (!emoji) return Array.isArray(reactions) ? reactions : [];

  let list = Array.isArray(reactions) ? reactions.map((r) => ({ ...r })) : [];

  list = list
    .map((r) => {
      if (!r.reactedByMe) return r;
      const c = Math.max(1, r.count || 1);
      if (c <= 1) return null;
      return { ...r, count: c - 1, reactedByMe: false };
    })
    .filter(Boolean);

  const j = list.findIndex((r) => r.emoji === emoji);
  if (j === -1) {
    list.push({ emoji, count: 1, reactedByMe: true });
    return dedupeSingleReactedByMe(list);
  }
  const prev = list[j];
  const c = Math.max(1, prev.count || 1);
  // After stripping `reactedByMe`, the row is "others only". If count is still 1, the API often
  // already represents the current user alone (no `reactedByMe` flag) — do not +1 or it shows "2".
  const nextCount = c <= 1 ? 1 : c + 1;
  list[j] = {
    ...prev,
    count: nextCount,
    reactedByMe: true,
  };
  return dedupeSingleReactedByMe(list);
}

/**
 * Normalize reactions from API/socket payloads for UI chips.
 * @param {object} msg
 * @returns {Array<{ emoji: string, count: number, reactedByMe?: boolean }>}
 */
export function normalizeReactionsFromPayload(msg) {
  if (!msg || typeof msg !== "object") return [];
  const raw =
    msg.reactions ??
    msg.message_reactions ??
    msg.emoji_reactions ??
    msg.reaction_summary;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw.every((x) => typeof x === "string")) {
      const mapped = raw.map((emoji) => ({
        emoji: String(emoji),
        count: 1,
        reactedByMe: false,
      }));
      return dedupeSingleReactedByMe(mapped);
    }
    const mapped = raw
      .map((r) => {
        if (typeof r === "string") {
          const ts = 0;
          return { emoji: r, count: 1, reactedByMe: false, reactorKey: null, _ts: ts };
        }
        const emoji = r.emoji ?? r.reaction ?? r.unicode ?? r.symbol;
        if (!emoji) return null;
        const timeRaw = r.updated_at ?? r.updatedAt ?? r.created_at ?? r.reacted_at ?? r.timestamp;
        const parsed = timeRaw ? Date.parse(timeRaw) : NaN;
        const _ts = Number.isFinite(parsed) ? parsed : 0;
        const reactorKey =
          r.user_id ??
          r.userId ??
          r.reactor_id ??
          r.reactorId ??
          r.member_id ??
          r.memberId ??
          r.profile_id ??
          r.profileId ??
          r.user_email ??
          r.userEmail ??
          r.email ??
          null;
        return {
          emoji: String(emoji),
          count: Math.max(1, Number(r.count ?? r.users_count ?? 1) || 1),
          reactedByMe: Boolean(r.reacted_by_me ?? r.mine ?? r.is_mine ?? r.reactedByMe),
          reactorKey: reactorKey != null && String(reactorKey) !== "" ? String(reactorKey) : null,
          _ts,
        };
      })
      .filter(Boolean);
    let out = dedupeSingleReactedByMe(mapped);
    out = collapseSameReactorRows(out);
    out = collapseTwinSoloStale(out);
    return stripReactionNormInternals(out);
  }
  if (typeof raw === "object") {
    return Object.entries(raw).map(([emoji, v]) => {
      const count =
        typeof v === "number"
          ? v
          : typeof v === "object" && v != null && "count" in v
            ? Number(v.count) || 1
            : 1;
      return { emoji, count: Math.max(1, count) };
    });
  }
  return [];
}

/**
 * @param {object} msg
 * @param {{ members?: unknown[] }} [options] — pass `members` from group info to resolve reaction `users: [id,…]`
 */
export function formatMessage(msg, options) {
  const parentMessageId = msg.parent_message_id ?? msg.parentMessageId ?? null;
  const parentRaw = msg.parent_message;
  const memberLookup = buildMemberIdLookup(options?.members);
  const memberRecordLookup = buildMemberRecordLookup(options?.members);
  const reactions = reactionsFromRawPayload(msg, memberLookup, memberRecordLookup);
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
    reactions,
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
        } catch (e) { }
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
