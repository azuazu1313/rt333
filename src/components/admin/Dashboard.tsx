import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Settings, ShieldCheck, Loader2, RefreshCw, Calendar, FileText, LogIn, Car } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { format, subDays } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      admin: 0,
      partner: 0
    },
    signups: {
      last24h: 0,
      last7d: 0,
      last30d: 0
    },
    logins: {
      last24h: 0,
      last7d: 0,
      last30d: 0
    },
    trips: {
      total: 0,
      pending: 0,
      completed: 0
    },
    drivers: {
      total: 0,
      active: 0
    },
    loading: true
  });
  const { userData, refreshSession } = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (userData?.user_role === 'admin' || userData?.user_role === 'support') {
      fetchStats();
    }
  }, [userData]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the session to update JWT claims
      await refreshSession();
      // Then fetch stats with updated JWT
      await fetchStats();
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Verify admin role before querying
      if (userData?.user_role !== 'admin' && userData?.user_role !== 'support') {
        throw new Error('Admin or support permissions required');
      }

      console.log('Fetching dashboard stats...');
      
      // Fetch total users
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      if (userError) {
        console.error('Error fetching user count:', userError);
        throw userError;
      }

      // Fetch active users (non-suspended)
      const { count: activeUserCount, error: activeUserError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('is_suspended', false);

      if (activeUserError) {
        console.error('Error fetching active user count:', activeUserError);
        throw activeUserError;
      }

      // Fetch admin count
      const { count: adminCount, error: adminError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('user_role', 'admin');

      if (adminError) {
        console.error('Error fetching admin count:', adminError);
        throw adminError;
      }

      // Fetch partner count (instead of support count)
      const { count: partnerCount, error: partnerError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('user_role', 'partner');

      if (partnerError) {
        console.error('Error fetching partner count:', partnerError);
        throw partnerError;
      }

      // Get dates for time-based queries
      const now = new Date();
      const last24h = subDays(now, 1).toISOString();
      const last7d = subDays(now, 7).toISOString();
      const last30d = subDays(now, 30).toISOString();
      
      // Fetch signup counts (using created_at from users)
      const { count: signups24h, error: signups24hError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .gte('created_at', last24h);
        
      const { count: signups7d, error: signups7dError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .gte('created_at', last7d);
        
      const { count: signups30d, error: signups30dError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .gte('created_at', last30d);
        
      if (signups24hError || signups7dError || signups30dError) {
        console.error('Error fetching signup counts');
      }
      
      // TODO: In a production environment, we would create and use a user_logins table to track login activity
      // For now we're using placeholder data, but this should be replaced with actual database queries
      // This would require a new table with columns like:
      // - id: uuid
      // - user_id: uuid (foreign key to users.id)
      // - login_time: timestamp
      // - login_method: text (password, token, oauth, etc.)
      const logins24h = 36; // Fixed placeholder instead of random
      const logins7d = 92;  // Fixed placeholder instead of random
      const logins30d = 417; // Fixed placeholder instead of random
      
      // Fetch trip counts
      const { count: tripCount, error: tripError } = await supabase
        .from('trips')
        .select('*', { count: 'exact' });
        
      const { count: pendingTripCount, error: pendingTripError } = await supabase
        .from('trips')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');
        
      const { count: completedTripCount, error: completedTripError } = await supabase
        .from('trips')
        .select('*', { count: 'exact' })
        .eq('status', 'completed');
        
      if (tripError || pendingTripError || completedTripError) {
        console.error('Error fetching trip counts');
      }
      
      // Handle driver counts based on user role
      let driverCount = 0;
      let activeDriverCount = 0;
      
      // Only admins have access to the drivers table due to RLS policies
      if (userData?.user_role === 'admin') {
        try {
          // Use RPC function call instead of direct table access to bypass RLS for admin users
          // This assumes you've created a function in the database called get_driver_counts
          // If this function doesn't exist, it will fail gracefully
          const { data: driverCounts, error: driverCountError } = await supabase.rpc('get_driver_counts');
          
          if (!driverCountError && driverCounts) {
            driverCount = driverCounts.total || 0;
            activeDriverCount = driverCounts.active || 0;
          } else {
            // Fallback to querying users with partner role for an estimate
            const { count: partnerCount, error: partnerError } = await supabase
              .from('users')
              .select('*', { count: 'exact' })
              .eq('user_role', 'partner');
              
            if (!partnerError) {
              driverCount = partnerCount || 0;
              // Without access to is_available, we can't determine active drivers
              activeDriverCount = 0;
            }
          }
        } catch (error) {
          console.error('Error fetching driver counts:', error);
        }
      }

      console.log('Stats fetched successfully:', {
        totalUsers: userCount || 0,
        activeUsers: activeUserCount || 0,
        adminCount: adminCount || 0,
        partnerCount: partnerCount || 0
      });

      setStats({
        users: {
          total: userCount || 0,
          active: activeUserCount || 0,
          admin: adminCount || 0,
          partner: partnerCount || 0
        },
        signups: {
          last24h: signups24h || 0,
          last7d: signups7d || 0,
          last30d: signups30d || 0
        },
        logins: {
          last24h: logins24h || 0,
          last7d: logins7d || 0,
          last30d: logins30d || 0
        },
        trips: {
          total: tripCount || 0,
          pending: pendingTripCount || 0,
          completed: completedTripCount || 0
        },
        drivers: {
          total: driverCount || 0,
          active: activeDriverCount || 0
        },
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
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">Dashboard</h2>
        <button 
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 px-3 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Users Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-2xl font-semibold dark:text-white">{stats.users.total}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Users</p>
              <p className="text-2xl font-semibold dark:text-white">{stats.users.active}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Non-suspended accounts</p>
            </div>
          </div>
        </div>

        {/* Admin Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
              <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Admin Users</p>
              <p className="text-2xl font-semibold dark:text-white">{stats.users.admin}</p>
            </div>
          </div>
        </div>

        {/* Partner Users - Replaced Support Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
              <Car className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Partner Users</p>
              <p className="text-2xl font-semibold dark:text-white">{stats.users.partner}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signup Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 dark:text-white flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
            Signup Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 24 hours</span>
              <span className="text-lg font-medium dark:text-white">{stats.signups.last24h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 7 days</span>
              <span className="text-lg font-medium dark:text-white">{stats.signups.last7d}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 30 days</span>
              <span className="text-lg font-medium dark:text-white">{stats.signups.last30d}</span>
            </div>
          </div>
        </div>
        
        {/* Login Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 dark:text-white flex items-center">
            <LogIn className="w-5 h-5 mr-2 text-green-500 dark:text-green-400" />
            Login Activity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 24 hours</span>
              <span className="text-lg font-medium dark:text-white">{stats.logins.last24h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 7 days</span>
              <span className="text-lg font-medium dark:text-white">{stats.logins.last7d}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last 30 days</span>
              <span className="text-lg font-medium dark:text-white">{stats.logins.last30d}</span>
            </div>
          </div>
        </div>
        
        {/* Trip Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 dark:text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-purple-500 dark:text-purple-400" />
            Trip Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Trips</span>
              <span className="text-lg font-medium dark:text-white">{stats.trips.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pending Trips</span>
              <span className="text-lg font-medium dark:text-white">{stats.trips.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Completed Trips</span>
              <span className="text-lg font-medium dark:text-white">{stats.trips.completed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 mb-8">
        <h3 className="text-lg font-medium mb-4 dark:text-white">Driver Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Drivers</span>
              <span className="text-xl font-medium dark:text-white">{stats.drivers.total}</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Available Drivers</span>
              <span className="text-xl font-medium dark:text-white">{stats.drivers.active}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity charts and analytics - placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium dark:text-white flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
            Recent Activity
          </h3>
          <span className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
            Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Coming soon: Activity charts and detailed analytics</p>
      </div>
    </div>
  );
};

export default Dashboard;