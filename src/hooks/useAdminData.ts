
import { useState, useEffect } from 'react';
import type { AdminUser, AdminAgency, SystemMetrics } from '@/types/admin';
import { fetchUsers, suspendUser, activateUser, deleteUser, addCreditsToUser } from '@/services/adminUserService';
import { fetchAgencies } from '@/services/adminAgencyService';
import { fetchMetrics } from '@/services/adminMetricsService';

export const useAdminData = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [agencies, setAgencies] = useState<AdminAgency[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    totalAgencies: 0,
    totalCreditsUsed: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const userData = await fetchUsers();
    setUsers(userData);
  };

  const loadAgencies = async () => {
    const agencyData = await fetchAgencies();
    setAgencies(agencyData);
    return agencyData;
  };

  const loadMetrics = async (agencyData: AdminAgency[]) => {
    const metricsData = await fetchMetrics(agencyData);
    setMetrics(metricsData);
  };

  const handleSuspendUser = async (userId: string) => {
    await suspendUser(userId);
    await loadUsers();
  };

  const handleActivateUser = async (userId: string) => {
    await activateUser(userId);
    await loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
    await loadUsers();
  };

  const handleAddCreditsToUser = async (userId: string, credits: number) => {
    await addCreditsToUser(userId, credits);
    await loadUsers();
  };

  const refetch = async () => {
    setLoading(true);
    await loadUsers();
    const agencyData = await loadAgencies();
    await loadMetrics(agencyData);
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadUsers();
      const agencyData = await loadAgencies();
      await loadMetrics(agencyData);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    users,
    agencies,
    metrics,
    loading,
    suspendUser: handleSuspendUser,
    activateUser: handleActivateUser,
    deleteUser: handleDeleteUser,
    addCreditsToUser: handleAddCreditsToUser,
    refetch
  };
};
