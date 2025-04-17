import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    activeUsers: 0,
    recentBookings: 0,
    loading: true
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Fetch total bookings
      const { count: bookingCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact' });

      // Fetch recent bookings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentBookingCount } = await supabase
        .from('trips')
        .select('*', { count: 'exact' })
        .gte('datetime', thirtyDaysAgo.toISOString());

      // Fetch active users (users with bookings in last 30 days)
      const { count: activeUserCount } = await supabase
        .from('trips')
        .select('user_id', { count: 'exact', distinct: true })
        .gte('datetime', thirtyDaysAgo.toISOString());

      setStats({
        totalUsers: userCount || 0,
        totalBookings: bookingCount || 0,
        activeUsers: activeUserCount || 0,
        recentBookings: recentBookingCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Bookings</p>
              <p className="text-2xl font-semibold">{stats.recentBookings}</p>
              <p className="text-xs text-gray-500">Last 30 days</p>
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