import React, { useState, useEffect } from 'react';
import { smartToast } from '../../API/toastManager';
import { useAuth } from '../../context/AuthContext';
import { createGroup, joinGroup } from './services/groupsService';
import GroupsFilterPanel from './components/GroupsFilterPanel';
import GroupsGrid from './components/GroupsGrid';
import CreateGroupModal from './components/CreateGroupModal';
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
    </div>
  );
};

export default Groups;
