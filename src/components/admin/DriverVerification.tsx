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
  MessageSquare,
  Send
} from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface Driver {
  id: string;
  user_id: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'declined';
  is_available: boolean;
  created_at: string;
  license_number?: string;
  decline_reason?: string;
  verified_at?: string;
  _isPartnerWithoutProfile?: boolean;
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const { toast } = useToast();
  const { userData, refreshSession, session } = useAuth();

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
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, use mock data to bypass the edge function call
        console.log('Development environment detected, using mock data');
        
        // Create some mock drivers data
        const mockDrivers: Driver[] = [
          {
            id: "1",
            user_id: "user1",
            verification_status: 'verified',
            is_available: true,
            created_at: new Date().toISOString(),
            license_number: "DL12345",
            user: {
              name: "John Driver",
              email: "john@example.com",
              phone: "+1234567890"
            },
            _documentCount: 3
          },
          {
            id: "2",
            user_id: "user2",
            verification_status: 'pending',
            is_available: false,
            created_at: new Date().toISOString(),
            user: {
              name: "Jane Smith",
              email: "jane@example.com",
              phone: "+0987654321"
            },
            _documentCount: 2
          },
          {
            id: "pending_user3",
            user_id: "user3",
            verification_status: 'unverified',
            is_available: false,
            created_at: new Date().toISOString(),
            _isPartnerWithoutProfile: true,
            user: {
              name: "Bob Partner",
              email: "bob@example.com",
              phone: null
            },
            _documentCount: 0
          }
        ];
        
        setDrivers(mockDrivers);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-fetch-drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch drivers');
      }

      const driversData = await response.json();
      
      setDrivers(driversData || []);
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
      
      // Skip for partners without driver profiles
      if (driverId.startsWith('pending_')) {
        setActivityLogs([]);
        setLoadingLogs(false);
        return;
      }
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, use mock data to bypass the edge function call
        console.log('Development environment detected, using mock activity logs');
        
        // Create some mock activity logs
        const mockLogs: ActivityLog[] = [
          {
            id: "log1",
            driver_id: driverId,
            admin_id: "admin1",
            action: "driver_verified",
            details: {},
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            admin: {
              name: "Admin User",
              email: "admin@example.com"
            }
          },
          {
            id: "log2",
            driver_id: driverId,
            action: "availability_change",
            details: { new_status: "available" },
            created_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
          }
        ];
        
        setActivityLogs(mockLogs);
        setLoadingLogs(false);
        return;
      }
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }

      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-fetch-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ driverId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch activity logs');
      }

      const logsData = await response.json();
      setActivityLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const viewDriverDocuments = async (driver: Driver) => {
    try {
      setSelectedDriver({...driver, documents: []});
      
      // For partners without profiles, we don't need to fetch documents
      if (driver._isPartnerWithoutProfile) {
        setSelectedDriver({...driver, documents: []});
        return;
      }
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, use mock data to bypass the edge function call
        console.log('Development environment detected, using mock documents');
        
        // Create some mock documents based on the driver
        const mockDocuments: Document[] = [];
        
        if (driver.verification_status === 'verified' || driver.verification_status === 'pending') {
          mockDocuments.push(
            {
              id: `doc1_${driver.id}`,
              driver_id: driver.id,
              doc_type: 'license',
              file_url: 'https://example.com/license.pdf',
              name: 'drivers_license.pdf',
              uploaded_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
              verified: driver.verification_status === 'verified',
              expiry_date: new Date(Date.now() + 31536000000).toISOString() // 1 year in future
            },
            {
              id: `doc2_${driver.id}`,
              driver_id: driver.id,
              doc_type: 'insurance',
              file_url: 'https://example.com/insurance.pdf',
              name: 'insurance_certificate.pdf',
              uploaded_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
              verified: driver.verification_status === 'verified',
              expiry_date: new Date(Date.now() + 15768000000).toISOString() // 6 months in future
            }
          );
        }
        
        // Update selected driver with mock documents
        setSelectedDriver(prev => prev ? {...prev, documents: mockDocuments} : null);
        return;
      }
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }

      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-fetch-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ driverId: driver.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch driver documents');
      }

      const documentsData = await response.json();
      
      // Update selected driver with documents
      setSelectedDriver(prev => prev ? {...prev, documents: documentsData || []} : null);
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
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, simulate approval without calling the edge function
        console.log('Development environment detected, simulating driver approval');
        
        // Simulate a network request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        }
        
        // Add mock activity log
        const mockLog: ActivityLog = {
          id: `log_approve_${Date.now()}`,
          driver_id: driverId,
          admin_id: userData?.id,
          action: "driver_verified",
          details: {},
          created_at: new Date().toISOString(),
          admin: {
            name: userData?.name || "Admin User",
            email: userData?.email || "admin@example.com"
          }
        };
        
        setActivityLogs(prev => [mockLog, ...prev]);
        
        toast({
          title: "Driver Approved",
          description: "The driver has been verified and can now accept trips.",
          variant: "success"
        });
        
        setProcessingAction(false);
        return;
      }
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }

      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-approve-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ driverId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve driver');
      }
      
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
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, simulate decline without calling the edge function
        console.log('Development environment detected, simulating driver decline');
        
        // Simulate a network request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        
        // Add mock activity log
        const mockLog: ActivityLog = {
          id: `log_decline_${Date.now()}`,
          driver_id: selectedDriver.id,
          admin_id: userData?.id,
          action: "driver_declined",
          details: { reason: declineReason.trim() || 'Your verification was declined. Please contact support.' },
          created_at: new Date().toISOString(),
          admin: {
            name: userData?.name || "Admin User",
            email: userData?.email || "admin@example.com"
          }
        };
        
        setActivityLogs(prev => [mockLog, ...prev]);
        
        toast({
          title: "Driver Declined",
          description: "The driver's verification request has been declined.",
        });
        
        // Reset and close modal
        setDeclineReason('');
        setShowDeclineModal(false);
        setProcessingAction(false);
        return;
      }
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }

      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-decline-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          driverId: selectedDriver.id,
          declineReason: declineReason.trim() || 'Your verification was declined. Please contact support.'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decline driver');
      }
      
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
      
      // Check if we're in a development/WebContainer environment
      const isDevEnvironment = 
        window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer-api.io') ||
        window.location.hostname.includes('stackblitz.io');
      
      if (isDevEnvironment) {
        // In development, simulate availability toggle without calling the edge function
        console.log('Development environment detected, simulating availability toggle');
        
        const newAvailability = !selectedDriver.is_available;
        
        // Simulate a network request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        
        // Add mock activity log
        const mockLog: ActivityLog = {
          id: `log_availability_${Date.now()}`,
          driver_id: selectedDriver.id,
          admin_id: userData?.id,
          action: "admin_availability_change",
          details: { 
            new_status: newAvailability,
            admin_note: adminNote || `Admin override: Set to ${newAvailability ? 'available' : 'unavailable'}`
          },
          created_at: new Date().toISOString(),
          admin: {
            name: userData?.name || "Admin User",
            email: userData?.email || "admin@example.com"
          }
        };
        
        setActivityLogs(prev => [mockLog, ...prev]);
        
        toast({
          title: `Driver is now ${newAvailability ? 'available' : 'unavailable'}`,
          description: `You've manually ${newAvailability ? 'enabled' : 'disabled'} this driver's availability status.`,
          variant: "success"
        });
        
        // Reset and close modal
        setAdminNote('');
        setShowToggleModal(false);
        setProcessingAction(false);
        return;
      }
      
      // Make sure we have a valid session before making the request
      if (!session) {
        console.log('No active session, attempting to refresh');
        await refreshSession();
      }

      const newAvailability = !selectedDriver.is_available;
      
      // Call the admin edge function with the JWT token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-toggle-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          driverId: selectedDriver.id,
          newStatus: newAvailability,
          adminNote: adminNote || `Admin override: Set to ${newAvailability ? 'available' : 'unavailable'}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle driver availability');
      }
      
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

  const showSendNotificationModal = () => {
    if (!selectedDriver) return;
    setNotificationMessage('Please complete your driver profile verification by uploading the required documents.');
    setShowNotificationModal(true);
  };

  const sendNotification = async () => {
    if (!selectedDriver || !notificationMessage.trim()) return;
    
    try {
      setProcessingAction(true);
      
      // Here you would implement the actual notification sending logic
      // For now, we'll just simulate it with a successful toast
      
      // This would be the API call to send the notification in a real implementation
      // For example:
      // const response = await fetch(`${supabaseUrl}/functions/v1/admin-send-notification`, {
      //   method: 'POST',
      //   headers: { ... },
      //   body: JSON.stringify({ 
      //     userId: selectedDriver.user_id,
      //     message: notificationMessage
      //   })
      // });
      
      // For now, fake a successful call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notification Sent",
        description: `The notification has been sent to ${selectedDriver.user?.name || 'the partner'}.`,
        variant: "success"
      });
      
      // Add to activity logs (would be done by the server in a real implementation)
      const fakeLogEntry = {
        id: `fake-${Date.now()}`,
        driver_id: selectedDriver.id,
        admin_id: userData?.id,
        action: 'notification_sent',
        details: { message: notificationMessage },
        created_at: new Date().toISOString(),
        admin: {
          name: userData?.name || 'Admin',
          email: userData?.email || ''
        }
      };
      
      // Update the activity logs list
      setActivityLogs([fakeLogEntry, ...activityLogs]);
      
      // Reset and close modal
      setNotificationMessage('');
      setShowNotificationModal(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send notification. Please try again later."
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
    setNotificationMessage('');
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
        
      case 'notification_sent':
        actionText = 'Notification sent to driver';
        iconElement = <Send className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
        textColor = 'text-blue-700 dark:text-blue-300';
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
          
          {/* Show message if this is a notification */}
          {log.action === 'notification_sent' && log.details.message && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
              "{log.details.message}"
            </p>
          )}
          
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
              <h3 className="font-medium text-gray-900 dark:text-white">Drivers & Partners</h3>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Filter className="h-3 w-3 mr-1" />
                <span>{filteredDrivers.length} {statusFilter !== 'all' ? statusFilter : ''} {filteredDrivers.length !== 1 ? 'users' : 'user'}</span>
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
                  <p className="text-gray-500 dark:text-gray-400">No drivers or partners found matching your criteria.</p>
                </div>
              ) : (
                filteredDrivers.map(driver => (
                  <div 
                    key={driver.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedDriver?.id === driver.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    } ${driver._isPartnerWithoutProfile ? 'border-l-4 border-yellow-400 dark:border-yellow-600' : ''}`}
                    onClick={() => viewDriverDocuments(driver)}
                  >
                    <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {driver.user?.name || 'Unknown'}
                        {driver._isPartnerWithoutProfile && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            Partner
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        {getVerificationStatusLabel(driver.verification_status)}
                        {!driver._isPartnerWithoutProfile && driver.verification_status === 'verified' && 
                          getAvailabilityStatusLabel(driver.is_available)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {driver.user?.email || 'No email'}
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {driver._isPartnerWithoutProfile ? 
                          'No driver profile' : 
                          `Documents: ${driver._documentCount || 0}`}
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {driver._isPartnerWithoutProfile ? 
                          driver.user_id.substring(0, 8) : 
                          driver.id.substring(0, 8)}...
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
                    {selectedDriver._isPartnerWithoutProfile ? 'Partner' : 'Driver'} Details
                  </h3>
                  <div className="ml-3">
                    {getVerificationStatusLabel(selectedDriver.verification_status)}
                  </div>
                  {!selectedDriver._isPartnerWithoutProfile && selectedDriver.verification_status === 'verified' && (
                    <div className="ml-2">
                      {getAvailabilityStatusLabel(selectedDriver.is_available)}
                    </div>
                  )}
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
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {selectedDriver._isPartnerWithoutProfile ? 'Partner' : 'Driver'} Information
                  </h4>
                  
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
                    
                    {!selectedDriver._isPartnerWithoutProfile && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License Number</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedDriver.license_number || 'Not provided'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Partner Without Profile Message */}
                {selectedDriver._isPartnerWithoutProfile && (
                  <div className="mb-6 p-4 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600 rounded-md">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Partner Without Driver Profile
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-200 mb-4">
                      This user has a partner role but has not created a driver profile yet. They need to complete their profile before they can be verified and start accepting trips.
                    </p>
                    <button
                      onClick={showSendNotificationModal}
                      className="inline-flex items-center px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800/40 dark:hover:bg-yellow-800/60 text-yellow-800 dark:text-yellow-300 rounded-md"
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Send Profile Completion Notification
                    </button>
                  </div>
                )}
                
                {/* Document Status */}
                {!selectedDriver._isPartnerWithoutProfile && (
                  selectedDriver.documents ? (
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
                        <button
                          onClick={showSendNotificationModal}
                          className="mt-4 inline-flex items-center px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          Send Documentation Reminder
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  )
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
                  {/* Send Notification Button */}
                  <button
                    onClick={showSendNotificationModal}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 inline-flex items-center"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Send Notification
                  </button>
                  
                  {/* Toggle availability button (shows for verified drivers) */}
                  {!selectedDriver._isPartnerWithoutProfile && (
                    <button
                      onClick={showToggleAvailabilityModal}
                      disabled={processingAction || selectedDriver.verification_status !== 'verified'}
                      className="px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 inline-flex items-center"
                      title={selectedDriver.verification_status !== 'verified' ? "Driver must be verified to change availability" : ""}
                    >
                      <Power className="h-4 w-4 mr-1.5" />
                      {selectedDriver.is_available ? 'Set Unavailable' : 'Set Available'}
                    </button>
                  )}
                  
                  {selectedDriver.verification_status === 'pending' && !selectedDriver._isPartnerWithoutProfile && (
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
                  
                  {selectedDriver.verification_status === 'declined' && !selectedDriver._isPartnerWithoutProfile && (
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
                  
                  {selectedDriver.verification_status === 'verified' && !selectedDriver._isPartnerWithoutProfile && (
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

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Send Notification to {selectedDriver?._isPartnerWithoutProfile ? 'Partner' : 'Driver'}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Send a notification to remind {selectedDriver?.user?.name || 'this user'} about completing their profile or uploading required documents.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Message
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter message to send to the user..."
                rows={4}
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              
              <button
                onClick={sendNotification}
                disabled={processingAction || !notificationMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center"
              >
                {processingAction ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverVerification;