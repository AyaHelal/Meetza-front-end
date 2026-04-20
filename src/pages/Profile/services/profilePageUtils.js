export function formatSavedVideoDuration(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && value.trim() !== "" && !/^\d+$/.test(value.trim())) {
    return value.trim();
  }
  const sec = typeof value === "number" ? Math.floor(value) : parseInt(String(value).trim(), 10);
  if (Number.isNaN(sec) || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function firstName(displayName) {
  if (!displayName || typeof displayName !== "string") return "there";
  const t = displayName.trim();
  return t.split(/\s+/)[0] || "there";
}

export function dateBadgeFromDate(d) {
  if (!d || Number.isNaN(d.getTime())) return { month: "—", day: "—" };
  return {
    month: d.toLocaleString(undefined, { month: "short" }),
    day: String(d.getDate()),
  };
}

export function formatClockPartsFromDate(d) {
  if (!d || Number.isNaN(d.getTime())) return { clock: "—", meridiem: "" };
  const hours24 = d.getHours();
  const minutes = d.getMinutes();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return { clock: `${hours12}:${String(minutes).padStart(2, "0")}`, meridiem };
}
