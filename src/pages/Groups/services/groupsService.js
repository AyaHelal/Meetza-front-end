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

export async function getGroupMembership(groupId) {
  const res = await api.get(`/chat/groups/${groupId}/info`);
  return res.data?.data?.members || [];
}

export function parseGroupsResponse(response) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  if (response?.data?.success && Array.isArray(response?.data?.data)) return response.data.data;
  if (response?.data?.success && Array.isArray(response?.data?.groups)) return response.data.groups;
  return [];
}
