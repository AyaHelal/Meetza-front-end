import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GroupsFilterPanel from './components/GroupsFilterPanel';
import GroupsGrid from './components/GroupsGrid';
import CreateGroupModal from './components/CreateGroupModal';
import EditGroupModal from './components/EditGroupModal';
import LeaveGroupLastAdminModal from './components/LeaveGroupLastAdminModal';
import { ConfirmDeleteModal } from '../../components/shared/ConfirmDeleteModal';
import {
  useGroupsFilters,
  useGroupsData,
  useGroupsActions,
} from './hooks';
import './Groups.css';

const Groups = () => {
  const { user } = useAuth();
  
  const filters = useGroupsFilters();
  const {
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

  const {
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    groupToEdit,
    showDeleteModal,
    setShowDeleteModal,
    groupToDelete,
    actionSubmitting,
    createModalAdmins,
    createModalAdminsLoading,
    lastAdminLeaveModal,
    setLastAdminLeaveModal,
    lastAdminLeaveSubmitting,
    searchQuery,
    setSearchQuery,
    handleCreateGroupSubmit,
    handleJoinGroup,
    handleLeaveGroup,
    handleLastAdminLeaveConfirm,
    handleDeleteGroupClick,
    handleEditGroupClick,
    confirmDeleteGroup,
    handleUpdateGroupSubmit,
    handleCardClick,
    filteredGroups,
    formData,
    handleContentChange,
  } = useGroupsActions({
    user,
    groups,
    setGroups,
    isSuperAdmin,
    fetchGroupsAndMembership,
    setJoinedGroups,
  });

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
