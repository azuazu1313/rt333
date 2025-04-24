import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Info, FileDown, Filter, ChevronDown, ChevronUp, Calendar, Clock, MapPin, User, Phone, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import BookingDetailModal from './booking/BookingDetailModal';
import BookingNoteModal from './booking/BookingNoteModal';
import BookingLogModal from './booking/BookingLogModal';
import BookingFeesModal from './booking/BookingFeesModal';
import BookingReminderModal from './booking/BookingReminderModal';
import BookingExportModal from './booking/BookingExportModal';

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('upcoming');
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
  const { toast } = useToast();
  const { userData, refreshSession } = useAuth();
  const filterContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userData?.user_role === 'admin' || userData?.user_role === 'support') {
      fetchBookings();
    }
  }, [userData, currentPage, statusFilter, driverFilter, priorityFilter, dateRangeFilter]);

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

  if (loading) {
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
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
                onClick={() => setDateRangeFilter('today')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'today'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRangeFilter('past')}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                  dateRangeFilter === 'past'
                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Past
              </button>
            </div>
            
            {/* Refresh Button */}
            <div className="h-5 border-l border-gray-200 dark:border-gray-700 mx-2"></div>
            <button 
              onClick={fetchBookings}
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
