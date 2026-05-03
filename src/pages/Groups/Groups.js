import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartToast } from '../../API/toastManager';
import { useAuth } from '../../context/AuthContext';
import { createGroup, joinGroup, leaveGroup } from './services/groupsService';
import GroupsFilterPanel from './components/GroupsFilterPanel';
import GroupsGrid from './components/GroupsGrid';
import CreateGroupModal from './components/CreateGroupModal';
import EditGroupModal from './components/EditGroupModal';
import LeaveGroupLastAdminModal from './components/LeaveGroupLastAdminModal';
import { ConfirmDeleteModal } from '../../components/shared/ConfirmDeleteModal';
import api from '../../API/axiosInstance';
import {
  useGroupsFilters,
  useGroupsData,
  useCreateGroupForm,
} from './hooks';
import './Groups.css';

const SEARCH_MIN_LENGTH = 2;

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [createModalAdmins, setCreateModalAdmins] = useState([]);
  const [createModalAdminsLoading, setCreateModalAdminsLoading] = useState(false);
  const [lastAdminLeaveModal, setLastAdminLeaveModal] = useState(null);
  const [lastAdminLeaveSubmitting, setLastAdminLeaveSubmitting] = useState(false);

  const filters = useGroupsFilters();
  const {
    searchQuery,
    setSearchQuery,
    selectedYears,
    selectedSemesters,
    expandedYear,
    setExpandedYear,
    expandedSemester,
    setExpandedSemester,
    handleYearToggle,
    handleSemesterToggle,
  } = filters;

  const {
    groups,
    setGroups,
    loading,
    userRole,
    isSuperAdmin,
    joinedGroups,
    setJoinedGroups,
    fetchGroupsAndMembership,
  } = useGroupsData(user, selectedYears, selectedSemesters);

  const handleCreateGroup = async (groupData) => {
    if (!user?.id) {
      smartToast.error('You must be logged in to create a group');
      return;
    }
    const { adminIds, ...rest } = groupData;

    try {
      await createGroup(rest, {
        selfUserId: user.id,
        isSuperAdmin,
        adminIds: Array.isArray(adminIds) ? adminIds : [],
      });
      if (isSuperAdmin) {
        smartToast.success('Group created successfully!');
      } else {
        smartToast.info('Group creation request sent. Waiting for super admin approval.');
      }
      setShowCreateModal(false);
      await fetchGroupsAndMembership();
    } catch (error) {
      console.error('Error creating group:', error);
      smartToast.error(error.response?.data?.message || 'Failed to create group');
      throw error;
    }
  };

  const { formData, handleContentChange, handleSubmit } = useCreateGroupForm(handleCreateGroup, {
    isSuperAdmin,
  });

  useEffect(() => {
    if (!showCreateModal || !isSuperAdmin) return undefined;
    let cancelled = false;
    setCreateModalAdminsLoading(true);
    (async () => {
      try {
        const res = await api.get('/user');
        if (cancelled) return;
        const payload = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const list = payload
          .filter((u) => {
            const r = String(u.role || u.Role || '').trim();
            const lower = r.toLowerCase();
            return (
              r === 'Administrator' ||
              lower === 'administrator' ||
              r === 'Admin' ||
              lower === 'admin' ||
              lower.includes('super_admin') ||
              lower.includes('super-admin')
            );
          })
          .map((u) => ({
            id: u.id ?? u._id,
            name: String(u.name ?? u.username ?? '').trim(),
            email: String(u.email ?? '').trim(),
            position_id: u.position_id ?? u.positionId ?? '',
          }))
          .filter((row) => row.id != null && String(row.id).trim() !== '');
        if (!cancelled) setCreateModalAdmins(list);
      } catch {
        if (!cancelled) setCreateModalAdmins([]);
      } finally {
        if (!cancelled) setCreateModalAdminsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCreateModal, isSuperAdmin]);

  const handleCreateGroupSubmit = async () => {
    const result = await handleSubmit();
    if (result.error) smartToast.error(result.error);
  };

  const handleJoinGroup = async (groupId) => {
    try {
      if (!user?.id) {
        smartToast.error('You must be logged in to join a group');
        return;
      }
      await joinGroup(groupId, user.id);
      setJoinedGroups((prev) => [...prev, String(groupId)]);
      smartToast.success('Joined successfully!');
    } catch (error) {
      console.error('Join Error:', error);
      smartToast.error(error.response?.data?.message || error.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      if (!user?.id) {
        smartToast.error('You must be logged in to leave a group');
        return;
      }
      await leaveGroup(groupId, {});
      setJoinedGroups((prev) => prev.filter(id => String(id) !== String(groupId)));
      smartToast.success('Left group successfully!');
      setLastAdminLeaveModal(null);
      await fetchGroupsAndMembership();
    } catch (error) {
      console.error('Leave Error:', error);
      const data = error.response?.data;
      if (data?.code === 'LAST_ADMIN_ASSIGN_REQUIRED') {
        const payload = data?.data || {};
        const candidates = Array.isArray(payload.admins)
          ? payload.admins
          : Array.isArray(payload.candidates)
          ? payload.candidates
          : [];
        const groupName = groups.find(g => String(g.id) === String(groupId) || String(g.group_id) === String(groupId))?.name || '';
        setLastAdminLeaveModal({
          groupId: payload.group_id ?? groupId,
          groupName,
          candidates,
          currentAdminRole: payload.current_admin_role ?? null,
        });
      } else {
        smartToast.error(data?.message || error.message || 'Failed to leave group');
      }
    }
  };

  const handleLastAdminLeaveConfirm = async (body) => {
    if (!lastAdminLeaveModal?.groupId) return;
    const gid = lastAdminLeaveModal.groupId;
    setLastAdminLeaveSubmitting(true);
    try {
      await leaveGroup(gid, body);
      setJoinedGroups((prev) => prev.filter(id => String(id) !== String(gid)));
      smartToast.success('Left group successfully!');
      setLastAdminLeaveModal(null);
      await fetchGroupsAndMembership();
    } catch (error) {
      console.error('Leave confirm error:', error);
      const data = error.response?.data;
      smartToast.error(data?.message || error.message || 'Failed to leave group');
    } finally {
      setLastAdminLeaveSubmitting(false);
    }
  };

  const handleDeleteGroupClick = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const handleEditGroupClick = (group) => {
    setGroupToEdit(group);
    setShowEditModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    const id = groupToDelete.group_id || groupToDelete.id;
    setActionSubmitting(true);
    try {
      await api.delete(`/group/${id}`);
      setGroups(prev => prev.filter(g => (g.id !== id && g.group_id !== id)));
      smartToast.success('Group deleted successfully!');
      setShowDeleteModal(false);
      setGroupToDelete(null);
    } catch (e) {
      console.error("Delete error:", e);
      smartToast.error(e.response?.data?.message || e.message || 'Failed to delete group');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleUpdateGroupSubmit = async (formData) => {
    if (!groupToEdit) return;
    const id = groupToEdit.group_id || groupToEdit.id;
    const { group_name, description, group_photo, year, semester } = formData;

    const payload = {};
    if (group_name !== undefined) payload.group_name = group_name;
    if (description !== undefined) payload.description = description;
    if (year !== '' && year !== undefined && year !== null) {
      const y = String(year).trim();
      if (y && !['1', '2', '3', '4'].includes(y)) {
        smartToast.error('Year must be 1, 2, 3, or 4.');
        return;
      }
      if (y) payload.year = y;
    }
    if (semester !== '' && semester !== undefined && semester !== null) {
      payload.semester = semester;
    }

    const hasText =
      Boolean(String(payload.group_name || '').trim()) ||
      Boolean(String(payload.description || '').trim()) ||
      Boolean(payload.year) ||
      Boolean(payload.semester);
    const hasPhoto = Boolean(group_photo);
    if (!hasText && !hasPhoto) {
      smartToast.error(
        'Change at least one field: name, description, year, semester, or poster.'
      );
      return;
    }

    setActionSubmitting(true);
    try {
      if (group_photo) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
        });
        fd.append('group_photo', group_photo);
        await api.put(`/group/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.put(`/group/${id}`, payload);
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.id === id || g.group_id === id
            ? {
              ...g,
              ...payload,
              name: payload.group_name ?? g.name,
              group_name: payload.group_name ?? g.group_name,
              year: payload.year ?? g.year,
              semester: payload.semester ?? g.semester,
              description: payload.description ?? g.description,
            }
            : g
        )
      );
      smartToast.success('Group updated successfully!');
      setShowEditModal(false);
      setGroupToEdit(null);
      await fetchGroupsAndMembership();
    } catch (err) {
      console.error("Update group error:", err);
      smartToast.error(err.response?.data?.message || err.message || 'Failed to update group');
    } finally {
      setActionSubmitting(false);
    }
  };
  
  const handleCardClick = (groupId) => {
    navigate('/messages', { state: { groupId } });
  };

  const filteredGroups =
    searchQuery.length >= SEARCH_MIN_LENGTH
      ? groups.filter((group) =>
        (group.name || group.title || group.group_name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
      : groups;

  useEffect(() => {
    document.documentElement.classList.add('group-chat-active');
    document.body.classList.add('group-chat-active');
    return () => {
      document.documentElement.classList.remove('group-chat-active');
      document.body.classList.remove('group-chat-active');
    };
  }, []);

  return (
    <div className="groups-page">
      <GroupsFilterPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedYears={selectedYears}
        selectedSemesters={selectedSemesters}
        expandedYear={expandedYear}
        setExpandedYear={setExpandedYear}
        expandedSemester={expandedSemester}
        setExpandedSemester={setExpandedSemester}
        handleYearToggle={handleYearToggle}
        handleSemesterToggle={handleSemesterToggle}
      />
      <div className="groups-content">
        <div className="groups-header">
          <h1 className="groups-title">Groups</h1>
          {userRole === 'Administrator' && filteredGroups.length > 0 && (
            <button onClick={() => setShowCreateModal(true)} className="create-group-btn">
              <span>+</span> Create Group
            </button>
          )}
        </div>
        <GroupsGrid
          groups={filteredGroups}
          loading={loading}
          userRole={userRole}
          isSuperAdmin={isSuperAdmin}
          joinedGroups={joinedGroups}
          onJoinGroup={handleJoinGroup}
          onLeaveGroup={handleLeaveGroup}
          onEditGroup={handleEditGroupClick}
          onDeleteGroup={handleDeleteGroupClick}
          onCardClick={handleCardClick}
          onCreateGroup={() => setShowCreateModal(true)}
        />
      </div>
      <CreateGroupModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        handleContentChange={handleContentChange}
        onSubmit={handleCreateGroupSubmit}
        isSuperAdmin={isSuperAdmin}
        adminUsers={createModalAdmins}
        adminUsersLoading={createModalAdminsLoading}
      />
      <EditGroupModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        group={groupToEdit}
        onSubmit={handleUpdateGroupSubmit}
        submitting={actionSubmitting}
      />
      <ConfirmDeleteModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteGroup}
        title="Delete Group"
        message={`Are you sure you want to delete the group "${groupToDelete?.name || groupToDelete?.group_name || groupToDelete?.title || 'this group'}"?`}
        confirming={actionSubmitting}
      />
      <LeaveGroupLastAdminModal
        show={Boolean(lastAdminLeaveModal)}
        groupName={lastAdminLeaveModal?.groupName}
        candidates={lastAdminLeaveModal?.candidates ?? []}
        currentAdminRole={lastAdminLeaveModal?.currentAdminRole}
        onClose={() => !lastAdminLeaveSubmitting && setLastAdminLeaveModal(null)}
        onConfirm={handleLastAdminLeaveConfirm}
        submitting={lastAdminLeaveSubmitting}
      />
    </div>
  );
};

export default Groups;
