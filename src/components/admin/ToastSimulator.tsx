import React, { useState } from 'react';
import { useToast } from '../ui/use-toast';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

const ToastSimulator: React.FC = () => {
  const [toastTitle, setToastTitle] = useState('Sample Toast');
  const [toastDescription, setToastDescription] = useState('This is an example toast notification message.');
  const [toastVariant, setToastVariant] = useState<'default' | 'destructive' | 'success'>('default');
  const [toastDuration, setToastDuration] = useState(5000);
  const [isSending, setIsSending] = useState(false);
  
  const { toast } = useToast();

  const showToast = () => {
    setIsSending(true);
    
    // Simulate network delay
    setTimeout(() => {
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: toastVariant,
        duration: toastDuration,
      });
      
      setIsSending(false);
    }, 500);
  };

  const presetToasts = [
    { title: 'Success', description: 'Operation completed successfully!', variant: 'success' },
    { title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' },
    { title: 'Warning', description: 'Please be aware of this important information.', variant: 'default' },
    { title: 'Information', description: 'This is an informational message.', variant: 'default' },
    { title: 'Network Error', description: 'Connection failed. Please check your internet connection.', variant: 'destructive' },
    { title: 'Validation Error', description: 'Please check the form for errors before submitting.', variant: 'destructive' },
    { title: 'Data Saved', description: 'Your changes have been saved successfully.', variant: 'success' },
    { title: 'Permission Denied', description: 'You do not have permission to perform this action.', variant: 'destructive' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold dark:text-white">Toast Simulator</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Test various toast notifications to verify UI and UX
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom Toast Builder */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-white">Custom Toast</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={toastTitle}
                onChange={(e) => setToastTitle(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Toast Title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={toastDescription}
                onChange={(e) => setToastDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Toast Description"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variant
              </label>
              <select
                value={toastVariant}
                onChange={(e) => setToastVariant(e.target.value as 'default' | 'destructive' | 'success')}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="default">Default</option>
                <option value="success">Success</option>
                <option value="destructive">Destructive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (ms)
              </label>
              <input
                type="number"
                value={toastDuration}
                onChange={(e) => setToastDuration(Number(e.target.value))}
                min="1000"
                step="1000"
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              onClick={showToast}
              disabled={isSending}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Toast...
                </>
              ) : (
                'Show Toast'
              )}
            </button>
          </div>
        </div>

        {/* Preset Toasts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-white">Preset Toasts</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              {presetToasts.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    toast({
                      title: preset.title,
                      description: preset.description,
                      variant: preset.variant as any,
                    });
                  }}
                  className={`p-3 rounded-md text-left flex items-start ${
                    preset.variant === 'destructive'
                      ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300'
                      : preset.variant === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {preset.variant === 'destructive' ? (
                    <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                  ) : preset.variant === 'success' ? (
                    <CheckCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <Info className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{preset.title}</div>
                    <div className="text-sm mt-1 opacity-80">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-700">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          <h3 className="font-medium text-gray-900 dark:text-white">Preview</h3>
        </div>
        
        <div className="p-6">
          <div className={`rounded-lg shadow-lg p-4 max-w-md ${
            toastVariant === 'destructive'
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              : toastVariant === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100'
          }`}>
            <div className="flex">
              {toastVariant === 'destructive' ? (
                <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
              ) : toastVariant === 'success' ? (
                <CheckCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
              ) : (
                <Info className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-medium">
                  {toastTitle || 'Toast Title'}
                </h4>
                <p className="text-sm mt-1">
                  {toastDescription || 'Toast description goes here.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">How to use</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Use this tool to test toast notifications in different states and variants. 
              Customize parameters or use presets to see how toasts appear in your UI.
              Useful for debugging and testing user notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastSimulator;