/**
 * Checks user roles for navigation permissions.
 */
export const getUserPermissions = (user) => {
  const userRole = (user?.role || "").toString().trim().toLowerCase();
  
  const isAdmin = 
    userRole.includes("administrator") || 
    userRole.includes("super_admin") || 
    userRole.includes("super-admin");
    
  const isSuperAdmin = 
    userRole.includes("super_admin") || 
    userRole.includes("super-admin");
    
  const canSeeCalendar = 
    userRole === "member" || 
    isAdmin || 
    isSuperAdmin;

  return { isAdmin, isSuperAdmin, canSeeCalendar };
};

/**
 * Calculates the screen position for the notification panel relative to the bell icon.
 */
export const getNotificationPanelPosition = (bellRef) => {
  if (bellRef && bellRef.current) {
    const rect = bellRef.current.getBoundingClientRect();
    const bellCenter = rect.top + rect.height / 2;
    const panelTop = Math.max(10, bellCenter - 300); 
    
    return {
      top: `${panelTop}px`,
      left: `${rect.right + 10}px`, 
    };
  }
  
  return {
    top: "80px",
    left: "90px", 
  };
};
