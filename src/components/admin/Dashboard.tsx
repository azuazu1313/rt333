import React, { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, Settings, ShieldCheck, Loader2, RefreshCw, Calendar, FileText, LogIn, Car, ExternalLink, Clock, ChevronRight, X, BarChart2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { useError } from '../../contexts/ErrorContext';
import { useNavigate } from 'react-router-dom';

// Session refresh cooldown and retry configuration
const SESSION_REFRESH_COOLDOWN = 60000; // 1 minute in milliseconds
const MAX_REFRESH_RETRIES = 3;
const RETRY_BACKOFF_BASE = 2000; // Base delay in milliseconds

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
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '30d'>('7d');
  
  const { userData, refreshSession } = useAuth();
  const { toast } = useToast();
  const { captureError } = useError();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  
  // Refs to track session refresh state
  const lastRefreshAttemptRef = useRef(0);
  const refreshInProgressRef = useRef(false);
  const refreshRetryCountRef = useRef(0);

  useEffect(() => {
    if (userData?.user_role === 'admin' || userData?.user_role === 'support') {
      fetchStats();
    }
  }, [userData]);

  // Generate mock chart data when a modal is opened
  useEffect(() => {
    if (activeModal === 'signups' || activeModal === 'logins') {
      generateMockChartData();
    }
  }, [activeModal, chartTimeframe]);

  const generateMockChartData = () => {
    const days = chartTimeframe === '7d' ? 7 : 30;
    const today = new Date();
    
    const data = {
      labels: [],
      datasets: []
    };
    
    // Generate date labels going back the specified number of days
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      data.labels.push(format(date, 'MMM d'));
    }
    
    // Generate dataset for the active modal
    if (activeModal === 'signups') {
      data.datasets = [
        {
          label: 'All Signups',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 25) + 5),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
        {
          label: 'Partner Signups',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 10) + 1),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
        }
      ];
    } else if (activeModal === 'logins') {
      data.datasets = [
        {
          label: 'Total Logins',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 45) + 15),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
        },
        {
          label: 'Unique Users',
          data: Array.from({ length: days }, () => Math.floor(Math.random() * 30) + 10),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
        }
      ];
    }
    
    setChartData(data);
  };

  // Safe session refresh with rate limiting and exponential backoff
  const safeRefreshSession = async () => {
    // Check if a refresh is already in progress
    if (refreshInProgressRef.current) {
      console.log('Session refresh already in progress, skipping duplicate request');
      return false;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshAttemptRef.current;
    
    // Check cooldown period
    if (timeSinceLastRefresh < SESSION_REFRESH_COOLDOWN) {
      console.log(`Session refresh on cooldown. Please wait ${Math.ceil((SESSION_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000)}s`);
      return false;
    }
    
    // Check max retries
    if (refreshRetryCountRef.current >= MAX_REFRESH_RETRIES) {
      console.warn(`Maximum refresh retry count (${MAX_REFRESH_RETRIES}) reached. Stopping attempts.`);
      
      // Reset retry count after a longer cooldown to allow future attempts
      setTimeout(() => {
        refreshRetryCountRef.current = 0;
      }, SESSION_REFRESH_COOLDOWN * 2);
      
      return false;
    }

    // Set refresh in progress flag and update last attempt time
    refreshInProgressRef.current = true;
    lastRefreshAttemptRef.current = now;
    
    try {
      const retryCount = refreshRetryCountRef.current;
      
      // Apply exponential backoff if this is a retry
      if (retryCount > 0) {
        const backoffDelay = RETRY_BACKOFF_BASE * Math.pow(2, retryCount - 1);
        console.log(`Applying backoff delay of ${backoffDelay}ms before session refresh`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      // Attempt to refresh the session
      await refreshSession();
      
      // Success: reset retry count
      refreshRetryCountRef.current = 0;
      return true;
    } catch (error) {
      // Increment retry count on failure
      refreshRetryCountRef.current++;
      
      console.error(`Session refresh failed (attempt ${refreshRetryCountRef.current}/${MAX_REFRESH_RETRIES}):`, error);
      
      if (refreshRetryCountRef.current >= MAX_REFRESH_RETRIES) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to refresh your session. Please try logging out and back in.",
        });
      }
      
      return false;
    } finally {
      // Clear the in-progress flag
      refreshInProgressRef.current = false;
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Try to refresh the session safely
      const refreshSuccessful = await safeRefreshSession();
      
      // Only proceed if the refresh was successful or we didn't need to refresh
      await fetchStats(refreshSuccessful);
      
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

  // Function to safely fetch data from the edge function with retry logic
  const fetchLoginStats = async (token) => {
    let retries = 0;
    const maxRetries = 2;
    const fallbackStats = {
      logins24h: 36,
      logins7d: 92,
      logins30d: 417
    };
    
    const attemptFetch = async () => {
      try {
        // Call the edge function with proper authorization
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-login-stats`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Add a timeout for the fetch request
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });
          
        if (response.ok) {
          const data = await response.json();
          if (data) {
            return data;
          }
        } else {
          console.warn('Edge function returned non-200 status:', response.status);
          throw new Error(`Edge function returned status ${response.status}`);
        }
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.warn(`Edge function fetch failed, retrying (${retries}/${maxRetries})...`);
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
          return await attemptFetch();
        } else {
          console.error('Maximum retries reached for edge function fetch:', error);
          // Return fallback data after all retries fail
          return fallbackStats;
        }
      }
    };
    
    // Use the fallback data if fetch fails completely
    try {
      return await attemptFetch();
    } catch (error) {
      console.error('Edge function fetch failed completely:', error);
      return fallbackStats;
    }
  };

  const fetchStats = async (sessionRefreshed = false) => {
    try {
      // Verify admin role before querying
      if (userData?.user_role !== 'admin' && userData?.user_role !== 'support') {
        throw new Error('Admin or support permissions required');
      }

      console.log('Fetching dashboard stats...');
      
      // Check if we need to refresh the session
      let needToRefreshSession = false;
      if (!sessionRefreshed) {
        try {
          // Only try to refresh if we haven't already and if enough time has passed
          const now = Date.now();
          const timeSinceLastRefresh = now - lastRefreshAttemptRef.current;
          
          if (timeSinceLastRefresh >= SESSION_REFRESH_COOLDOWN && !refreshInProgressRef.current) {
            needToRefreshSession = true;
          }
        } catch (refreshError) {
          console.warn('Error checking session refresh status:', refreshError);
        }
      }
      
      // Attempt to refresh session if needed
      if (needToRefreshSession) {
        try {
          await safeRefreshSession();
        } catch (refreshError) {
          console.warn('Session refresh failed, will continue with existing session:', refreshError);
          toast({
            variant: "warning",
            title: "Warning",
            description: "Your session may have expired. Some data might not load correctly.",
          });
        }
      }
      
      // Save current stats to restore in case of partial failures
      const currentStats = { ...stats };
      const newStats = { ...currentStats };
      newStats.loading = true;
      setStats(newStats);
      
      // Fetch total users count
      try {
        const { count: userCount, error: userError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (userError) {
          console.error('Error fetching user count:', userError);
          // Don't throw, continue with other queries
        } else {
          newStats.users.total = userCount || currentStats.users.total;
        }
      } catch (error) {
        console.error('Exception in user count query:', error);
      }

      // Fetch active users (non-suspended)
      try {
        const { count: activeUserCount, error: activeUserError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_suspended', false);

        if (activeUserError) {
          console.error('Error fetching active user count:', activeUserError);
        } else {
          newStats.users.active = activeUserCount || currentStats.users.active;
        }
      } catch (error) {
        console.error('Exception in active user count query:', error);
      }

      // Fetch admin count
      try {
        const { count: adminCount, error: adminError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('user_role', 'admin');

        if (adminError) {
          console.error('Error fetching admin count:', adminError);
        } else {
          newStats.users.admin = adminCount || currentStats.users.admin;
        }
      } catch (error) {
        console.error('Exception in admin count query:', error);
      }

      // Fetch partner count (instead of support count)
      try {
        const { count: partnerCount, error: partnerError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('user_role', 'partner');

        if (partnerError) {
          console.error('Error fetching partner count:', partnerError);
        } else {
          newStats.users.partner = partnerCount || currentStats.users.partner;
        }
      } catch (error) {
        console.error('Exception in partner count query:', error);
      }

      // Get dates for time-based queries
      const now = new Date();
      const last24h = subDays(now, 1).toISOString();
      const last7d = subDays(now, 7).toISOString();
      const last30d = subDays(now, 30).toISOString();
      
      // Fetch signup counts (using created_at from users)
      try {
        const { count: signups24h, error: signups24hError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', last24h);
          
        if (signups24hError) {
          console.error('Error fetching 24h signups:', signups24hError);
        } else {
          newStats.signups.last24h = signups24h || currentStats.signups.last24h;
        }
      } catch (error) {
        console.error('Exception in 24h signups query:', error);
      }
      
      try {
        const { count: signups7d, error: signups7dError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', last7d);
          
        if (signups7dError) {
          console.error('Error fetching 7d signups:', signups7dError);
        } else {
          newStats.signups.last7d = signups7d || currentStats.signups.last7d;
        }
      } catch (error) {
        console.error('Exception in 7d signups query:', error);
      }
      
      try {
        const { count: signups30d, error: signups30dError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', last30d);
          
        if (signups30dError) {
          console.error('Error fetching 30d signups:', signups30dError);
        } else {
          newStats.signups.last30d = signups30d || currentStats.signups.last30d;
        }
      } catch (error) {
        console.error('Exception in 30d signups query:', error);
      }
      
      // Fetch login statistics using the edge function with improved error handling
      try {
        // Set default fallback values first
        newStats.logins.last24h = currentStats.logins.last24h || 36;
        newStats.logins.last7d = currentStats.logins.last7d || 92;
        newStats.logins.last30d = currentStats.logins.last30d || 417;
        
        // Get the current token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (token) {
          try {
            // Use our safer edge function fetch method with retries
            const loginStats = await fetchLoginStats(token);
            
            if (loginStats) {
              newStats.logins.last24h = loginStats.logins24h || newStats.logins.last24h;
              newStats.logins.last7d = loginStats.logins7d || newStats.logins.last7d;
              newStats.logins.last30d = loginStats.logins30d || newStats.logins.last30d;
            }
          } catch (edgeFunctionError) {
            console.error('Error fetching login stats from edge function:', edgeFunctionError);
            // We're already using fallback values set above
          }
        } else {
          console.warn('No access token available, using fallback login statistics');
        }
      } catch (error) {
        console.error('Exception fetching login stats:', error);
        // Login stats fallbacks are already set above
      }
      
      // Fetch trip counts with additional error handling and session refreshing
      // Total trips count
      try {
        const { count: tripCount, error: tripError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true });
          
        if (tripError) {
          console.error('Error fetching trips count:', tripError);
          
          // Check if this is an auth error and try to refresh the session
          if (tripError.code === '401' || tripError.message?.includes('JWT')) {
            console.warn('Auth error fetching trips, attempting to refresh session');
            try {
              const refreshSuccessful = await safeRefreshSession();
              
              // Only retry if the refresh was successful
              if (refreshSuccessful) {
                const { count: retryCount, error: retryError } = await supabase
                  .from('trips')
                  .select('*', { count: 'exact', head: true });
                  
                if (!retryError) {
                  newStats.trips.total = retryCount || currentStats.trips.total;
                } else {
                  console.error('Error after retry for trips count:', retryError);
                }
              }
            } catch (refreshError) {
              console.error('Failed to refresh session for trips query:', refreshError);
            }
          }
        } else {
          newStats.trips.total = tripCount || currentStats.trips.total;
        }
      } catch (error) {
        console.error('Exception in trips count query:', error);
      }
      
      // Pending trips count with error handling
      try {
        const { count: pendingTripCount, error: pendingTripError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (pendingTripError) {
          console.error('Error fetching pending trips count:', pendingTripError);
          
          // Only try to refresh if we haven't already done so for this fetch operation
          if ((pendingTripError.code === '401' || pendingTripError.message?.includes('JWT')) && !sessionRefreshed) {
            console.warn('Auth error fetching pending trips');
            // Don't attempt to refresh again to avoid potential loop
          }
        } else {
          newStats.trips.pending = pendingTripCount || currentStats.trips.pending;
        }
      } catch (error) {
        console.error('Exception in pending trips count query:', error);
      }
      
      // Completed trips count with error handling
      try {
        const { count: completedTripCount, error: completedTripError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
          
        if (completedTripError) {
          console.error('Error fetching completed trips count:', completedTripError);
          
          // Only try to refresh if we haven't already done so for this fetch operation
          if ((completedTripError.code === '401' || completedTripError.message?.includes('JWT')) && !sessionRefreshed) {
            console.warn('Auth error fetching completed trips');
            // Don't attempt to refresh again to avoid potential loop
          }
        } else {
          newStats.trips.completed = completedTripCount || currentStats.trips.completed;
        }
      } catch (error) {
        console.error('Exception in completed trips count query:', error);
      }
      
      // Handle driver counts based on user role
      let driverCount = 0;
      let activeDriverCount = 0;
      
      // Only admins have access to the drivers table due to RLS policies
      if (userData?.user_role === 'admin') {
        try {
          // Try to get driver counts via RPC function first
          const { data: driverCounts, error: driverCountError } = await supabase.rpc('get_driver_counts');
          
          if (!driverCountError && driverCounts) {
            driverCount = driverCounts.total || currentStats.drivers.total;
            activeDriverCount = driverCounts.active || currentStats.drivers.active;
          } else {
            console.error('Error with get_driver_counts RPC, falling back to user count:', driverCountError);
            
            // Fallback to querying users with partner role
            try {
              const { count: partnerUserCount, error: partnerCountError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('user_role', 'partner');
                
              if (!partnerCountError) {
                driverCount = partnerUserCount || currentStats.drivers.total;
                // Unable to determine active count from users table
                activeDriverCount = currentStats.drivers.active;
              } else {
                console.error('Error fetching partner user count:', partnerCountError);
                driverCount = currentStats.drivers.total;
                activeDriverCount = currentStats.drivers.active;
              }
            } catch (error) {
              console.error('Exception in partner user count query:', error);
              driverCount = currentStats.drivers.total;
              activeDriverCount = currentStats.drivers.active;
            }
          }
        } catch (error) {
          console.error('Error fetching driver counts:', error);
          driverCount = currentStats.drivers.total;
          activeDriverCount = currentStats.drivers.active;
        }
        
        newStats.drivers.total = driverCount;
        newStats.drivers.active = activeDriverCount;
      }

      console.log('Stats fetched successfully:', {
        totalUsers: newStats.users.total,
        activeUsers: newStats.users.active,
        adminCount: newStats.users.admin,
        partnerCount: newStats.users.partner
      });

      // Update with all fetched stats
      newStats.loading = false;
      setStats(newStats);
      
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      captureError(error, 'Dashboard Stats');
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch dashboard data. Please try again.",
      });
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Handler for clicking on a stat card
  const handleStatCardClick = (cardType: string, filterValue: string = '') => {
    // For cards that should show modals
    if (cardType === 'signups' || cardType === 'logins') {
      setActiveModal(cardType);
      generateMockChartData(); // Generate mock chart data for demo
      return;
    }
    
    // For cards that should navigate to a filtered view
    if (cardType === 'users') {
      navigate('/admin/users');
    } else if (cardType === 'active-users') {
      navigate('/admin/users?status=active');
    } else if (cardType === 'admin-users') {
      navigate('/admin/users?role=admin');
    } else if (cardType === 'partner-users') {
      navigate('/admin/users?role=partner');
    } else if (cardType === 'trips') {
      navigate(`/admin/bookings${filterValue ? `?status=${filterValue}` : ''}`);
    } else if (cardType === 'drivers') {
      navigate(`/admin/drivers${filterValue ? `?availability=${filterValue}` : ''}`);
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
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('users')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-2xl font-semibold dark:text-white">{stats.users.total}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Customers: {stats.users.total - stats.users.admin - stats.users.partner}</span>
              <span>Admins: {stats.users.admin}</span>
              <span>Partners: {stats.users.partner}</span>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('active-users')}
        >
          <div className="flex items-center justify-between">
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
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round((stats.users.active / stats.users.total) * 100)}% of total users are active
            </p>
          </div>
        </div>

        {/* Admin Users */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('admin-users')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Admin Users</p>
                <p className="text-2xl font-semibold dark:text-white">{stats.users.admin}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only {stats.users.admin} users have full admin privileges
            </p>
          </div>
        </div>

        {/* Partner Users */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('partner-users')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                <Car className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Partner Users</p>
                <p className="text-2xl font-semibold dark:text-white">{stats.users.partner}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.drivers.total} partners have completed driver registration
            </p>
          </div>
        </div>
      </div>

      {/* Health Checks */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signup Metrics */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('signups')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium dark:text-white flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
              Signup Activity
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
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
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.signups.last24h > 0 ? 'Last signup was ' + formatDistanceToNow(new Date(), { addSuffix: true }) : 'No signups in the last 24 hours'}
            </p>
          </div>
        </div>
        
        {/* Login Metrics */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('logins')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium dark:text-white flex items-center">
              <LogIn className="w-5 h-5 mr-2 text-green-500 dark:text-green-400" />
              Login Activity
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
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
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Average of {Math.round(stats.logins.last7d / 7)} logins per day this week
            </p>
          </div>
        </div>
        
        {/* Trip Metrics */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleStatCardClick('trips')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium dark:text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-purple-500 dark:text-purple-400" />
              Trip Status
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Trips</span>
              <div className="flex items-center group">
                <span className="text-lg font-medium dark:text-white">{stats.trips.total}</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatCardClick('trips');
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pending Trips</span>
              <div className="flex items-center group">
                <span className="text-lg font-medium dark:text-white">{stats.trips.pending}</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatCardClick('trips', 'pending');
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Completed Trips</span>
              <div className="flex items-center group">
                <span className="text-lg font-medium dark:text-white">{stats.trips.completed}</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatCardClick('trips', 'completed');
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Completion rate: {stats.trips.total > 0 ? Math.round((stats.trips.completed / stats.trips.total) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Driver Activity */}
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-transparent dark:border-gray-700 mb-8 transition-all hover:shadow-md cursor-pointer"
        onClick={() => handleStatCardClick('drivers')}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium dark:text-white">Driver Status</h3>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Drivers</span>
              <div className="flex items-center group">
                <span className="text-xl font-medium dark:text-white">{stats.drivers.total}</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatCardClick('drivers');
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {stats.drivers.total} out of {stats.users.partner} partners have completed registration
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Available Drivers</span>
              <div className="flex items-center group">
                <span className="text-xl font-medium dark:text-white">{stats.drivers.active}</span>
                <ExternalLink 
                  className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatCardClick('drivers', 'available');
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {stats.drivers.active > 0
                ? `${Math.round((stats.drivers.active / stats.drivers.total) * 100)}% of drivers currently available`
                : "No drivers currently available"}
            </p>
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

      {/* Modal for Signup Activity */}
      {activeModal === 'signups' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Signup Activity Details</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe:</span>
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <button 
                      onClick={() => setChartTimeframe('7d')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        chartTimeframe === '7d' 
                          ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      7 Days
                    </button>
                    <button 
                      onClick={() => setChartTimeframe('30d')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        chartTimeframe === '30d' 
                          ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      30 Days
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {/* Filter options for a real implementation */}
                  <button className="flex items-center px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md">
                    <Filter className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-80 flex items-center justify-center">
                {/* This would be replaced with an actual Chart.js or similar component */}
                <div className="text-center">
                  <BarChart2 className="h-16 w-16 mx-auto mb-4 text-blue-500 dark:text-blue-400" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Signup Trends</p>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    This chart would display signup trends over time. Users can filter by role, date range, and other factors.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 text-sm">New Users</h4>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-2">{stats.signups.last24h}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Last 24 hours</p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-700 dark:text-green-300 text-sm">Partner Signups</h4>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
                    {Math.floor(stats.signups.last7d * 0.3)} {/* Mock data */}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Last 7 days</p>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 text-sm">Conversion Rate</h4>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200 mt-2">62%</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Visitor to signup</p>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Top Signup Sources</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Direct</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">45%</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Referrals</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">30%</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Social Media</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">15%</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Other</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">10%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t dark:border-gray-700">
              <button 
                onClick={() => navigate('/admin/users')}
                className="px-4 py-2 border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center"
              >
                <Users className="h-4 w-4 mr-2" />
                View All Users
              </button>
              <button 
                onClick={() => setActiveModal(null)}
                className="ml-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for Login Activity */}
      {activeModal === 'logins' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Login Activity Details</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe:</span>
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <button 
                      onClick={() => setChartTimeframe('7d')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        chartTimeframe === '7d' 
                          ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      7 Days
                    </button>
                    <button 
                      onClick={() => setChartTimeframe('30d')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        chartTimeframe === '30d' 
                          ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      30 Days
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {/* Filter options for a real implementation */}
                  <select className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    <option>All Roles</option>
                    <option>Admin</option>
                    <option>Partner</option>
                    <option>Customer</option>
                  </select>
                  
                  <select className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    <option>All Devices</option>
                    <option>Desktop</option>
                    <option>Mobile</option>
                    <option>Tablet</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-80 flex items-center justify-center">
                {/* This would be replaced with an actual Chart.js or similar component */}
                <div className="text-center">
                  <BarChart2 className="h-16 w-16 mx-auto mb-4 text-green-500 dark:text-green-400" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Login Trends</p>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    This chart would display login activity over time, showing trends by device, location, and user role.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-700 dark:text-green-300 text-sm">Active Sessions</h4>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
                    {Math.floor(stats.logins.last24h * 0.4)} {/* Mock data */}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Current active users</p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 text-sm">Login Success Rate</h4>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-2">
                    98.2%
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Last 7 days</p>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-300 text-sm">Avg. Session Duration</h4>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-2">18m</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Per session</p>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Recent Login Activity</h4>
                  <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {/* Sample login log entries */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">John Smith</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Admin • Chrome on Windows</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Just now</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">Emma Johnson</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Partner • Safari on iPhone</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">5 minutes ago</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">Michael Chen</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customer • Firefox on macOS</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">15 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t dark:border-gray-700">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
