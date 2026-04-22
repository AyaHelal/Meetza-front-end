import { useState, useEffect } from 'react';
import { getGroups, getGroupMembership, parseGroupsResponse, groupIsManagedByUser } from '../services/groupsService';
import { smartToast } from '../../../API/toastManager';

function normalizeRole(user) {
  const rawRole = (user?.role || 'Member').toString().toLowerCase();
  const isSuperAdminRole = rawRole.includes('super_admin') || rawRole.includes('super-admin');
  const isAdminRole = rawRole.includes('administrator') || isSuperAdminRole;
  return { normalizedRole: isAdminRole ? 'Administrator' : 'Member', isSuperAdminRole };
}

export function useGroupsData(user, selectedYears, selectedSemesters) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState([]);

  const fetchGroupsAndMembership = async () => {
    const cacheKey = `groups_cache_${selectedYears.join(',')}_${selectedSemesters.join(',')}_${user?.id || 'guest'}`;
    const joinedCacheKey = `joined_groups_cache_${user?.id || 'guest'}`;
    let hasCache = false;

    const cachedGroups = localStorage.getItem(cacheKey);
    const cachedJoined = localStorage.getItem(joinedCacheKey);

    if (cachedGroups) {
      try {
        const parsedGroups = JSON.parse(cachedGroups);
        setGroups(parsedGroups);
        if (cachedJoined) setJoinedGroups(JSON.parse(cachedJoined));
        
        const { normalizedRole, isSuperAdminRole } = normalizeRole(user);
        setUserRole(normalizedRole);
        setIsSuperAdmin(isSuperAdminRole);
        
        setLoading(false);
        hasCache = true;
      } catch (e) {
        console.error('Failed to parse groups cache', e);
      }
    }

    if (!hasCache) {
      setGroups([]);
      setLoading(true);
    }

    try {
      const response = await getGroups({
        years: selectedYears,
        semesters: selectedSemesters,
      });
      const allResults = parseGroupsResponse(response);
      const uniqueGroups = allResults.filter(
        (group, index, self) =>
          index === self.findIndex((g) => (g.group_id || g.id) === (group.group_id || group.id))
      );

      const currentUserId = user?.id;
      const { normalizedRole, isSuperAdminRole } = normalizeRole(user);
      const isAdminRole = normalizedRole === 'Administrator';
      const visibleGroups =
        isAdminRole && !isSuperAdminRole && currentUserId
          ? uniqueGroups.filter((group) => groupIsManagedByUser(group, currentUserId))
          : uniqueGroups;

      setGroups(visibleGroups);
      setUserRole(normalizedRole);
      setIsSuperAdmin(isSuperAdminRole);
      
      localStorage.setItem(cacheKey, JSON.stringify(visibleGroups));

      if (currentUserId) {
        const updatedJoined = await Promise.all(
          visibleGroups.map(async (group) => {
            const groupId = group.group_id || group.id;
            if (!groupId) return null;
            try {
              const members = await getGroupMembership(groupId);
              return members.some((m) => m.id === currentUserId) ? groupId : null;
            } catch (err) {
              if (err.response?.status !== 403) console.error('Membership check error:', err);
              return null;
            }
          })
        );
        const filteredJoined = updatedJoined.filter(Boolean);
        setJoinedGroups(filteredJoined);
        localStorage.setItem(joinedCacheKey, JSON.stringify(filteredJoined));
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      smartToast.error('Failed to load groups. Please try again.');
    } finally {
      if (!hasCache) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchGroupsAndMembership();
  }, [selectedYears, selectedSemesters, user?.id]);

  return {
    groups,
    setGroups,
    loading,
    userRole,
    isSuperAdmin,
    joinedGroups,
    setJoinedGroups,
    fetchGroupsAndMembership,
  };
}
