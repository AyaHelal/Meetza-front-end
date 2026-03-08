import React from 'react';

const DEFAULT_POSTER = '/assets/grp-poster.png';

function GroupCard({ group, index, userRole, joinedGroups, onJoin }) {
  const groupId = group.group_id || group.id;
  const name = group.name || group.title || group.group_name || group.content_name;
  const photo = group.group_photo || group.photo || DEFAULT_POSTER;
  const instructor = group.admin?.name || group.admin_name || 'Unknown';
  const isJoined = groupId && joinedGroups.includes(groupId);

  return (
    <div key={groupId || group.name || index} className="group-card">
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
        <div className="group-card-title">{name}</div>
        {userRole === 'Member' && groupId && (
          <>
            <div className="group-card-instructor">{`Dr. ${instructor}`}</div>
            <button
              className={`group-join-btn py-2 w-50 align-items-center ${isJoined ? 'joined' : ''}`}
              onClick={() => onJoin(groupId)}
              disabled={isJoined}
            >
              {isJoined ? 'Joined' : 'Join'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GroupsGrid({ groups, loading, userRole, joinedGroups, onJoinGroup }) {
  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading groups...</p>
      </div>
    );
  }
  return (
    <div className="groups-grid">
      {groups.map((group, index) => (
        <GroupCard
          key={group.group_id || group.id || index}
          group={group}
          index={index}
          userRole={userRole}
          joinedGroups={joinedGroups}
          onJoin={onJoinGroup}
        />
      ))}
    </div>
  );
}
