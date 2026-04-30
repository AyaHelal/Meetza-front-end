import React from 'react';
import { PencilSimpleLine as PencilSimpleLineIcon, Trash as TrashIcon } from '@phosphor-icons/react';

function normalizePhotoSrc(v) {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function GroupCard({ group, index, userRole, isSuperAdmin, joinedGroups, onJoin, onLeave, onEdit, onDelete }) {
  const [hoverEdit, setHoverEdit] = React.useState(false);
  const [hoverDelete, setHoverDelete] = React.useState(false);
  const [imgOk, setImgOk] = React.useState(true);
  const groupId = group.group_id || group.id;
  const name = group.name || group.title || group.group_name || group.content_name;
  const photo = normalizePhotoSrc(group.group_photo || group.photo);
  const fallbackPhoto = "/assets/group-standard.png";
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
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div
            className={`group-card-title mb-0 ${isMemberView ? 'group-card-title--member' : ''}`}
            style={{ wordBreak: 'break-word', paddingRight: '8px' }}
          >
            {name || 'Title'}
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
            </div>
          )}
        </div>
        
        {(isMemberView || showInstructorLine) && (
          <div className="group-card-instructor mb-3">{`Dr ${instructor}`}</div>
        )}

        <div className="d-flex mt-auto align-items-center position-relative w-100 justify-content-center" style={{ minHeight: '36px' }}>
          <div className="d-flex gap-2">
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
                    className={`group-join-btn group-join-btn--member ${!isMemberView ? 'position-absolute start-0' : ''}`}
                    onClick={() => groupId && onLeave(groupId)}
                    style={{ backgroundColor: '#dc3545', borderColor: '#dc3545', color: '#fff', width: '85px', margin: 0 }}
                  >
                    Leave
                  </button>
                )}
              </>
            ) : !isSuperAdmin && (
              <button
                className={`group-join-btn group-join-btn--member ${!isMemberView ? 'position-absolute start-0' : ''}`}
                onClick={() => groupId && onJoin(groupId)}
                disabled={!groupId}
                style={{ width: '85px', margin: 0 }}
              >
                Join
              </button>
            )}
          </div>

          {userRole === 'Administrator' && groupId && (
            <button
              className="group-join-btn group-join-btn--member position-absolute end-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group);
              }}
              title="Delete Group"
              style={{
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                color: '#fff',
                padding: '0 12px',
                width: 'auto',
                margin: 0
              }}
            >
              <TrashIcon size={20} weight="bold" />
            </button>
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
        />
      ))}
    </div>
  );
}
