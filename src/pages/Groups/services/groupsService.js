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

export function createGroup(formData, adminId) {
  const fd = new FormData();
  fd.append('group_name', formData.name);
  fd.append('year', formData.year);
  fd.append('semester', formData.semester);
  fd.append('position_id', formData.position_id);
  fd.append('group_content_name', formData.content_name);
  if (formData.content_description) fd.append('group_content_description', formData.content_description);
  if (formData.description) fd.append('description', formData.description);
  if (formData.photo) fd.append('group_photo', formData.photo);
  fd.append('admin_id', adminId);
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
function pickPrimaryAdminFromAdmins(admins) {
  if (!Array.isArray(admins) || admins.length === 0) return null;
  const upper = (r) => String(r || '').toUpperCase();
  const owner = admins.find((a) => upper(a.role) === 'OWNER');
  if (owner) return owner;
  const adm = admins.find((a) => upper(a.role) === 'ADMIN');
  if (adm) return adm;
  return admins[0];
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
