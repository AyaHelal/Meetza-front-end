import React from 'react';
import { PencilSimpleLine as PencilSimpleLineIcon, Trash as TrashIcon } from '@phosphor-icons/react';

const DEFAULT_POSTER = '/assets/grp-poster.png';

function GroupCard({ group, index, userRole, isSuperAdmin, joinedGroups, onJoin, onEdit, onDelete }) {
  const [hoverEdit, setHoverEdit] = React.useState(false);
  const [hoverDelete, setHoverDelete] = React.useState(false);
  const groupId = group.group_id || group.id;
  const name = group.name || group.title || group.group_name || group.content_name;
  const photo = group.group_photo || group.photo || DEFAULT_POSTER;
  const instructor = group.admin?.name || group.admin_name || 'Unknown';
  const isJoined = groupId && joinedGroups.includes(groupId);
  const isMemberView = userRole === 'Member';
  const showInstructorLine = isMemberView || isSuperAdmin;

  return (
    <div
      key={groupId || group.name || index}
      className={`group-card ${isMemberView ? 'group-card--member' : 'group-card--admin'}`}
    >
      <div className="group-card-image">
        <img
          src={photo}
          alt={name || 'Group'}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_POSTER;
          }}
        />
      </div>
      <div className="group-card-body">
        {isMemberView ? (
          <>
            <div className="group-card-title group-card-title--member">{name || 'Title'}</div>
            <div className="group-card-instructor">{`Dr ${instructor}`}</div>
            <button
              className={`group-join-btn group-join-btn--member ${isJoined ? 'joined' : ''}`}
              onClick={() => groupId && onJoin(groupId)}
              disabled={isJoined || !groupId}
            >
              {isJoined ? 'Joined' : 'Join'}
            </button>
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div
                className="group-card-title mb-0"
                style={{ wordBreak: 'break-word', paddingRight: '8px' }}
              >
                {name}
              </div>
              {userRole === 'Administrator' && groupId && (
                <div className="d-flex gap-2 align-items-center flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(group);
                    }}
                    onMouseEnter={() => setHoverEdit(true)}
                    onMouseLeave={() => setHoverEdit(false)}
                    title="Edit Group"
                    style={{
                      border: 'none',
                      background: hoverEdit ? '#f3f4f6' : 'transparent',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <PencilSimpleLineIcon size={20} color="#000" weight="bold" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(group);
                    }}
                    onMouseEnter={() => setHoverDelete(true)}
                    onMouseLeave={() => setHoverDelete(false)}
                    title="Delete Group"
                    style={{
                      border: 'none',
                      background: hoverDelete ? 'rgb(255,241,240)' : 'transparent',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <TrashIcon size={20} color="#ff4d4f" weight="bold" />
                  </button>
                </div>
              )}
            </div>
            {showInstructorLine && <div className="group-card-instructor">{`Dr ${instructor}`}</div>}
          </>
        )}
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
  onEditGroup,
  onDeleteGroup,
}) {
  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading groups...</p>
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
          onEdit={onEditGroup}
          onDelete={onDeleteGroup}
        />
      ))}
    </div>
  );
}
