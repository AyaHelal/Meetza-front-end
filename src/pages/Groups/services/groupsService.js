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

/**
 * Create group — backend: `administrator_id` (primary) plus `administrator_ids[0]`, `[1]`, …
 * for super-admin multi-select (see `extractArray` in groupController). Optional `position_id`;
 * JSON body when no photo, else multipart.
 *
 * @param {object} form — from create modal: `name`, `year`, `semester`, `content_name`, `content_description`, `description`, `photo`, optional `position_id`
 * @param {{ selfUserId: string|number, isSuperAdmin: boolean, adminIds?: (string|number)[] }} ctx
 */
export function createGroup(form, ctx) {
  const { selfUserId, isSuperAdmin, adminIds = [] } = ctx || {};

  const adminIdsNorm = (Array.isArray(adminIds) ? adminIds : [])
    .map((id) => (id != null && String(id).trim() !== '' ? String(id).trim() : null))
    .filter(Boolean);

  let administrator_id;
  if (isSuperAdmin && adminIdsNorm.length > 0) {
    administrator_id = adminIdsNorm[0];
  } else if (selfUserId != null && String(selfUserId).trim() !== '') {
    administrator_id = String(selfUserId).trim();
  } else {
    return Promise.reject(new Error('Missing administrator_id (log in again or select at least one admin)'));
  }

  const group_name = String(form?.name ?? '');
  const year = String(form?.year ?? '');
  const semester = String(form?.semester ?? '');
  const group_content_name = String(form?.content_name ?? '');

  const payload = {
    group_name,
    year,
    semester,
    group_content_name,
    administrator_id,
  };

  const pos = form?.position_id;
  if (pos !== undefined && pos !== null && String(pos).trim() !== '') {
    payload.position_id = String(pos);
  }
  const gcd = form?.content_description;
  if (gcd !== undefined && gcd !== null && String(gcd).trim() !== '') {
    payload.group_content_description = String(gcd);
  }
  const desc = form?.description;
  if (desc !== undefined && desc !== null && String(desc).trim() !== '') {
    payload.description = String(desc);
  }
  if (isSuperAdmin && adminIdsNorm.length > 0) {
    adminIdsNorm.forEach((id, index) => {
      payload[`administrator_ids[${index}]`] = id;
    });
  }

  const group_photo = form?.photo;
  if (group_photo) {
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      fd.append(k, v);
    });
    fd.append('group_photo', group_photo);
    return api.post('/group', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.post('/group', payload);
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

/**
 * POST /group/:id/admins — body: { email, role? } for one admin, or { emails: string[], role? } for several.
 */
export function addGroupAdmin(groupId, payload) {
  const id = encodeURIComponent(String(groupId));
  const fromArray = Array.isArray(payload?.emails)
    ? payload.emails.map((e) => String(e || '').trim()).filter(Boolean)
    : [];
  const single = String(payload?.email || '').trim();
  const emails = fromArray.length > 0 ? fromArray : single ? [single] : [];
  if (emails.length === 0) {
    return Promise.reject(new Error('At least one email is required'));
  }
  const body = emails.length === 1 ? { email: emails[0] } : { emails };
  const role = String(payload?.role || '').trim().toUpperCase();
  if (role === 'OWNER' || role === 'ADMIN') body.role = role;
  return api.post(`/group/${id}/admins`, body);
}

/** DELETE /group/:id/admins — body `{ email }` (same route as meetza-admin bulk remove). */
export function removeGroupAdminByEmail(groupId, email) {
  const id = encodeURIComponent(String(groupId));
  const em = String(email || '').trim();
  if (!em) return Promise.reject(new Error('email is required'));
  return api.delete(`/group/${id}/admins`, { data: { email: em } });
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
 * Build a de-duplicated list of administrators from group records (API fallback).
 * Uses each group's `admins` array when present (OWNER / ADMIN / co-admins), else legacy primary fields.
 * @param {Array<object>} groupsList
 * @returns {{ id: string|number, name: string, email: string }[]}
 */
export function collectUniqueAdminsFromGroups(groupsList) {
  if (!Array.isArray(groupsList)) return [];
  const map = new Map();

  const add = (id, name, email) => {
    if (id == null) return;
    const key = String(id);
    const nm = String(name ?? '').trim();
    const em = String(email ?? '').trim();
    if (!map.has(key)) {
      map.set(key, { id, name: nm || `Administrator ${key}`, email: em });
      return;
    }
    const cur = map.get(key);
    map.set(key, {
      id,
      name: nm || cur.name,
      email: em || cur.email,
    });
  };

  for (const g of groupsList) {
    if (Array.isArray(g.admins) && g.admins.length > 0) {
      for (const a of g.admins) {
        const uid = a.user_id ?? a.userId ?? a.id ?? a.member_id;
        const nm = a.name ?? a.full_name ?? a.username ?? a.email;
        const em = a.email ?? '';
        add(uid, nm, em);
      }
      continue;
    }
    const primary = pickPrimaryAdminFromAdmins(g.admins);
    const id =
      g.administrator_id ??
      g.admin_id ??
      g.adminId ??
      primary?.user_id ??
      primary?.userId ??
      g.admin?.id;
    const name =
      g.admin_name ??
      g.admin?.name ??
      primary?.name ??
      primary?.email ??
      (id != null ? `Administrator ${id}` : '');
    const email = primary?.email ?? g.admin?.email ?? '';
    add(id, name, email);
  }
  return [...map.values()];
}

/** True if `name` is only our UUID fallback, not a real display name. */
function isPlaceholderAdminName(name, idKey) {
  const n = String(name ?? '').trim();
  if (!n) return true;
  if (n === `Administrator ${idKey}`) return true;
  return /^Administrator\s+[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i.test(n);
}

/** Prefer a real name over "Administrator <uuid>" when merging duplicates. */
function pickBetterAdminName(incoming, existing, idKey) {
  const inc = String(incoming ?? '').trim();
  const ex = String(existing ?? '').trim();
  if (!isPlaceholderAdminName(inc, idKey)) return inc || `Administrator ${idKey}`;
  if (!isPlaceholderAdminName(ex, idKey)) return ex;
  return inc || ex || `Administrator ${idKey}`;
}

/**
 * Merge administrator rows by `id`.
 * Pass **full-detail lists last** (e.g. `mergeAdministratorLists(fromGroups, fromApi)` so `/administrator/` wins on conflicts).
 */
function mergeAdministratorLists(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      const id = row?.id ?? row?.user_id ?? row?.userId;
      if (id == null) continue;
      const key = String(id);
      const name = String(row.name ?? '').trim();
      const email = String(row.email ?? '').trim();
      if (!map.has(key)) {
        map.set(key, { id, name: name || `Administrator ${key}`, email });
      } else {
        const cur = map.get(key);
        map.set(key, {
          id,
          name: pickBetterAdminName(name, cur.name, key),
          email: email || cur.email,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  );
}

/** Map API user rows to `{ id, name, email }` for the create-group admin picker. */
function mapRowsToAdministrators(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((u) => ({
      id: u.id ?? u.user_id ?? u.userId,
      name: (u.name ?? u.full_name ?? u.username ?? u.email ?? '').toString().trim(),
      email: (u.email ?? '').toString().trim(),
    }))
    .filter((u) => u.id != null);
}

/**
 * Super-admin: administrators for "Group administrator" on create.
 * Primary: GET /administrator/ (all site administrators).
 * Also merges admins discovered from `groupsList` (e.g. co-admins) and falls back to GET /user/administrators if needed.
 */
export async function getAdministrators(groupsFallback = []) {
  let fromApi = [];
  for (const path of ['/administrator/', '/administrator']) {
    try {
      const res = await api.get(path);
      const raw = res?.data?.data ?? res?.data;
      fromApi = mapRowsToAdministrators(Array.isArray(raw) ? raw : []);
      if (fromApi.length > 0) break;
    } catch (e) {
      if (e.response?.status !== 404 && e.response?.status !== 403) {
        console.warn(`getAdministrators: GET ${path}`, e);
      }
    }
  }
  if (fromApi.length === 0) {
    try {
      const res = await api.get('/user/administrators');
      const raw = res?.data?.data ?? res?.data;
      fromApi = mapRowsToAdministrators(Array.isArray(raw) ? raw : []);
    } catch (e2) {
      if (e2.response?.status !== 404 && e2.response?.status !== 403) {
        console.warn('getAdministrators: GET /user/administrators', e2);
      }
    }
  }
  const fromGroups = collectUniqueAdminsFromGroups(groupsFallback);
  // Groups-derived rows often only have UUID fallbacks; `/administrator/` has real names — merge API last.
  return mergeAdministratorLists(fromGroups, fromApi);
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
    return group.admins.some((a) => {
      const aid = a?.user_id ?? a?.userId;
      return aid != null && String(aid) === uid;
    });
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
