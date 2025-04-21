import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { 
  Loader2, 
  Search, 
  RefreshCw,
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Eye,
  CheckCheck,
  X,
  Power,
  Download,
  Filter,
  MessageSquare
} from 'lucide-react';
import { format, isAfter } from 'date-fns';

interface Driver {
  id: string;
  user_id: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'declined';
  is_available: boolean;
  created_at: string;
  license_number?: string;
  decline_reason?: string;
  verified_at?: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  documents?: Document[];
  _documentCount?: number;
}

interface Document {
  id: string;
  driver_id: string;
  doc_type: 'license' | 'insurance' | 'registration' | 'other';
  file_url: string;
  name: string;
  uploaded_at: string;
  verified: boolean;
  expiry_date?: string;
}

interface ActivityLog {
  id: string;
  driver_id: string;
  admin_id?: string;
  action: string;
  details: any;
  created_at: string;
  admin?: {
    name: string;
    email: string;
  };
}

const DOCUMENT_TYPES = [
  { value: 'license', label: 'Driver License', required: true },
  { value: 'insurance', label: 'Insurance Certificate', required: true },
  { value: 'registration', label: 'Vehicle Registration', required: true },
  { value: 'other', label: 'Other Document', required: false }
];

const DriverVerification = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unverified' | 'pending' | 'verified' | 'declined'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      fetchActivityLogs(selectedDriver.id);
    }
  }, [selectedDriver]);

  const fetchDrivers = async () => {
    try {
      setRefreshing(true);
      
      // Fetch drivers with their user info
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users!drivers_user_id_fkey(name, email, phone)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // For each driver, get document counts
      const driversWithDocCounts = await Promise.all((driversData || []).map(async (driver: Driver) => {
        const { count, error: countError } = await supabase
          .from('driver_documents')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', driver.id);
          
        return {
          ...driver,
          _documentCount: countError ? 0 : (count || 0)
        };
      }));
      
      setDrivers(driversWithDocCounts || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch drivers. Please try again later."
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActivityLogs = async (driverId: string) => {
    try {
      setLoadingLogs(true);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          admin:users(name, email)
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const viewDriverDocuments = async (driver: Driver) => {
    try {
      setSelectedDriver({...driver, documents: []});
      
      // Fetch documents for the selected driver
      const { data: documents, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driver.id)
        .order('uploaded_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Update selected driver with documents
      setSelectedDriver(prev => prev ? {...prev, documents: documents || []} : null);
    } catch (error) {
      console.error('Error fetching driver documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch driver documents. Please try again later."
      });
    }
  };

  const approveDriver = async (driverId: string) => {
    try {
      setProcessingAction(true);
      
      // Update driver status to verified
      const { error } = await supabase
        .from('drivers')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          decline_reason: null // Clear any previous decline reason
        })
        .eq('id', driverId);
      
      if (error) {
        throw error;
      }
      
      // Update documents to verified
      const { error: docsError } = await supabase
        .from('driver_documents')
        .update({
          verified: true
        })
        .eq('driver_id', driverId);
        
      if (docsError) {
        console.warn('Error updating document verification status:', docsError);
        // Continue anyway since the driver is verified
      }
      
      // Log the approval action
      await supabase.from('activity_logs').insert({
        driver_id: driverId,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'driver_verified',
        details: {
          timestamp: new Date().toISOString(),
          verification_status: 'verified'
        }
      });
      
      // Update local state
      setDrivers(drivers.map(driver => 
        driver.id === driverId 
          ? {...driver, verification_status: 'verified'} 
          : driver
      ));
      
      // Update selected driver if it's the one we just approved
      if (selectedDriver?.id === driverId) {
        setSelectedDriver(prev => prev 
          ? {...prev, verification_status: 'verified'} 
          : null
        );
        
        // Refresh logs
        fetchActivityLogs(driverId);
      }
      
      toast({
        title: "Driver Approved",
        description: "The driver has been verified and can now accept trips.",
        variant: "success"
      });
    } catch (error) {
      console.error('Error approving driver:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve driver. Please try again later."
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDecline = () => {
    if (!selectedDriver) return;
    setShowDeclineModal(true);
  };

  const submitDecline = async () => {
    if (!selectedDriver) return;
    
    try {
      setProcessingAction(true);
      
      // Update driver status to declined
      const { error } = await supabase
        .from('drivers')
        .update({
          verification_status: 'declined',
          decline_reason: declineReason.trim() || 'Your verification was declined. Please contact support.'
        })
        .eq('id', selectedDriver.id);
      
      if (error) {
        throw error;
      }
      
      // If the driver was available, set them to unavailable
      if (selectedDriver.is_available) {
        const { error: availError } = await supabase.rpc('set_driver_availability_admin', {
          driver_id: selectedDriver.id,
          new_status: false,
          note: 'Automatically set unavailable due to declined verification'
        });
        
        if (availError) {
          console.warn('Error setting driver unavailable:', availError);
        }
      }
      
      // Log the decline action
      await supabase.from('activity_logs').insert({
        driver_id: selectedDriver.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'driver_declined',
        details: {
          timestamp: new Date().toISOString(),
          verification_status: 'declined',
          reason: declineReason.trim() || 'No reason provided'
        }
      });
      
      // Update local state
      setDrivers(drivers.map(driver => 
        driver.id === selectedDriver.id 
          ? {
              ...driver, 
              verification_status: 'declined', 
              decline_reason: declineReason,
              is_available: false // Also update availability in local state
            } 
          : driver
      ));
      
      // Update selected driver
      setSelectedDriver(prev => prev 
        ? {
            ...prev, 
            verification_status: 'declined', 
            decline_reason: declineReason,
            is_available: false
          } 
        : null
      );
      
      // Refresh logs
      if (selectedDriver?.id) {
        fetchActivityLogs(selectedDriver.id);
      }
      
      toast({
        title: "Driver Declined",
        description: "The driver's verification request has been declined.",
      });
      
      // Reset and close modal
      setDeclineReason('');
      setShowDeclineModal(false);
    } catch (error) {
      console.error('Error declining driver:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to decline driver. Please try again later."
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const showToggleAvailabilityModal = () => {
    if (!selectedDriver) return;
    setAdminNote('');
    setShowToggleModal(true);
  };

  const toggleDriverAvailability = async () => {
    if (!selectedDriver) return;
    
    try {
      setProcessingAction(true);
      
      // Use the admin function to toggle availability
      const newAvailability = !selectedDriver.is_available;
      
      const { data, error } = await supabase.rpc('set_driver_availability_admin', {
        driver_id: selectedDriver.id,
        new_status: newAvailability,
        note: adminNote || `Admin override: Set to ${newAvailability ? 'available' : 'unavailable'}`
      });
      
      if (error) throw error;
      
      // Update local state
      setDrivers(drivers.map(driver => 
        driver.id === selectedDriver.id 
          ? {...driver, is_available: newAvailability} 
          : driver
      ));
      
      // Update selected driver
      setSelectedDriver(prev => prev 
        ? {...prev, is_available: newAvailability} 
        : null
      );
      
      // Refresh logs
      fetchActivityLogs(selectedDriver.id);
      
      toast({
        title: `Driver is now ${newAvailability ? 'available' : 'unavailable'}`,
        description: `You've manually ${newAvailability ? 'enabled' : 'disabled'} this driver's availability status.`,
        variant: "success"
      });
      
      // Reset and close modal
      setAdminNote('');
      setShowToggleModal(false);
    } catch (error) {
      console.error('Error toggling driver availability:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update driver availability. Please try again later."
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const closeDriverDetails = () => {
    setSelectedDriver(null);
    setDeclineReason('');
    setAdminNote('');
    setActivityLogs([]);
  };

  const getMissingDocumentTypes = (driver: Driver): string[] => {
    if (!driver.documents) return DOCUMENT_TYPES.filter(doc => doc.required).map(doc => doc.value);
    
    const uploadedDocTypes = new Set(driver.documents.map(doc => doc.doc_type));
    return DOCUMENT_TYPES
      .filter(docType => docType.required && !uploadedDocTypes.has(docType.value))
      .map(docType => docType.label);
  };

  const isDocumentExpired = (doc: Document): boolean => {
    if (!doc.expiry_date) return false;
    return isAfter(new Date(), new Date(doc.expiry_date));
  };

  const getDocumentTypeLabel = (type: string): string => {
    const docType = DOCUMENT_TYPES.find(t => t.value === type);
    return docType ? docType.label : type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getVerificationStatusLabel = (status: string): JSX.Element => {
    switch(status) {
      case 'unverified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unverified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Unknown
          </span>
        );
    }
  };

  const getAvailabilityStatusLabel = (isAvailable: boolean): JSX.Element => {
    return isAvailable ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <Power className="w-3 h-3 mr-1" />
        Available
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <Power className="w-3 h-3 mr-1" />
        Unavailable
      </span>
    );
  };

  const formatActivityLog = (log: ActivityLog): JSX.Element => {
    const timestamp = format(new Date(log.created_at), 'PP p');
    
    let actionText = '';
    let iconElement = <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    let textColor = 'text-gray-900 dark:text-gray-100';
    
    switch(log.action) {
      case 'driver_verified':
        actionText = 'Driver verified';
        iconElement = <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
        textColor = 'text-green-700 dark:text-green-300';
        break;
        
      case 'driver_declined':
        actionText = 'Verification declined';
        iconElement = <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
        textColor = 'text-red-700 dark:text-red-300';
        break;
        
      case 'availability_change':
        const newStatus = log.details.new_status === 'available';
        actionText = `Driver set themselves to ${newStatus ? 'available' : 'unavailable'}`;
        iconElement = <Power className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
        textColor = 'text-blue-700 dark:text-blue-300';
        break;
        
      case 'admin_availability_change':
        const adminSetStatus = log.details.new_status === true || log.details.new_status === 'true' || log.details.new_status === 'available';
        actionText = `Admin set driver to ${adminSetStatus ? 'available' : 'unavailable'}`;
        iconElement = <Power className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
        textColor = 'text-purple-700 dark:text-purple-300';
        break;
        
      default:
        actionText = log.action.replace(/_/g, ' ');
    }
    
    return (
      <div className="py-2 flex items-start">
        <div className="mr-3 mt-0.5 flex-shrink-0">
          {iconElement}
        </div>
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{actionText}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</p>
          
          {/* Show admin note if present */}
          {log.action === 'admin_availability_change' && log.details.admin_note && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Note: {log.details.admin_note}
            </p>
          )}
          
          {/* Show admin name if present */}
          {log.admin && log.admin.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              By: {log.admin.name}
            </p>
          )}
          
          {/* Show decline reason if present */}
          {log.action === 'driver_declined' && log.details.reason && (
            <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-md text-xs text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
              Reason: {log.details.reason}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (driver.user?.phone && driver.user.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (driver.license_number && driver.license_number.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'all' || driver.verification_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold dark:text-white">Driver Verification</h2>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[200px]"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified</option>
            <option value="declined">Declined</option>
          </select>
          
          <button
            onClick={fetchDrivers}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 inline-flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Drivers List Panel */}
        <div className={`${selectedDriver ? 'hidden lg:block' : 'col-span-full lg:col-span-1'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
              <h3 className="font-medium text-gray-900 dark:text-white">Drivers</h3>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Filter className="h-3 w-3 mr-1" />
                <span>{filteredDrivers.length} {statusFilter !== 'all' ? statusFilter : ''} driver{filteredDrivers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No drivers found matching your criteria.</p>
                </div>
              ) : (
                filteredDrivers.map(driver => (
                  <div 
                    key={driver.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedDriver?.id === driver.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => viewDriverDocuments(driver)}
                  >
                    <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {driver.user?.name || 'Unknown'}
                      </div>
                      <div className="flex space-x-1">
                        {getVerificationStatusLabel(driver.verification_status)}
                        {driver.verification_status === 'verified' && getAvailabilityStatusLabel(driver.is_available)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {driver.user?.email || 'No email'}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Documents: {driver._documentCount || 0}
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {driver.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Document Preview Panel */}
        {selectedDriver && (
          <div className="col-span-full lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
                <div className="flex items-center">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Driver Documents
                  </h3>
                  <div className="ml-3">
                    {getVerificationStatusLabel(selectedDriver.verification_status)}
                  </div>
                  <div className="ml-2">
                    {getAvailabilityStatusLabel(selectedDriver.is_available)}
                  </div>
                </div>
                
                <button
                  onClick={closeDriverDetails}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Driver Info */}
                <div className="mb-6 p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Driver Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedDriver.user?.name || 'Not provided'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedDriver.user?.email || 'Not provided'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedDriver.user?.phone || 'Not provided'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License Number</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedDriver.license_number || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Document Status */}
                {selectedDriver.documents ? (
                  selectedDriver.documents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDriver.documents.map(doc => (
                        <div 
                          key={doc.id} 
                          className="p-4 border dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                <FileText className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                                {getDocumentTypeLabel(doc.doc_type)}
                                {isDocumentExpired(doc) && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                    Expired
                                  </span>
                                )}
                                {doc.verified && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    Verified
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Uploaded: {format(new Date(doc.uploaded_at), 'PP')}
                              </p>
                              {doc.expiry_date && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  Expires: {format(new Date(doc.expiry_date), 'PP')}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              <a 
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                title="View document"
                              >
                                <Eye className="h-5 w-5" />
                              </a>
                              <a 
                                href={doc.file_url}
                                download
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                title="Download document"
                              >
                                <Download className="h-5 w-5" />
                              </a>
                            </div>
                          </div>
                          
                          <div className="text-xs truncate text-gray-500 dark:text-gray-400">
                            Filename: {doc.name}
                          </div>
                        </div>
                      ))}
                      
                      {/* Missing Documents Warning */}
                      {getMissingDocumentTypes(selectedDriver).length > 0 && (
                        <div className="p-4 border border-yellow-200 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                          <div className="flex items-center text-yellow-700 dark:text-yellow-400">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <h4 className="font-medium">Missing Required Documents</h4>
                          </div>
                          
                          <ul className="mt-2 space-y-1 text-sm text-yellow-600 dark:text-yellow-300 pl-7 list-disc">
                            {getMissingDocumentTypes(selectedDriver).map((docType, idx) => (
                              <li key={idx}>{docType}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-10 w-10 text-yellow-500 dark:text-yellow-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Documents Uploaded
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        This driver has not uploaded any required documents yet.
                        They need to complete their profile before they can be verified.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                
                {/* Decline Reason (if applicable) */}
                {selectedDriver.verification_status === 'declined' && selectedDriver.decline_reason && (
                  <div className="mt-6 p-4 border border-red-200 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <h4 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Decline Reason
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {selectedDriver.decline_reason}
                    </p>
                  </div>
                )}
                
                {/* Activity Logs */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    Recent Activity
                  </h4>
                  
                  {loadingLogs ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : activityLogs.length > 0 ? (
                    <div className="border dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                      {activityLogs.map(log => (
                        <div key={log.id} className="p-3">
                          {formatActivityLog(log)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent activity logs found.
                    </p>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap justify-end gap-3">
                  {/* Toggle availability button (shows for all statuses) */}
                  <button
                    onClick={showToggleAvailabilityModal}
                    disabled={processingAction || selectedDriver.verification_status !== 'verified'}
                    className="px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 inline-flex items-center"
                    title={selectedDriver.verification_status !== 'verified' ? "Driver must be verified to change availability" : ""}
                  >
                    <Power className="h-4 w-4 mr-1.5" />
                    {selectedDriver.is_available ? 'Set Unavailable' : 'Set Available'}
                  </button>
                  
                  {selectedDriver.verification_status === 'pending' && (
                    <>
                      <button
                        onClick={handleDecline}
                        disabled={processingAction || !selectedDriver.documents || selectedDriver.documents.length === 0}
                        className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        <XCircle className="inline-block h-4 w-4 mr-1.5" />
                        Decline
                      </button>
                      
                      <button
                        onClick={() => approveDriver(selectedDriver.id)}
                        disabled={processingAction || !selectedDriver.documents || selectedDriver.documents.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center"
                      >
                        {processingAction ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4 w-4 mr-1.5" />
                        )}
                        Approve Driver
                      </button>
                    </>
                  )}
                  
                  {selectedDriver.verification_status === 'declined' && (
                    <button
                      onClick={() => approveDriver(selectedDriver.id)}
                      disabled={processingAction || !selectedDriver.documents || selectedDriver.documents.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4 mr-1.5" />
                      )}
                      Approve Driver
                    </button>
                  )}
                  
                  {selectedDriver.verification_status === 'verified' && (
                    <button
                      onClick={handleDecline}
                      disabled={processingAction}
                      className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <XCircle className="inline-block h-4 w-4 mr-1.5" />
                      Revoke Verification
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Decline Verification
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Please provide a reason why this driver's verification is being declined. This message will be shown to the driver.
            </p>
            
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for declining (e.g., expired documents, unclear images, etc.)"
            />
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              
              <button
                onClick={submitDecline}
                disabled={processingAction}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center"
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1.5" />
                )}
                Decline Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Availability Modal */}
      {showToggleModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {selectedDriver?.is_available ? 'Disable' : 'Enable'} Driver Availability
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              You are about to manually {selectedDriver?.is_available ? 'disable' : 'enable'} this driver's availability. This will {selectedDriver?.is_available ? 'prevent them from receiving' : 'allow them to receive'} new trip assignments.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Note (Optional)
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note explaining why you're changing this driver's availability status."
                rows={3}
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowToggleModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              
              <button
                onClick={toggleDriverAvailability}
                disabled={processingAction}
                className={`px-4 py-2 ${
                  selectedDriver?.is_available 
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-md inline-flex items-center`}
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Power className="h-4 w-4 mr-1.5" />
                )}
                Set {selectedDriver?.is_available ? 'Unavailable' : 'Available'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverVerification;