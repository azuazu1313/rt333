import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format, isToday, parseISO, addDays } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  User, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  PhoneCall,
  MessageSquare,
  Loader2,
  Timer,
  AlertTriangle
} from 'lucide-react';
import IncidentReportForm from './IncidentReportForm';

interface Trip {
  id: string;
  datetime: string;
  user_id: string;
  driver_id: string;
  pickup_zone_id: string;
  dropoff_zone_id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  is_scheduled: boolean;
  scheduled_for: string | null;
  estimated_distance_km: number | null;
  estimated_duration_min: number | null;
  estimated_price: number | null;
  pickup_address?: string;
  dropoff_address?: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
  pickup_zone?: {
    name: string;
  };
  dropoff_zone?: {
    name: string;
  };
  driver_acknowledged: boolean;
}

const TodayJobs = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [startingTrip, setStartingTrip] = useState<string | null>(null);
  const [completingTrip, setCompletingTrip] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showReportForm, setShowReportForm] = useState<boolean>(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const { toast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    fetchTrips();

    // Set up a real-time subscription for new or updated trips
    const tripsSubscription = supabase
      .channel('partner-trips-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `driver_id=eq.${userData?.id}`
      }, () => {
        fetchTrips();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tripsSubscription);
    };
  }, [userData]);

  const fetchTrips = async () => {
    try {
      setRefreshing(true);
      // Get driver ID from the drivers table
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userData?.id)
        .single();

      if (driverError || !driverData) {
        console.error('Error fetching driver data:', driverError);
        throw new Error('Could not fetch your driver profile');
      }

      // Fetch trips for the next 2 days
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(23, 59, 59);

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          user:users!trips_user_id_fkey(name, email, phone),
          pickup_zone:zones!trips_pickup_zone_id_fkey(name),
          dropoff_zone:zones!trips_dropoff_zone_id_fkey(name)
        `)
        .eq('driver_id', driverData.id)
        .or(`status.eq.pending,status.eq.accepted,status.eq.in_progress,status.eq.completed,status.eq.cancelled`)
        .lte('datetime', tomorrow.toISOString())
        .order('datetime', { ascending: true });

      if (error) throw error;

      setTrips(data || []);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch your scheduled trips.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acknowledgeTrip = async (tripId: string) => {
    try {
      setAcknowledging(tripId);
      
      // Update the trip to mark it as acknowledged by the driver
      const { error } = await supabase
        .from('trips')
        .update({ driver_acknowledged: true })
        .eq('id', tripId);

      if (error) throw error;

      // Update local state
      setTrips(trips.map(trip => 
        trip.id === tripId ? { ...trip, driver_acknowledged: true } : trip
      ));

      toast({
        title: "Trip Acknowledged",
        description: "You've confirmed this trip assignment.",
      });
    } catch (error: any) {
      console.error('Error acknowledging trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to acknowledge trip.",
      });
    } finally {
      setAcknowledging(null);
    }
  };

  const startTrip = async (tripId: string) => {
    try {
      setStartingTrip(tripId);
      
      // Update trip status to in_progress
      const { error } = await supabase
        .from('trips')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;

      // Update local state
      setTrips(trips.map(trip => 
        trip.id === tripId ? { ...trip, status: 'in_progress' } : trip
      ));

      toast({
        title: "Trip Started",
        description: "You've started this trip. Safe travels!",
      });
    } catch (error: any) {
      console.error('Error starting trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start trip.",
      });
    } finally {
      setStartingTrip(null);
    }
  };

  const completeTrip = async (tripId: string) => {
    try {
      setCompletingTrip(tripId);
      
      // Update trip status to completed
      const { error } = await supabase
        .from('trips')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;

      // Update local state
      setTrips(trips.map(trip => 
        trip.id === tripId ? { ...trip, status: 'completed' } : trip
      ));

      toast({
        title: "Trip Completed",
        description: "Great job! The trip has been marked as completed.",
      });
    } catch (error: any) {
      console.error('Error completing trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete trip.",
      });
    } finally {
      setCompletingTrip(null);
    }
  };

  const handleReportIncident = (tripId: string) => {
    setSelectedTripId(tripId);
    setShowReportForm(true);
  };

  const filteredTrips = trips.filter(trip => {
    switch (filter) {
      case 'upcoming':
        return ['pending', 'accepted'].includes(trip.status);
      case 'completed':
        return trip.status === 'completed';
      case 'cancelled':
        return trip.status === 'cancelled';
      default:
        return true;
    }
  });

  // Group trips by date
  const tripsByDate: Record<string, Trip[]> = {};
  filteredTrips.forEach(trip => {
    const date = new Date(trip.datetime).toDateString();
    if (!tripsByDate[date]) {
      tripsByDate[date] = [];
    }
    tripsByDate[date].push(trip);
  });

  const getTripStatusClass = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading your trips...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold dark:text-white mb-4 sm:mb-0">Today's Jobs</h1>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Filters */}
          <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-sm font-medium ${filter === 'all' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-2 text-sm font-medium ${filter === 'upcoming' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-2 text-sm font-medium ${filter === 'completed' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-3 py-2 text-sm font-medium ${filter === 'cancelled' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Cancelled
            </button>
          </div>
          
          {/* Refresh button */}
          <button 
            onClick={fetchTrips}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {Object.keys(tripsByDate).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border dark:border-gray-700">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No trips found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? "You don't have any scheduled trips for now." 
              : `No ${filter} trips found for the selected filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(tripsByDate).map(date => (
            <div key={date} className="space-y-4">
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-medium dark:text-white">
                  {isToday(new Date(date)) ? 'Today' : format(new Date(date), 'EEEE, MMMM d')}
                </h2>
              </div>
              
              <div className="space-y-4">
                {tripsByDate[date].map(trip => (
                  <div 
                    key={trip.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700"
                  >
                    {/* Trip header with time and status */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                          <span className="font-medium">{format(parseISO(trip.datetime), 'h:mm a')}</span>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTripStatusClass(trip.status)}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1).replace('_', ' ')}
                        </span>

                        {!trip.driver_acknowledged && trip.status === 'pending' && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            New Assignment
                          </span>
                        )}
                      </div>
                      
                      <div>
                        {trip.estimated_duration_min && (
                          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            <Timer className="h-4 w-4 mr-1" />
                            <span>{Math.round(trip.estimated_duration_min)} min</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trip details */}
                    <div className="px-6 py-4">
                      {/* Passenger info */}
                      <div className="flex items-start mb-4">
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {trip.user?.name || 'Customer'}
                          </p>
                          {trip.user?.phone && (
                            <div className="flex mt-1 space-x-2">
                              <a 
                                href={`tel:${trip.user.phone}`}
                                className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <PhoneCall className="h-3 w-3 mr-1" />
                                Call
                              </a>
                              <a 
                                href={`sms:${trip.user.phone}`}
                                className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Text
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pickup & dropoff locations */}
                      <div className="space-y-3">
                        {/* Pickup location */}
                        <div className="flex items-start">
                          <div className="mr-3 flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400"></span>
                            </div>
                            {trip.pickup_zone && trip.dropoff_zone && (
                              <div className="w-0.5 h-10 bg-gray-200 dark:bg-gray-700 my-1"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pickup</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {trip.pickup_zone?.name || 'Unknown location'}
                            </p>
                            {trip.pickup_address && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs">
                                {trip.pickup_address}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dropoff location */}
                        {(trip.dropoff_zone || trip.dropoff_address) && (
                          <div className="flex items-start">
                            <div className="mr-3 flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400"></span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Drop-off</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {trip.dropoff_zone?.name || 'Unknown location'}
                              </p>
                              {trip.dropoff_address && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs">
                                  {trip.dropoff_address}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex space-x-2">
                        {trip.status === 'accepted' && (
                          <button
                            onClick={() => startTrip(trip.id)}
                            disabled={!!startingTrip}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center text-sm font-medium"
                          >
                            {startingTrip === trip.id ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Start Trip
                              </>
                            )}
                          </button>
                        )}
                        
                        {trip.status === 'in_progress' && (
                          <button
                            onClick={() => completeTrip(trip.id)}
                            disabled={!!completingTrip}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white py-2 px-4 rounded-md flex items-center text-sm font-medium"
                          >
                            {completingTrip === trip.id ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                Completing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete Trip
                              </>
                            )}
                          </button>
                        )}

                        {/* Acknowledge new assignment button */}
                        {trip.status === 'pending' && !trip.driver_acknowledged && (
                          <button
                            onClick={() => acknowledgeTrip(trip.id)}
                            disabled={!!acknowledging}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center text-sm font-medium"
                          >
                            {acknowledging === trip.id ? (
                              <>
                                <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Acknowledge
                              </>
                            )}
                          </button>
                        )}

                        {/* Report Incident button - only show for in-progress, completed, or cancelled trips */}
                        {(trip.status === 'in_progress' || trip.status === 'completed') && (
                          <button
                            onClick={() => handleReportIncident(trip.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-white py-2 px-4 rounded-md flex items-center text-sm font-medium"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Report Incident
                          </button>
                        )}
                      </div>

                      <a
                        href={`https://maps.google.com/maps?q=${encodeURIComponent(trip.pickup_zone?.name || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Directions
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incident Report Form Modal */}
      {showReportForm && (
        <IncidentReportForm 
          tripId={selectedTripId}
          onClose={() => {
            setShowReportForm(false);
            setSelectedTripId(null);
          }}
          onSuccess={() => {
            // Optional callback if you want to refresh data after report is submitted
            fetchTrips();
          }}
        />
      )}
    </div>
  );
};

export default TodayJobs;