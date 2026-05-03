import { useState, useCallback } from 'react';

function normalizePhotoSrc(v) {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export const useGroupCard = ({
  group,
  userRole,
  isSuperAdmin,
  joinedGroups,
  onCardClick,
}) => {
  const [imgOk, setImgOk] = useState(true);

  const groupId = group.id;
  const name = group.group_name;
  const photo = normalizePhotoSrc(group.group_photo);
  const instructor = group.admins?.[0]?.name || 'Unknown';
  const description = group.description || '';
  const isJoined = groupId && joinedGroups.includes(groupId);
  const isMemberView = userRole === 'Member';
  const showInstructorLine = isMemberView || isSuperAdmin;

  const handleCardClick = useCallback(() => {
    if (!onCardClick) return;
    if (isMemberView) {
      if (isJoined) onCardClick(groupId);
    } else {
      // Administrator or SuperAdmin
      onCardClick(groupId);
    }
  }, [onCardClick, isMemberView, isJoined, groupId]);

  return {
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
  };
};
