import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Info, Filter, X, User, Car, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Driver {
  id: string;
  user_id: string;
  is_available: boolean;
  license_number?: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
}

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [driverAvailabilityFilter, setDriverAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'
  const [assigningDriver, setAssigningDriver] = useState(false);
  const { toast } = useToast();
  const { userData } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userData?.user_role === 'admin') {
      fetchBookings();
    }
  }, [userData]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Check for admin role before making the request
      if (userData?.user_role !== 'admin') {
        throw new Error('Admin permissions required');
      }
      
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          user:users!trips_user_id_fkey(name, email),
          driver:users!trips_driver_id_fkey(name, email, phone)
        `)
        .order('datetime', { ascending: false });

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
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users!drivers_user_id_fkey(name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch drivers. Please try again.",
      });
    } finally {
      setLoadingDrivers(false);
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

  const assignDriver = async (driverId: string) => {
    if (!selectedTripId) return;
    
    try {
      setAssigningDriver(true);
      
      // Get the driver's user ID
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverId)
        .single();
        
      if (driverError) throw driverError;
      
      if (!driverData?.user_id) {
        throw new Error('Could not find driver user ID');
      }
      
      // Update the trip with the driver's user ID only
      // Do NOT automatically set status to 'accepted' - this should be done by the driver/partner
      const { error } = await supabase
        .from('trips')
        .update({ 
          driver_id: driverData.user_id
          // Removed status: 'accepted' as per business requirements
        })
        .eq('id', selectedTripId);

      if (error) throw error;
      
      // Fetch updated booking data
      await fetchBookings();
      
      toast({
        title: "Success",
        description: "Driver assigned successfully. The driver will need to accept the trip.",
        variant: "success"
      });
      
      // Close the modal
      setShowAssignModal(false);
      setSelectedTripId(null);
      setSelectedTrip(null);
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not assign driver. Please try again.",
      });
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleOpenAssignModal = (trip: any) => {
    setSelectedTripId(trip.id);
    setSelectedTrip(trip);
    fetchDrivers();
    setShowAssignModal(true);
  };

  const handleCloseModal = () => {
    setShowAssignModal(false);
    setSelectedTripId(null);
    setSelectedTrip(null);
    setDriverSearchQuery('');
    setDriverAvailabilityFilter('all');
  };

  // Handle clicks outside the modal to close it
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    };

    if (showAssignModal) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAssignModal]);

  // Filter bookings based on search, status, and driver filters
  const filteredBookings = bookings.filter(booking => {
    // Search query filter
    const matchesSearch = (
      booking.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.booking_reference && booking.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    // Driver filter
    const matchesDriver = 
      driverFilter === 'all' || 
      (driverFilter === 'assigned' && booking.driver_id) || 
      (driverFilter === 'unassigned' && !booking.driver_id);
    
    return matchesSearch && matchesStatus && matchesDriver;
  });

  // Filter drivers based on search and availability
  const filteredDrivers = drivers.filter(driver => {
    // Search query filter
    const matchesSearch = (
      driver.user?.name?.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
      driver.user?.email?.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
      (driver.user?.phone && driver.user.phone.toLowerCase().includes(driverSearchQuery.toLowerCase())) ||
      (driver.license_number && driver.license_number.toLowerCase().includes(driverSearchQuery.toLowerCase()))
    );
    
    // Availability filter
    const matchesAvailability = 
      driverAvailabilityFilter === 'all' || 
      (driverAvailabilityFilter === 'available' && driver.is_available) || 
      (driverAvailabilityFilter === 'unavailable' && !driver.is_available);
    
    return matchesSearch && matchesAvailability;
  });

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
        <h2 className="text-xl font-semibold dark:text-white">Bookings Management</h2>
        <div className="flex flex-wrap gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[200px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          {/* Driver filter */}
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[120px]"
          >
            <option value="all">All Drivers</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
          
          {/* Refresh button */}
          <button
            onClick={fetchBookings}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Booking Ref</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {booking.booking_reference || `REF-${booking.id.substring(0, 8)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{booking.user?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.driver ? (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.driver.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{booking.driver.email}</div>
                        </>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Not assigned</span>
                          <button 
                            onClick={() => handleOpenAssignModal(booking)}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(booking.datetime), 'PPP')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(booking.datetime), 'p')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={booking.status}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                        className="text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleOpenAssignModal(booking)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title={booking.driver ? "Change Driver" : "Assign Driver"}
                        >
                          <User className="w-5 h-5" />
                        </button>
                        <button
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No bookings found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver assignment modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedTrip?.driver ? 'Change Driver' : 'Assign Driver'} for Booking: {selectedTrip?.booking_reference || `REF-${selectedTrip?.id.substring(0, 8)}`}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Trip details summary */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Customer:</p>
                    <p className="font-medium dark:text-white">{selectedTrip?.user?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time:</p>
                    <p className="font-medium dark:text-white">
                      {selectedTrip ? format(new Date(selectedTrip.datetime), 'PPp') : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pickup:</p>
                    <p className="font-medium dark:text-white">{selectedTrip?.pickup_address || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dropoff:</p>
                    <p className="font-medium dark:text-white">{selectedTrip?.dropoff_address || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Driver search and filters */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search drivers..."
                    value={driverSearchQuery}
                    onChange={(e) => setDriverSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {driverSearchQuery && (
                    <button
                      onClick={() => setDriverSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <select
                  value={driverAvailabilityFilter}
                  onChange={(e) => setDriverAvailabilityFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[150px]"
                >
                  <option value="all">All Drivers</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              {/* Drivers list */}
              <div className="max-h-96 overflow-y-auto border dark:border-gray-700 rounded-lg">
                {loadingDrivers ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                ) : filteredDrivers.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Driver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredDrivers.map((driver) => (
                        <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <Car className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.user?.name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {driver.id.substring(0, 8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{driver.user?.email || 'No email'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{driver.user?.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              driver.is_available
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {driver.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => assignDriver(driver.id)}
                              disabled={assigningDriver}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
                            >
                              {assigningDriver ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Assign'
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No drivers found matching your filters.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 flex justify-between">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-1">Showing</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{filteredDrivers.length}</span>
                <span className="mx-1">of</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{drivers.length}</span>
                <span className="ml-1">drivers</span>
              </div>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsManagement;