import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format, startOfWeek, endOfWeek, isSameWeek, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { 
  DollarSign, 
  Calendar,
  Download,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ArrowUpRight,
  Loader2
} from 'lucide-react';

interface Payment {
  id: string;
  trip_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paid_at: string | null;
  created_at: string;
  payment_method: 'cash' | 'credit_card' | 'paypal';
  trip?: {
    datetime: string;
    pickup_zone?: {
      name: string;
    };
    dropoff_zone?: {
      name: string;
    };
  };
}

interface Earnings {
  daily: {
    [key: string]: number;
  };
  weekly: number;
  monthly: number;
  total: number;
  completedTrips: number;
}

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [earnings, setEarnings] = useState<Earnings>({
    daily: {},
    weekly: 0,
    monthly: 0,
    total: 0,
    completedTrips: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const { toast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    if (userData?.id) {
      fetchPayments();
    }
  }, [userData]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Get driver ID
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userData?.id)
        .single();
      
      if (driverError) throw driverError;
      
      if (!driverData?.id) {
        throw new Error('Driver profile not found');
      }

      // Get all completed trips for this driver
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          datetime,
          status,
          estimated_price,
          pickup_zone:zones!trips_pickup_zone_id_fkey(name),
          dropoff_zone:zones!trips_dropoff_zone_id_fkey(name)
        `)
        .eq('driver_id', driverData.id)
        .eq('status', 'completed')
        .order('datetime', { ascending: false });
      
      if (tripsError) throw tripsError;
      
      // Get payments for these trips
      const tripIds = (tripsData || []).map(trip => trip.id);
      
      if (tripIds.length === 0) {
        setPayments([]);
        calculateEarnings([]);
        return;
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });
      
      if (paymentsError) throw paymentsError;
      
      // Combine payment and trip data
      const paymentsWithTrips = (paymentsData || []).map(payment => {
        const trip = tripsData?.find(t => t.id === payment.trip_id);
        return {
          ...payment,
          trip
        };
      });

      setPayments(paymentsWithTrips);
      
      // Calculate earnings from completed trips
      const earningsData = calculateEarnings(tripsData || []);
      setEarnings(earningsData);
      
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch payment history.",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnings = (trips: any[]): Earnings => {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    let weeklyTotal = 0;
    let monthlyTotal = 0;
    let allTimeTotal = 0;
    const dailyEarnings: Record<string, number> = {};
    
    // Only count completed trips
    const completedTrips = trips.filter(trip => trip.status === 'completed');
    
    completedTrips.forEach(trip => {
      const tripDate = parseISO(trip.datetime);
      const dayKey = format(tripDate, 'yyyy-MM-dd');
      
      // Add to daily totals
      if (!dailyEarnings[dayKey]) {
        dailyEarnings[dayKey] = 0;
      }
      dailyEarnings[dayKey] += Number(trip.estimated_price);
      
      // Add to weekly total if in current week
      if (isSameWeek(tripDate, now, { weekStartsOn: 1 })) {
        weeklyTotal += Number(trip.estimated_price);
      }
      
      // Add to monthly total if in current month
      if (isSameMonth(tripDate, now)) {
        monthlyTotal += Number(trip.estimated_price);
      }
      
      // Add to all-time total
      allTimeTotal += Number(trip.estimated_price);
    });
    
    return {
      daily: dailyEarnings,
      weekly: weeklyTotal,
      monthly: monthlyTotal,
      total: allTimeTotal,
      completedTrips: completedTrips.length
    };
  };

  const togglePaymentDetails = (paymentId: string) => {
    if (expandedPayment === paymentId) {
      setExpandedPayment(null);
    } else {
      setExpandedPayment(paymentId);
    }
  };

  const exportEarnings = () => {
    // Format payments data for CSV export
    const csvData = payments.map(payment => {
      return {
        Date: payment.trip?.datetime ? format(new Date(payment.trip.datetime), 'PP') : 'N/A',
        Time: payment.trip?.datetime ? format(new Date(payment.trip.datetime), 'p') : 'N/A',
        Amount: formatCurrency(payment.amount),
        Status: payment.status,
        'Payment Method': payment.payment_method,
        'Payment Date': payment.paid_at ? format(new Date(payment.paid_at), 'PP') : 'N/A',
        'Pickup Location': payment.trip?.pickup_zone?.name || 'N/A',
        'Dropoff Location': payment.trip?.dropoff_zone?.name || 'N/A',
      };
    });

    // Convert to CSV
    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(field => `"${row[field as keyof typeof row]}"`).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    a.click();
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold dark:text-white mb-4 sm:mb-0">Earnings & Payments</h1>
        
        <button
          onClick={exportEarnings}
          disabled={payments.length === 0}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Earnings
        </button>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">This Week</h3>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(earnings.weekly)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Week of {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">This Month</h3>
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(earnings.monthly)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {format(new Date(), 'MMMM yyyy')}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Completed Trips</h3>
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {earnings.completedTrips}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            All-time total
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h2 className="font-medium text-gray-900 dark:text-white">Payment History</h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No payment history yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Your payment history will appear here after you complete trips.
            </p>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {payments.map((payment) => (
              <div key={payment.id}>
                <div 
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => togglePaymentDetails(payment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${
                        payment.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : payment.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {payment.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.trip?.pickup_zone?.name || 'Pickup'} to {payment.trip?.dropoff_zone?.name || 'Dropoff'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.trip?.datetime ? format(new Date(payment.trip.datetime), 'PP') : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="text-right mr-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </div>
                      </div>
                      
                      {expandedPayment === payment.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded payment details */}
                {expandedPayment === payment.id && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                    <div className="text-sm space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Payment ID</p>
                          <p className="font-medium text-gray-900 dark:text-white">{payment.id.slice(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Status</p>
                          <p className={`font-medium capitalize ${
                            payment.status === 'completed' 
                              ? 'text-green-600 dark:text-green-400' 
                              : payment.status === 'pending'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                          }`}>
                            {payment.status}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Payment Method</p>
                          <p className="font-medium text-gray-900 dark:text-white flex items-center">
                            <CreditCard className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                            <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Payment Date</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payment.paid_at ? format(new Date(payment.paid_at), 'PP') : 'Pending'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="border-t dark:border-gray-600 pt-3 mt-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Trip Date & Time</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {payment.trip?.datetime 
                                ? format(new Date(payment.trip.datetime), 'PPp') 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Amount</p>
                            <p className="font-medium text-xl text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t dark:border-gray-600 pt-3 mt-3">
                        <a 
                          href="#" 
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center justify-center"
                        >
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          View Full Trip Details
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;