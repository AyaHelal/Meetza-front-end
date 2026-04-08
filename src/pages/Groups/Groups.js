import React, { useState, useEffect } from 'react';
import { smartToast } from '../../API/toastManager';
import { useAuth } from '../../context/AuthContext';
import { createGroup, joinGroup } from './services/groupsService';
import GroupsFilterPanel from './components/GroupsFilterPanel';
import GroupsGrid from './components/GroupsGrid';
import CreateGroupModal from './components/CreateGroupModal';
import EditGroupModal from './components/EditGroupModal';
import { ConfirmDeleteModal } from '../../components/shared/ConfirmDeleteModal';
import api from '../../API/axiosInstance';
import {
  useGroupsFilters,
  usePositions,
  useGroupsData,
  useCreateGroupForm,
} from './hooks';
import './Groups.css';

const SEARCH_MIN_LENGTH = 3;

const Groups = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

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

  const { positions } = usePositions(user, showCreateModal);
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
    try {
      await createGroup(groupData, user.id);
      smartToast.success('Group created successfully!');
      setShowCreateModal(false);
      await fetchGroupsAndMembership();
    } catch (error) {
      console.error('Error creating group:', error);
      smartToast.error(error.response?.data?.message || 'Failed to create group');
      throw error;
    }
  };

  const { formData, handleContentChange, handleSubmit } = useCreateGroupForm(handleCreateGroup);

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
      setJoinedGroups((prev) => [...prev, groupId]);
      smartToast.success('Joined successfully!');
    } catch (error) {
      console.error('Join Error:', error);
      smartToast.error(error.response?.data?.message || error.message || 'Failed to join group');
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
    const { group_name, position_id, description, group_photo } = formData;
    const group_content_id = groupToEdit.group_content_id || groupToEdit.content_id;
    
    setActionSubmitting(true);
    try {
      const payload = {
        ...(group_name !== undefined && { group_name }),
        ...(position_id !== undefined && { position_id }),
        group_content_id: group_content_id ?? null,
        ...(description !== undefined && { description })
      };

      let response;
      if (group_photo) {
        const form = new FormData();
        Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, v); });
        form.append('group_photo', group_photo);
        response = await api.put(`/group/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        response = await api.put(`/group/${id}`, payload);
      }

      setGroups(prev => prev.map(g => (g.id === id || g.group_id === id) ? { ...g, ...payload, group_name: payload.group_name || g.group_name } : g));
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
          {userRole === 'Administrator' && !isSuperAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="create-group-btn">
              <span>+</span> Create Group
            </button>
          )}
        </div>
        <GroupsGrid
          groups={filteredGroups}
          loading={loading}
          userRole={userRole}
          joinedGroups={joinedGroups}
          onJoinGroup={handleJoinGroup}
          onEditGroup={handleEditGroupClick}
          onDeleteGroup={handleDeleteGroupClick}
        />
      </div>
      <CreateGroupModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        handleContentChange={handleContentChange}
        positions={positions}
        onSubmit={handleCreateGroupSubmit}
      />
      <EditGroupModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        group={groupToEdit}
        positions={positions}
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
    </div>
  );
};

export default Groups;
