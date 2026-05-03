import React from 'react';
import { PencilSimpleLine as PencilSimpleLineIcon, Trash as TrashIcon } from '@phosphor-icons/react';
import { useGroupCard } from '../hooks';

function GroupCard({ group, index, userRole, isSuperAdmin, joinedGroups, onJoin, onLeave, onEdit, onDelete, onCardClick }) {
  const {
    groupId,
    name,
    photo,
    instructor,
    description,
    isJoined,
    isMemberView,
    showInstructorLine,
    imgOk,
    setImgOk,
    handleCardClick,
  } = useGroupCard({
    group,
    userRole,
    isSuperAdmin,
    joinedGroups,
    onCardClick,
  });

  const fallbackPhoto = "/assets/group-standard.png";

  return (
    <div
      key={groupId || group.name || index}
      className={`group-card ${isMemberView ? 'group-card--member' : 'group-card--admin'}`}
      onClick={handleCardClick}
    >
      <div className="group-card-image">
        {photo && imgOk ? (
          <img
            src={photo}
            alt={name || 'Group'}
            onError={() => setImgOk(false)}
          />
        ) : (
          <img
            src={fallbackPhoto}
            alt={name || "Group"}
            className="group-card-image-fallback"
          />
        )}
      </div>
      <div className="group-card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-0">
          <div
            className={`group-card-title mb-0 ${isMemberView ? 'group-card-title--member' : ''}`}
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}
          >
            {name || 'Title'}
          </div>
        </div>

        {description && (
          <div className="group-card-description">
            {description}
          </div>
        )}

        {(isMemberView || showInstructorLine) && (
          <div className="group-card-instructor">{`Dr ${instructor}`}</div>
        )}

        <div className="d-flex mt-auto align-items-center gap-2 w-100 justify-content-center" style={{ minHeight: '36px' }}>
          {isJoined ? (
            <>
              {isMemberView && (
                <button
                  className="group-join-btn group-join-btn--member joined"
                  disabled={true}
                  style={{ width: '85px', margin: 0 }}
                >
                  Joined
                </button>
              )}
              {!isSuperAdmin && (
                <button
                  className="group-join-btn group-join-btn--member"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (groupId) onLeave(groupId);
                  }}
                  style={{ backgroundColor: '#FF383C', borderColor: '#FF383C', color: '#fff', width: '85px', margin: 0 }}
                >
                  Leave
                </button>
              )}
            </>
          ) : !isSuperAdmin && (
            <button
              className="group-join-btn group-join-btn--member"
              onClick={(e) => {
                e.stopPropagation();
                if (groupId) onJoin(groupId);
              }}
              disabled={!groupId}
              style={{ width: '85px', margin: 0 }}
            >
              Join
            </button>
          )}

          {userRole === 'Administrator' && groupId && (
            <>
              <button
                className="group-join-btn group-join-btn--member"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
                title="Edit Group"
                style={{
                  backgroundColor: '#f3f4f6',
                  borderColor: '#e5e7eb',
                  color: '#000',
                  padding: '0 12px',
                  width: 'auto',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PencilSimpleLineIcon size={20} weight="bold" />
              </button>

              <button
                className="group-join-btn group-join-btn--member"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group);
                }}
                title="Delete Group"
                style={{
                  backgroundColor: '#f3f4f6',
                  borderColor: '#e5e7eb',
                  color: '#FF0000',
                  padding: '0 12px',
                  width: 'auto',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TrashIcon size={20} weight="bold" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GroupsGrid({
  groups,
  loading,
  userRole,
  isSuperAdmin = false,
  joinedGroups,
  onJoinGroup,
  onLeaveGroup,
  onEditGroup,
  onDeleteGroup,
  onCardClick,
  onCreateGroup,
  ...props
}) {
  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading groups...</p>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="no-groups-container">
        <img
          src="/assets/GroupChat.png"
          alt="No groups found"
          className="no-groups-image"
        />
        <p className="no-groups-text">Ops! No groups Found</p>
        {userRole === 'Administrator' && (
          <button className="no-groups-create-btn" onClick={onCreateGroup}>
            Create Group
          </button>
        )}
      </div>
    );
  }

  const canManageGroups = userRole === 'Administrator';
  return (
    <div className="groups-grid">
      {groups.map((group, index) => (
        <GroupCard
          key={group.group_id || group.id || index}
          group={group}
          index={index}
          userRole={canManageGroups ? userRole : 'Member'}
          isSuperAdmin={isSuperAdmin}
          joinedGroups={joinedGroups}
          onJoin={onJoinGroup}
          onLeave={onLeaveGroup}
          onEdit={onEditGroup}
          onDelete={onDeleteGroup}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
