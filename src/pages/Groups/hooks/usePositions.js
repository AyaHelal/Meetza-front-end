import { useState, useEffect } from 'react';
import { getPositions } from '../services/groupsService';
import { smartToast } from '../../../API/toastManager';

export function isAdminForPositions(user) {
  const rawRole = (user?.role || 'Member').toString().toLowerCase();
  return rawRole.includes('administrator') || rawRole.includes('super_admin') || rawRole === 'admin';
}

export function usePositions(user, showCreateModal) {
  const [positions, setPositions] = useState([]);

  const fetchPositions = async () => {
    try {
      const response = await getPositions();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPositions(data);
    } catch (error) {
      if (error.response?.status !== 403) console.error('Error fetching positions:', error);
      smartToast.error('Failed to load positions');
    }
  };

  const canFetch = isAdminForPositions(user);

  useEffect(() => {
    if (!canFetch) return;
    fetchPositions();
  }, [user?.role]);

  useEffect(() => {
    if (!showCreateModal || !canFetch || positions.length > 0) return;
    fetchPositions();
  }, [showCreateModal]);

  return { positions, fetchPositions };
}
