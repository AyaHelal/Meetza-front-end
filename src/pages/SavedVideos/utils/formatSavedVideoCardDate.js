const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ordinalDay(day) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/**
 * e.g. "26th March 2026"
 */
export function formatSavedVideoCardDate(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && !Number.isNaN(value)) {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    if (!Number.isNaN(date.getTime())) {
      return `${ordinalDay(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    }
  }
  const str = String(value).trim();
  if (!str) return "";
  const normalized = str.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return str.slice(0, 10);
  return `${ordinalDay(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
