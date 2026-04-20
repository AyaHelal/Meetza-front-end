function getDaySuffix(d) {
  if (d >= 11 && d <= 13) return "th";
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "00:00";
  const total = Math.floor(seconds);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/** Relative time from ISO or MySQL datetime; `nowMs` enables tests / tick-driven refresh. */
export function formatRelativeTime(isoString, nowMs = Date.now()) {
  if (!isoString) return "";
  let date = new Date(isoString);

  if (typeof isoString === "string" && !isoString.includes("T") && !isoString.includes("Z")) {
    date = new Date(isoString.replace(" ", "T") + "Z");
  }

  if (Number.isNaN(date.getTime())) return "";
  let diff = Math.max(0, nowMs - date.getTime());
  const sec = Math.floor(diff / 1000);

  if (sec < 10) return "just now";
  if (sec < 60) return `${sec} seconds ago`;

  const min = Math.floor(sec / 60);
  if (min === 1) return "1 minute ago";
  if (min < 60) return `${min} minutes ago`;

  const hour = Math.floor(min / 60);
  if (hour === 1) return "1 hour ago";
  if (hour < 24) return `${hour} hours ago`;

  const day = Math.floor(hour / 24);
  if (day === 1) return "1 day ago";
  if (day < 30) return `${day} days ago`;

  const month = Math.floor(day / 30);
  if (month === 1) return "1 month ago";
  if (month < 12) return `${month} months ago`;

  const year = Math.floor(month / 12);
  if (year === 1) return "1 year ago";
  return `${year} years ago`;
}

export function formatFullDate(dateString) {
  if (!dateString) return "";
  let date = new Date(dateString);

  if (typeof dateString === "string" && !dateString.includes("T") && !dateString.includes("Z")) {
    date = new Date(dateString.replace(" ", "T") + "Z");
  }

  if (Number.isNaN(date.getTime())) return "";

  const d = date.getDate();
  const m = date.toLocaleString("en-US", { month: "long" });
  const y = date.getFullYear();
  const suffix = getDaySuffix(d);

  return `${d}${suffix} of ${m} ${y}`;
}

export function isRTL(text) {
  return /[\u0600-\u06FF]/.test(text);
}
