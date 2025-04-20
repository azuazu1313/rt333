import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  AlertTriangle,
  ExternalLink,
  Eye 
} from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';

interface Document {
  id: string;
  driver_id: string;
  doc_type: 'license' | 'insurance' | 'registration' | 'other';
  file_url: string;
  uploaded_at: string;
  verified: boolean;
  expiry_date: string | null;
  name: string;
}

const DOCUMENT_TYPES = [
  { value: 'license', label: 'Driver License', required: true },
  { value: 'insurance', label: 'Insurance Certificate', required: true },
  { value: 'registration', label: 'Vehicle Registration', required: true },
  { value: 'other', label: 'Other Document', required: false }
];

const DriverDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    fetchDriverId().then(id => {
      if (id) {
        setDriverId(id);
        fetchDocuments(id);
      }
    });
  }, [userData]);

  const fetchDriverId = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userData?.id)
        .single();

      if (error) {
        console.error('Error fetching driver ID:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not find your driver profile. Please contact support.",
        });
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  const fetchDocuments = async (driverId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch your documents.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    if (!driverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Driver profile not found. Please contact support.",
      });
      return;
    }

    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload.",
      });
      return;
    }

    try {
      setUploading(docType);

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG or PDF file.');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${driverId}/${docType}_${Date.now()}.${fileExt}`;
      const filePath = `driver_documents/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Store document reference in the database
      const { error: dbError } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driverId,
          doc_type: docType,
          file_url: publicUrl,
          name: file.name,
          verified: false,
        });

      if (dbError) throw dbError;

      // Refresh documents list
      fetchDocuments(driverId);

      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully and is pending verification.",
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload document. Please try again.",
      });
    } finally {
      setUploading(null);
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const docType = DOCUMENT_TYPES.find(t => t.value === type);
    return docType ? docType.label : type;
  };

  const getDocumentStatus = (document: Document) => {
    if (!document.verified) {
      return {
        icon: <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
        text: 'Pending Verification',
        color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30'
      };
    }

    if (document.expiry_date) {
      const expiry = new Date(document.expiry_date);
      const now = new Date();
      const expiringThreshold = addDays(now, 30);

      if (isBefore(expiry, now)) {
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />,
          text: 'Expired',
          color: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
        };
      }

      if (isBefore(expiry, expiringThreshold)) {
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />,
          text: `Expiring Soon (${format(expiry, 'PP')})`,
          color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30'
        };
      }
    }

    return {
      icon: <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />,
      text: 'Verified',
      color: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30'
    };
  };

  const getDocumentForType = (type: string): Document | undefined => {
    return documents.find(doc => doc.doc_type === type);
  };

  // File input ref for each document type
  const fileInputRefs: Record<string, React.RefObject<HTMLInputElement>> = {};
  DOCUMENT_TYPES.forEach(type => {
    fileInputRefs[type.value] = React.createRef<HTMLInputElement>();
  });

  const triggerFileInput = (docType: string) => {
    if (fileInputRefs[docType]?.current) {
      fileInputRefs[docType].current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(docType, file);
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
      <div className="mb-6">
        <h1 className="text-xl font-bold dark:text-white">Documents</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Upload and manage your required documents. All documents must be verified before you can accept trips.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DOCUMENT_TYPES.map((docType) => {
          const existingDoc = getDocumentForType(docType.value);
          const status = existingDoc ? getDocumentStatus(existingDoc) : null;

          return (
            <div 
              key={docType.value}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700"
            >
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex justify-between items-center">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  {docType.label}
                  {docType.required && (
                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="p-6">
                {existingDoc ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${status?.color}`}>
                        {status?.icon}
                        <span className="ml-2">{status?.text}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <a 
                          href={existingDoc.file_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                          title="View Document"
                        >
                          <Eye className="h-5 w-5" />
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-[180px]">{existingDoc.name}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Uploaded: {format(new Date(existingDoc.uploaded_at), 'PP')}
                    </div>
                    
                    <div className="pt-4 border-t dark:border-gray-700 mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {existingDoc.verified ? 'Document verified' : 'Awaiting verification'}
                      </span>
                      
                      <input
                        type="file"
                        ref={fileInputRefs[docType.value]}
                        onChange={(e) => handleFileChange(e, docType.value)}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileInput(docType.value)}
                        disabled={!!uploading}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Upload New
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No document uploaded</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      {docType.required 
                        ? 'This document is required to accept trips.' 
                        : 'Upload this document if requested by admin.'}
                    </p>
                    
                    <input
                      type="file"
                      ref={fileInputRefs[docType.value]}
                      onChange={(e) => handleFileChange(e, docType.value)}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                    />
                    <button
                      type="button"
                      onClick={() => triggerFileInput(docType.value)}
                      disabled={uploading === docType.value}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {uploading === docType.value ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Document Requirements</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
              <li>All documents must be current and not expired</li>
              <li>Files must be in JPG, PNG, or PDF format</li>
              <li>Maximum file size is 5MB</li>
              <li>Documents must be clearly legible</li>
              <li>All documents will be verified by our team before you can start accepting trips</li>
            </ul>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
              For assistance, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDocuments;