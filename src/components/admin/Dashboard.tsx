import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Settings, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminCount: 0,
    supportCount: 0,
    loading: true
  });
  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.user_role === 'admin') {
      fetchStats();
    }
  }, [userData]);

  const fetchStats = async () => {
    try {
      // Verify admin role before querying
      if (userData?.user_role !== 'admin') {
        throw new Error('Admin permissions required');
      }

      // Fetch total users
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      if (userError) throw userError;

      // Fetch active users (non-suspended)
      const { count: activeUserCount, error: activeUserError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_suspended', false);

      if (activeUserError) throw activeUserError;

      // Fetch admin count
      const { count: adminCount, error: adminError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('user_role', 'admin');

      if (adminError) throw adminError;

      // Fetch support count
      const { count: supportCount, error: supportError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('user_role', 'support');

      if (supportError) throw supportError;

      setStats({
        totalUsers: userCount || 0,
        activeUsers: activeUserCount || 0,
        adminCount: adminCount || 0,
        supportCount: supportCount || 0,
        loading: false
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch dashboard data. Please try again.",
      });
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold">{stats.activeUsers}</p>
              <p className="text-xs text-gray-500">Non-suspended accounts</p>
            </div>
          </div>
        </div>

        {/* Admin Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admin Users</p>
              <p className="text-2xl font-semibold">{stats.adminCount}</p>
            </div>
          </div>
        </div>

        {/* Support Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <ShieldCheck className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Support Users</p>
              <p className="text-2xl font-semibold">{stats.supportCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional charts and analytics can be added here */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <p className="text-gray-500">Coming soon: Activity charts and detailed analytics</p>
      </div>
    </div>
  );
};

export default Dashboard;
