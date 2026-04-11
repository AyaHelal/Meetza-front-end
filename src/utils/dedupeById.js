/**
 * Drops duplicate rows that share the same id (GET /group can return duplicates from JOINs).
 * @template T
 * @param {T[]} rows
 * @param {(row: T) => unknown} [getId]
 * @returns {T[]}
 */
export function dedupeById(rows, getId = (row) => row?.id ?? row?.group_id ?? row?._id) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const id = getId(row);
    if (id == null || id === "") continue;
    const k = String(id);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}
