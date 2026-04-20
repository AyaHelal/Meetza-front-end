/** Build nested comments: roots have .replies from flat list with parent_id */
export function nestComments(flatList) {
  if (!Array.isArray(flatList) || flatList.length === 0) return [];
  const hasParentId = flatList.some(
    (c) => Object.prototype.hasOwnProperty.call(c, "parent_id") && c.parent_id != null && c.parent_id !== ""
  );
  if (!hasParentId) return flatList;
  const roots = flatList.filter((c) => c.parent_id == null || c.parent_id === undefined || c.parent_id === "");
  return roots.map((r) => ({ ...r, replies: flatList.filter((c) => c.parent_id === r.id) || [] }));
}
