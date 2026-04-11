import api from '../../../API/axiosInstance';

export function getGroups(params = {}) {
  const searchParams = new URLSearchParams();
  (params.years || []).forEach((year) => searchParams.append('year', year));
  (params.semesters || []).forEach((semester) => searchParams.append('semester', semester));
  const query = searchParams.toString();
  return api.get(query ? `/group?${query}` : '/group');
}

export function getPositions() {
  return api.get('/position');
}

export function deleteResource(contentId, resourceId) {
  return api.delete(`/group-contents/${contentId}/files/${resourceId}`);
}

export function addResource(contentId, file) {
  const form = new FormData();
  form.append("files", file);
  return api.post(`/group-contents/${contentId}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function addLinkResource(contentId, link) {
  const form = new FormData();
  form.append("links", link);
  return api.post(`/group-contents/${contentId}/files`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function getUserByEmail(email) {
  return api.get(`/user/email/${encodeURIComponent(email)}`);
}

/** Load a user by id (for position_id when super admin assigns a group administrator). */
export async function getUserById(userId) {
  if (userId == null) throw new Error('user id is required');
  const res = await api.get(`/user/${encodeURIComponent(String(userId))}`);
  return res.data?.data ?? res.data?.user ?? res.data;
}

/**
 * Create group (multipart).
 * @param {object} formData — name, year, semester, content_name, optional position_id, etc.
 * @param {string|number} adminId — default: group administrator user id
 * @param {object} [options]
 * @param {string|number} [options.assigneeAdministratorId] — when set, sends admin_id = adminId (caller should pass super admin) and administrator_id = assignee (group owner). Use when the API rejects owner-only admin_id for super-admin JWTs.
 */
export function createGroup(formData, adminId, options = {}) {
  const assigneeId = options.assigneeAdministratorId;
  const fd = new FormData();
  fd.append('group_name', String(formData.name ?? ''));
  fd.append('year', String(formData.year ?? ''));
  fd.append('semester', String(formData.semester ?? ''));
  const pos = formData.position_id;
  if (pos != null && String(pos).trim() !== '') {
    fd.append('position_id', String(pos));
  }
  fd.append('group_content_name', String(formData.content_name ?? ''));
  if (formData.content_description) {
    fd.append('group_content_description', String(formData.content_description));
  }
  if (formData.description) {
    fd.append('description', String(formData.description));
  }
  if (formData.photo) {
    fd.append('group_photo', formData.photo);
  }
  if (assigneeId != null && String(assigneeId).trim() !== '') {
    fd.append('admin_id', String(adminId));
    fd.append('administrator_id', String(assigneeId));
  } else {
    fd.append('admin_id', String(adminId));
  }
  return api.post('/group', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

export function joinGroup(groupId, memberId) {
  return api.post('/group-membership/', { group_id: groupId, member_id: memberId });
}

export function deleteMembership(membershipId) {
  return api.delete(`/group-membership/${membershipId}`);
}

export function getGroupMemberships() {
  return api.get('/group-membership');
}

/** POST /group/:id/admins — same body as meetza-admin: { email, role?: 'OWNER' | 'ADMIN' } */
export function addGroupAdmin(groupId, payload) {
  const id = encodeURIComponent(String(groupId));
  const email = String(payload?.email || '').trim();
  if (!email) return Promise.reject(new Error('email is required'));
  const body = { email };
  const role = String(payload?.role || '').trim().toUpperCase();
  if (role === 'OWNER' || role === 'ADMIN') body.role = role;
  return api.post(`/group/${id}/admins`, body);
}

/** DELETE /group/:id/admins/:email — same as meetza-admin */
export function removeGroupAdminByEmail(groupId, email) {
  const id = encodeURIComponent(String(groupId));
  const em = encodeURIComponent(String(email || '').trim());
  if (!String(email || '').trim()) return Promise.reject(new Error('email is required'));
  return api.delete(`/group/${id}/admins/${em}`);
}

export async function getGroupMembership(groupId) {
  const res = await api.get(`/chat/groups/${groupId}/info`);
  return res.data?.data?.members || [];
}

/**
 * API may return group admins as `admins: [{ user_id, role, name, email, ... }]`.
 * Pick OWNER first, then ADMIN, else first entry — for display + legacy `administrator_id` filter.
 */
export function pickPrimaryAdminFromAdmins(admins) {
  if (!Array.isArray(admins) || admins.length === 0) return null;
  const upper = (r) => String(r || '').toUpperCase();
  const owner = admins.find((a) => upper(a.role) === 'OWNER');
  if (owner) return owner;
  const adm = admins.find((a) => upper(a.role) === 'ADMIN');
  if (adm) return adm;
  return admins[0];
}

/**
 * Build a de-duplicated list of administrators from group records (fallback when no list endpoint).
 * @param {Array<object>} groupsList
 * @returns {{ id: string|number, name: string, email: string, position_id?: string|number }[]}
 */
export function collectUniqueAdminsFromGroups(groupsList) {
  if (!Array.isArray(groupsList)) return [];
  const map = new Map();
  for (const g of groupsList) {
    const primary = pickPrimaryAdminFromAdmins(g.admins);
    const id =
      g.administrator_id ??
      g.admin_id ??
      g.adminId ??
      primary?.user_id ??
      primary?.userId ??
      g.admin?.id;
    if (id == null) continue;
    const key = String(id);
    if (map.has(key)) continue;
    const name =
      g.admin_name ??
      g.admin?.name ??
      primary?.name ??
      primary?.email ??
      `Administrator ${key}`;
    const email = primary?.email ?? g.admin?.email ?? '';
    const positionId = g.position_id ?? g.positionId ?? primary?.position_id ?? undefined;
    map.set(key, {
      id,
      name: String(name).trim() || `Administrator ${key}`,
      email: String(email || '').trim(),
      ...(positionId != null && positionId !== '' ? { position_id: positionId } : {}),
    });
  }
  return [...map.values()];
}

/**
 * Super-admin: list system administrators for assigning a new group.
 * Tries GET /user/administrators; falls back to admins inferred from groups if the route is missing.
 */
export async function getAdministrators(groupsFallback = []) {
  try {
    const res = await api.get('/user/administrators');
    const raw = res?.data?.data ?? res?.data;
    const list = Array.isArray(raw) ? raw : [];
    const mapped = list
      .map((u) => ({
        id: u.id ?? u.user_id ?? u.userId,
        name: (u.name ?? u.full_name ?? u.username ?? u.email ?? '').toString().trim(),
        email: (u.email ?? '').toString().trim(),
        position_id: u.position_id ?? u.positionId ?? u.position?.id,
      }))
      .filter((u) => u.id != null);
    if (mapped.length > 0) return mapped;
  } catch (e) {
    if (e.response?.status !== 404 && e.response?.status !== 403) {
      console.warn('getAdministrators API failed, using groups fallback if available', e);
    }
  }
  const fromGroups = collectUniqueAdminsFromGroups(groupsFallback);
  return fromGroups.length > 0 ? fromGroups : [];
}

/** True if this user is a legacy group admin or listed in `admins`. */
export function groupIsManagedByUser(group, userId) {
  if (userId == null || !group) return false;
  const uid = String(userId);
  const legacyIds = [
    group.administrator_id,
    group.admin_id,
    group.adminId,
    group.user_id,
    group.admin?.id,
  ];
  if (legacyIds.some((id) => id != null && String(id) === uid)) return true;
  if (Array.isArray(group.admins)) {
    return group.admins.some((a) => a?.user_id != null && String(a.user_id) === uid);
  }
  return false;
}

export function normalizeGroupRecord(group) {
  if (!group || typeof group !== 'object') return group;
  const primary = pickPrimaryAdminFromAdmins(group.admins);
  const adminUserId = primary?.user_id ?? primary?.userId ?? null;
  const adminName =
    primary?.name ??
    group.admin_name ??
    group.admin?.name ??
    null;

  return {
    ...group,
    admin_name: group.admin_name ?? adminName ?? undefined,
    admin:
      group.admin ??
      (adminName != null
        ? { id: adminUserId, name: adminName }
        : undefined),
    administrator_id:
      group.administrator_id ??
      group.admin_id ??
      group.adminId ??
      adminUserId ??
      undefined,
  };
}

export function parseGroupsResponse(response) {
  let raw = [];
  if (Array.isArray(response?.data?.data)) raw = response.data.data;
  else if (Array.isArray(response?.data)) raw = response.data;
  else if (response?.data?.success && Array.isArray(response?.data?.data)) raw = response.data.data;
  else if (response?.data?.success && Array.isArray(response?.data?.groups)) raw = response.data.groups;
  return raw.map((g) => normalizeGroupRecord(g));
}
