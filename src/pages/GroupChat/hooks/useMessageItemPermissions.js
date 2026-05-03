import { useMemo } from 'react';

export function useMessageItemPermissions({
  message,
  currentUser,
  currentUserEmail,
  userRole,
  onReply,
  onReact,
}) {
  const resolvedCurrentEmail = currentUserEmail || currentUser?.email || currentUser?.user_email || null;
  const messageEmail = message.senderEmail || message.sender_email || null;
  
  const emailMatch = useMemo(() => {
    return messageEmail && resolvedCurrentEmail && messageEmail.toLowerCase() === resolvedCurrentEmail.toLowerCase();
  }, [messageEmail, resolvedCurrentEmail]);

  const nameMatch = useMemo(() => {
    return message.sender === 'You' || message.sender === currentUser?.name;
  }, [message.sender, currentUser?.name]);

  const isOwnMessage = emailMatch || nameMatch;

  const isSuperAdmin = useMemo(() => {
    return userRole === 'Super_Admin' ||
      (typeof userRole === 'string' && userRole.toLowerCase().includes('super_admin'));
  }, [userRole]);

  const isGroupAdminRole = useMemo(() => {
    return userRole === 'Administrator' || isSuperAdmin;
  }, [userRole, isSuperAdmin]);

  const isTemp = String(message.id || '').startsWith('temp-');

  const canReply = Boolean(onReply) && !isSuperAdmin && !message.is_deleted && !isTemp;
  const canReact = Boolean(onReact) && !isSuperAdmin && !message.is_deleted && !isTemp;
  const canModerate = isOwnMessage || isGroupAdminRole;
  const canOpenSheet = canModerate || canReply || canReact;

  return {
    isOwnMessage,
    isSuperAdmin,
    isGroupAdminRole,
    canReply,
    canReact,
    canModerate,
    canOpenSheet,
    resolvedCurrentEmail,
  };
}
