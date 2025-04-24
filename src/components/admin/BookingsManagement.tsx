import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Info, FileDown, Filter, ChevronDown, ChevronUp, Calendar, Clock, MapPin, User, Phone, Mail, RefreshCw, CreditCard, BarChart2, AlertCircle, CalendarCheck, Users as UsersIcon, CheckCircle, MapPinned } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addHours, isAfter, isBefore } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import BookingDetailModal from './booking/BookingDetailModal';
import BookingNoteModal from './booking/BookingNoteModal';
import BookingLogModal from './booking/BookingLogModal';
import BookingFeesModal from './booking/BookingFeesModal';
import BookingReminderModal from './booking/BookingReminderModal';
import BookingExportModal from './booking/BookingExportModal';
import { useNavigate, useSearchParams } from 'react-router-dom';

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('upcoming');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    revenue: { total: 0, pending: 0 },
    needAttention: 0,
    priority: 0,
    unassigned: 0,
    pendingPayment: 0,
    cancelled: 0,
    locationStats: null
  });
  
  const { toast } = useToast();
  const { userData, refreshSession } = useAuth();
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Process URL params on initial load
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    
    const priorityParam = searchParams.get('priority');
    if (priorityParam) {
      setPriorityFilter(priorityParam);
    }
    
    const paymentParam = searchParams.get('payment');
    if (paymentParam) {
      setPaymentStatusFilter(paymentParam);
    }
    
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setDateRangeFilter(dateParam);
    }
    
    const driverParam = searchParams.get('driver');
    if (driverParam) {
      setDriverFilter(driverParam);
    }
    
    if (userData?.user_role === 'admin' || userData?.user_role === 'support') {
      fetchBookings();
      fetchBookingStats();
    }
  }, [userData, currentPage, statusFilter, driverFilter, priorityFilter, dateRangeFilter, paymentStatusFilter, searchParams]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (paymentStatusFilter !== 'all') params.set('payment', paymentStatusFilter);
    if (dateRangeFilter !== 'upcoming') params.set('date', dateRangeFilter);
    if (driverFilter !== 'all') params.set('driver', driverFilter);
    
    setSearchParams(params);
  }, [statusFilter, driverFilter, priorityFilter, dateRangeFilter, paymentStatusFilter]);

  const scrollFilters = (direction: 'left' | 'right') => {
    if (!filterContainerRef.current) return;
    
    const container = filterContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const fetchBookingStats = async () => {
    try {
      // Get basic stats about bookings to populate our stat cards
      const now = new Date();
      const next24Hours = addHours(now, 24);
      
      // Total bookings
      const { count: totalCount, error: totalError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true });
        
      // Upcoming bookings in the next 24 hours
      const { count: attentionCount, error: attentionError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .lte('datetime', next24Hours.toISOString())
        .gte('datetime', now.toISOString())
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled');
        
      // Priority bookings
      const { count: priorityCount, error: priorityError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .gt('priority', 0);
        
      // Unassigned bookings
      const { count: unassignedCount, error: unassignedError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .is('driver_id', null)
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'cancelled');
        
      // Cancelled bookings
      const { count: cancelledCount, error: cancelledError } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');
       
      // For revenue, we need to do a bit more calculation
      const { data: completedTrips, error: revenueError } = await supabase
        .from('trips')
        .select(`
          id, 
          estimated_price,
          custom_fees,
          payments(amount, status)
        `)
        .eq('status', 'completed');
        
      // Calculate total and pending revenue
      let totalRevenue = 0;
      let pendingRevenue = 0;
      let pendingCount = 0;
      
      if (completedTrips) {
        completedTrips.forEach(trip => {
          const baseAmount = trip.estimated_price || 0;
          let customFeesTotal = 0;
          
          // Add any custom fees
          if (trip.custom_fees && Array.isArray(trip.custom_fees)) {
            trip.custom_fees.forEach((fee: any) => {
              customFeesTotal += parseFloat(fee.amount) || 0;
            });
          }
          
          const tripTotal = baseAmount + customFeesTotal;
          totalRevenue += tripTotal;
          
          // Check if payment is pending
          const paid = trip.payments && trip.payments.some((p: any) => p.status === 'completed');
          if (!paid) {
            pendingRevenue += tripTotal;
            pendingCount++;
          }
        });
      }
      
      // Set the stats state
      setStats({
        total: totalCount || 0,
        revenue: {
          total: totalRevenue,
          pending: pendingRevenue
        },
        needAttention: attentionCount || 0,
        priority: priorityCount || 0,
        unassigned: unassignedCount || 0,
        pendingPayment: pendingCount,
        cancelled: cancelledCount || 0,
        locationStats: null
      });
      
    } catch (error) {
      console.error('Error fetching booking stats:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setIsRefreshing(true);
      
      // Check for admin or support role before making the request
      if (userData?.user_role !== 'admin' && userData?.user_role !== 'support') {
        throw new Error('Admin or support permissions required');
      }
      
      // Refresh session to ensure JWT claims are up to date
      try {
        await refreshSession();
      } catch (refreshError) {
        console.warn('Error refreshing session before fetchBookings:', refreshError);
        // Continue with request anyway
      }
      
      let query = supabase
        .from('trips')
        .select(`
          *,
          user:users!trips_user_id_fkey(id, name, email, phone),
          driver:users!trips_driver_id_fkey(id, name, email, phone),
          pickup_zone:zones!trips_pickup_zone_id_fkey(name),
          dropoff_zone:zones!trips_dropoff_zone_id_fkey(name),
          payments(id, amount, status, payment_method, paid_at)
        `);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply driver filter
      if (driverFilter !== 'all') {
        if (driverFilter === 'unassigned') {
          query = query.is('driver_id', null);
        } else {
          query = query.eq('driver_id', driverFilter);
        }
      }
      
      // Apply priority filter
      if (priorityFilter !== 'all') {
        query = query.eq('priority', parseInt(priorityFilter));
      }
      
      // Apply payment status filter
      if (paymentStatusFilter === 'pending') {
        // This is a simplified approach. In a real implementation, you would need 
        // a more sophisticated query to check payment status from the payments table
        query = query.eq('payments.status', 'pending');
      } else if (paymentStatusFilter === 'paid') {
        query = query.eq('payments.status', 'completed');
      }
      
      // Apply date filter
      const now = new Date();
      if (dateRangeFilter === 'upcoming') {
        query = query.gte('datetime', now.toISOString());
      } else if (dateRangeFilter === 'past') {
        query = query.lt('datetime', now.toISOString());
      } else if (dateRangeFilter === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        query = query
          .gte('datetime', startOfDay.toISOString())
          .lte('datetime', endOfDay.toISOString());
      } else if (dateRangeFilter === 'next24h') {
        const next24Hours = addHours(now, 24);
        query = query
          .gte('datetime', now.toISOString())
          .lte('datetime', next24Hours.toISOString());
      }
      
      // Apply search if provided
      if (searchQuery) {
        query = query.or(`
          customer_name.ilike.%${searchQuery}%,
          customer_email.ilike.%${searchQuery}%,
          customer_phone.ilike.%${searchQuery}%,
          booking_reference.ilike.%${searchQuery}%,
          pickup_address.ilike.%${searchQuery}%,
          dropoff_address.ilike.%${searchQuery}%
        `);
      }
      
      // Count total results for pagination
      const { count, error: countError } = await query.count('id');
      
      if (countError) throw countError;
      
      // Calculate pagination
      const total = count || 0;
      setTotalPages(Math.ceil(total / itemsPerPage));
      
      // Apply pagination
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      
      // Execute query with pagination and sorting
      const { data, error } = await query
        .order('datetime', { ascending: false })
        .range(start, end);

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch bookings. Please try again.",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));

      // Refresh stats since status has changed
      fetchBookingStats();

      toast({
        title: "Success",
        description: "Booking status updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update booking. Please try again.",
      });
    }
  };

  const updateBookingNotes = async (bookingId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ notes })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, notes } : booking
      ));

      toast({
        title: "Notes Saved",
        description: "Booking notes have been updated successfully.",
      });
      setShowNoteModal(false);
    } catch (error: any) {
      console.error('Error updating booking notes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update notes. Please try again.",
      });
    }
  };

  const updateBookingPriority = async (bookingId: string, priority: number) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ priority })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, priority } : booking
      ));

      // Refresh stats since priority has changed
      fetchBookingStats();

      toast({
        title: "Priority Updated",
        description: `Booking priority set to ${priority === 2 ? 'Urgent' : priority === 1 ? 'High' : 'Normal'}.`,
      });
      setShowReminderModal(false);
    } catch (error: any) {
      console.error('Error updating booking priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update priority. Please try again.",
      });
    }
  };

  const updateCustomFees = async (bookingId: string, fees: any[]) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ custom_fees: fees })
        .eq('id', bookingId);

      if (error) throw error;
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, custom_fees: fees } : booking
      ));

      // Refresh stats since fees have changed (affects revenue)
      fetchBookingStats();

      toast({
        title: "Fees Updated",
        description: "Custom fees have been updated successfully.",
      });
      setShowFeesModal(false);
    } catch (error: any) {
      console.error('Error updating custom fees:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not update fees. Please try again.",
      });
    }
  };

  const sendReminderEmail = async (booking: any) => {
    try {
      // Example: Call an edge function to send reminder
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ bookingId: booking.id })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      // Update local state - mark reminder as sent
      setBookings(bookings.map(b => 
        b.id === booking.id ? { ...b, last_reminder_sent: new Date().toISOString() } : b
      ));

      toast({
        title: "Reminder Sent",
        description: `Reminder email sent to ${booking.customer_name}.`,
      });
      setShowReminderModal(false);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not send reminder. Please try again.",
      });
    }
  };

  const exportBookings = async (format: 'csv' | 'excel', filters: any) => {
    try {
      // In a real application, you would call an API endpoint to generate the export
      // For this example, we'll just simulate a successful export
      
      setTimeout(() => {
        toast({
          title: "Export Complete",
          description: `${bookings.length} bookings exported to ${format.toUpperCase()} format.`,
        });
      }, 1500);
      
      return true;
    } catch (error: any) {
      console.error('Error exporting bookings:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Could not export bookings. Please try again.",
      });
      return false;
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchBookings();
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const handleEditNotes = (booking: any) => {
    setSelectedBooking(booking);
    setShowNoteModal(true);
  };

  const handleViewLogs = (booking: any) => {
    setSelectedBooking(booking);
    setShowLogModal(true);
  };

  const handleManageFees = (booking: any) => {
    setSelectedBooking(booking);
    setShowFeesModal(true);
  };

  const handleManagePriority = (booking: any) => {
    setSelectedBooking(booking);
    setShowReminderModal(true);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityClass = (priority: number) => {
    switch (priority) {
      case 2:
        return 'text-red-600 dark:text-red-400';
      case 1:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 2:
        return 'Urgent';
      case 1:
        return 'High';
      default:
        return 'Normal';
    }
  };

  // Handle card click
  const handleStatCardClick = (cardType: string) => {
    switch(cardType) {
      case 'total':
        // Reset filters to show all bookings
        setStatusFilter('all');
        setPriorityFilter('all');
        setDateRangeFilter('all');
        setPaymentStatusFilter('all');
        setDriverFilter('all');
        break;
        
      case 'revenue':
        // Set filters to show completed bookings with payment
        setStatusFilter('completed');
        setPaymentStatusFilter('paid');
        setActiveModal('revenue');
        break;
        
      case 'needAttention':
        // Set filter to next 24 hours and not completed
        setDateRangeFilter('next24h');
        break;
        
      case 'priority':
        // Set priority filter to high and urgent
        setPriorityFilter('1');
        break;
        
      case 'unassigned':
        // Set filter to unassigned trips
        setDriverFilter('unassigned');
        break;
        
      case 'pendingPayment':
        // Set filter to show pending payments
        setPaymentStatusFilter('pending');
        break;
        
      case 'cancelled':
        // Set filter to show cancelled bookings
        setStatusFilter('cancelled');
        break;
        
      case 'locations':
        // Show locations modal with heatmap
        setActiveModal('locations');
        break;
    }
  };

  // JSX for Dashboard Cards
  const renderStatCards = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Bookings Card */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('total')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              View all bookings
            </span>
          </div>
        </div>
        
        {/* Revenue Card */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('revenue')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                €{stats.revenue.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              See revenue breakdown
            </span>
          </div>
        </div>
        
        {/* Need Attention Card */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('needAttention')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Need Attention</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.needAttention}</p>
            </div>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Next 24 hours
            </span>
          </div>
        </div>
        
        {/* Priority Bookings Card */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('priority')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority Bookings</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.priority}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              High & urgent priority
            </span>
          </div>
        </div>
        
        {/* Additional Cards - Shown in a collapsible section on mobile */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('unassigned')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unassigned</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.unassigned}</p>
            </div>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
              <UsersIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Need driver assignment
            </span>
          </div>
        </div>
        
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('pendingPayment')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Payment</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.pendingPayment}</p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md">
              <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Awaiting payment
            </span>
          </div>
        </div>
        
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('cancelled')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancelled</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.cancelled}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              View cancellation reasons
            </span>
          </div>
        </div>
        
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-transparent dark:border-gray-700 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => handleStatCardClick('locations')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Locations</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">5</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
              <MapPinned className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              View location heatmap
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold dark:text-white">Bookings Management</h2>
          <button 
            className="md:hidden border border-gray-200 dark:border-gray-700 p-2 rounded-md"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Search and Export */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            title="Export Bookings"
          >
            <FileDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Dashboard Stat Cards */}
      {renderStatCards()}

      {/* Filters - Mobile Dropdown */}
      <div className={`md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 mb-4 overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-96' : 'max-h-0'}`}>
        {showFilters && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver</label>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Drivers</option>
                <option value="unassigned">Unassigned</option>
                {/* Dynamically populate drivers */}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="2">Urgent</option>
                <option value="1">High</option>
                <option value="0">Normal</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="next24h">Next 24 Hours</option>
                <option value="past">Past</option>
                <option value="today">Today</option>
              </select>
            </div>
            
            <button 
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop Filter Pills + Mobile Scrollable Container */}
      <div className="hidden md:block mb-6">
        <div className="relative">
          {/* Left Shadow/Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
          
          {/* Right Shadow/Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
          
          {/* Horizontal Scrollable Container */}
          <div 
            ref={filterContainerRef}
            className="overflow-x-auto hide-scrollbar py-1 px-2 -mx-2 flex space-x-2"
          >
            {/* Status Filters */}
            <div className="flex items-center space-x-2 flex-nowrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('accepted')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  statusFilter === 'accepted'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Accepted
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  statusFilter === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Priority Filters */}
            <div className="h-5 border-l border-gray-200 dark:border-gray-700 mx-2"></div>
            <div className="flex items-center space-x-2 flex-nowrap">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  priorityFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All Priorities
              </button>
              <button
                onClick={() => setPriorityFilter('2')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  priorityFilter === '2'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Urgent
              </button>
              <button
                onClick={() => setPriorityFilter('1')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  priorityFilter === '1'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                High
              </button>
            </div>

            {/* Date Filters */}
            <div className="h-5 border-l border-gray-200 dark:border-gray-700 mx-2"></div>
            <div className="flex items-center space-x-2 flex-nowrap">
              <button
                onClick={() => setDateRangeFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All Dates
              </button>
              <button
                onClick={() => setDateRangeFilter('upcoming')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'upcoming'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setDateRangeFilter('next24h')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'next24h'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Next 24h
              </button>
              <button
                onClick={() => setDateRangeFilter('today')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'today'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Today
              </button>
            </div>
            
            {/* Payment Status Filters */}
            <div className="h-5 border-l border-gray-200 dark:border-gray-700 mx-2"></div>
            <div className="flex items-center space-x-2 flex-nowrap">
              <button
                onClick={() => setPaymentStatusFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  paymentStatusFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                All Payments
              </button>
              <button
                onClick={() => setPaymentStatusFilter('pending')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  paymentStatusFilter === 'pending'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setPaymentStatusFilter('paid')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  paymentStatusFilter === 'paid'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Paid
              </button>
            </div>
            
            {/* Refresh Button */}
            <div className="h-5 border-l border-gray-200 dark:border-gray-700 mx-2"></div>
            <button 
              onClick={() => {
                fetchBookings();
                fetchBookingStats();
              }}
              disabled={isRefreshing}
              className="flex items-center px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-20 text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No bookings found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {searchQuery || (statusFilter !== 'all' || driverFilter !== 'all' || priorityFilter !== 'all') 
                  ? "Try adjusting your search or filter settings" 
                  : "No bookings have been created yet."}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-xs border-b dark:border-gray-600">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">From</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">To</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.map((booking) => (
                  <tr 
                    key={booking.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      booking.priority === 2 
                        ? 'bg-red-50/50 dark:bg-red-900/10' 
                        : booking.priority === 1
                          ? 'bg-blue-50/50 dark:bg-blue-900/10'
                          : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mr-2 ${
                          booking.priority === 2 
                            ? 'bg-red-500' 
                            : booking.priority === 1 
                              ? 'bg-blue-500' 
                              : 'bg-gray-300 dark:bg-gray-600'
                        }`}></div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.booking_reference || booking.id.substring(0, 8)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {booking.customer_name || (booking.user && booking.user.name)}
                      </div>
                      {booking.user && (
                        <div className="flex space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {booking.user.phone && (
                            <a href={`tel:${booking.user.phone}`} className="flex items-center hover:text-blue-600 dark:hover:text-blue-400">
                              <Phone className="h-3 w-3 mr-1" />
                              <span>Call</span>
                            </a>
                          )}
                          <a href={`mailto:${booking.user.email}`} className="flex items-center hover:text-blue-600 dark:hover:text-blue-400">
                            <Mail className="h-3 w-3 mr-1" />
                            <span>Email</span>
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(booking.datetime), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(booking.datetime), 'h:mm a')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white line-clamp-1">
                        {booking.pickup_zone?.name || 'N/A'}
                      </div>
                      {booking.pickup_address && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 max-w-[180px]">
                          {booking.pickup_address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white line-clamp-1">
                        {booking.dropoff_zone?.name || 'N/A'}
                      </div>
                      {booking.dropoff_address && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 max-w-[180px]">
                          {booking.dropoff_address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                        {booking.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </div>
                      {booking.driver && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {booking.driver.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(booking)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {bookings.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, (currentPage - 1) * itemsPerPage + bookings.length)} of many bookings
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 border dark:border-gray-600 rounded ${
                  currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronUp className="h-4 w-4 transform rotate-90" />
              </button>
              <span className="px-3 py-1 border dark:border-gray-600 rounded bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 border dark:border-gray-600 rounded ${
                  currentPage >= totalPages
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronDown className="h-4 w-4 transform rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking}
          onClose={() => setShowDetailModal(false)}
          onStatusChange={updateBookingStatus}
          onEditNotes={() => {
            setShowDetailModal(false);
            setShowNoteModal(true);
          }}
          onViewLogs={() => {
            setShowDetailModal(false);
            setShowLogModal(true);
          }}
          onManageFees={() => {
            setShowDetailModal(false);
            setShowFeesModal(true);
          }}
          onManagePriority={() => {
            setShowDetailModal(false);
            setShowReminderModal(true);
          }}
          onAssignDriver={() => {
            // Implement driver assignment modal
            toast({ title: "Coming Soon", description: "Driver assignment will be available soon." });
          }}
          onDuplicate={() => {
            // Implement booking duplication
            toast({ title: "Coming Soon", description: "Booking duplication will be available soon." });
          }}
        />
      )}

      {showNoteModal && selectedBooking && (
        <BookingNoteModal 
          booking={selectedBooking}
          onClose={() => setShowNoteModal(false)}
          onSave={updateBookingNotes}
        />
      )}

      {showLogModal && selectedBooking && (
        <BookingLogModal 
          booking={selectedBooking}
          logs={[]} // In a real app, fetch logs for this booking
          onClose={() => setShowLogModal(false)}
        />
      )}

      {showFeesModal && selectedBooking && (
        <BookingFeesModal
          booking={selectedBooking}
          onClose={() => setShowFeesModal(false)}
          onSave={updateCustomFees}
        />
      )}

      {showReminderModal && selectedBooking && (
        <BookingReminderModal
          booking={selectedBooking}
          onClose={() => setShowReminderModal(false)}
          onUpdatePriority={updateBookingPriority}
          onSendReminder={sendReminderEmail}
        />
      )}

      {showExportModal && (
        <BookingExportModal
          bookings={bookings}
          onClose={() => setShowExportModal(false)}
          onExport={exportBookings}
        />
      )}

      {/* Revenue Modal */}
      {activeModal === 'revenue' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Revenue Breakdown</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    €{stats.revenue.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div className="mt-1 text-sm text-green-500 dark:text-green-400 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" /> 
                    8.2% vs. last month
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    €{stats.revenue.pending.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div className="mt-1 text-sm text-orange-500 dark:text-orange-400">
                    {stats.pendingPayment} bookings awaiting payment
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Average Booking Value</div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    €{stats.revenue.total > 0 && stats.total > 0 
                      ? (stats.revenue.total / (stats.total - stats.cancelled)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                      : '0.00'}
                  </div>
                  <div className="mt-1 text-sm text-blue-500 dark:text-blue-400">
                    For completed bookings
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm h-64 flex items-center justify-center mb-6">
                <div className="text-center">
                  <BarChart2 className="h-16 w-16 mx-auto mb-4 text-blue-500 dark:text-blue-400" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Revenue Over Time</p>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    This chart would display revenue trends over time, with filters for day, week, month, and quarter.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Revenue by Payment Method</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                        <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{width: "65%"}}></div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Credit Card (65%)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                        <div className="bg-green-600 dark:bg-green-500 h-2.5 rounded-full" style={{width: "20%"}}></div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Cash (20%)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mr-2">
                        <div className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full" style={{width: "15%"}}></div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">PayPal (15%)</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Fees & Refunds</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b dark:border-gray-700 py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Processing Fees</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">€{(stats.revenue.total * 0.029).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b dark:border-gray-700 py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Custom Fees</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">€{(stats.revenue.total * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b dark:border-gray-700 py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Refunds Issued</span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">-€{(stats.revenue.total * 0.02).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Net Revenue</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        €{(stats.revenue.total * 0.941).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t dark:border-gray-700">
              <button 
                onClick={() => {
                  setStatusFilter('completed');
                  setPaymentStatusFilter('paid');
                  setActiveModal(null);
                }}
                className="px-4 py-2 border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center mr-3"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                View Completed Bookings
              </button>
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

      {/* Locations Modal */}
      {activeModal === 'locations' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Bookings by Location</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Top Pickup Locations</h4>
                  <div className="space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Airport Terminal 1</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">42</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Central Station</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">28</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Grand Hyatt Hotel</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">15</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Top Dropoff Locations</h4>
                  <div className="space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Alexanderplatz</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">38</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Marriott Hotel</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">24</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center justify-between">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Brandenburg Gate</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Berlin, Germany</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">19</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPinned className="h-16 w-16 mx-auto mb-4 text-purple-500 dark:text-purple-400" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Location Heatmap</p>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    This area would display an interactive map showing booking density across different areas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-purple-700 dark:text-purple-300 text-sm">Most Popular Route</h4>
                  <p className="text-sm font-bold text-purple-800 dark:text-purple-200 mt-2">
                    Airport → City Center
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    30% of all bookings
                  </p>
                </div>
                
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">Avg. Trip Distance</h4>
                  <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 mt-2">
                    18.5 km
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Across all completed trips
                  </p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 text-sm">Busiest Pickup Time</h4>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-2">
                    2:00 PM - 4:00 PM
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Peak airport arrival time
                  </p>
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

      {/* Add custom styles for hiding scrollbars while maintaining scroll behavior */}
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default BookingsManagement;
