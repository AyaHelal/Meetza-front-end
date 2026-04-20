/** Normalize API "saved" flag to boolean (handles string/number variants). */
export function normalizeSavedFlag(rawSaved) {
  if (rawSaved === true || rawSaved === 1) return true;
  if (rawSaved === false || rawSaved === 0) return false;
  if (rawSaved == null) return false;
  const s = String(rawSaved).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no" || s === "") return false;
  return false;
}
