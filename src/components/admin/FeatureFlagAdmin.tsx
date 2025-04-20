import React, { useState, useEffect } from 'react';

interface FeatureFlag {
  key: string;
  name: string;
  enabled: boolean;
  description: string;
}

const defaultFlags: FeatureFlag[] = [
  {
    key: 'show_cookies_banner',
    name: 'Cookies Banner Pop-up',
    enabled: true,
    description: 'Controls whether users see the Cookies Banner Pop-up'
  },
  // Add more feature flags as needed
];

const FeatureFlagAdmin: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    // Load flags
    const loadFlags = () => {
      setLoading(true);
      try {
        // Try to load from localStorage first
        const savedFlags = localStorage.getItem('featureFlags');
        if (savedFlags) {
          const parsedFlags = JSON.parse(savedFlags);
          
          // Map from camelCase (localStorage) to snake_case (admin UI)
          const mappedFlags = defaultFlags.map(flag => {
            if (flag.key === 'show_cookies_banner') {
              return {
                ...flag,
                enabled: parsedFlags.showCookieBanner ?? flag.enabled
              };
            }
            // Add mappings for other flags
            return flag;
          });
          
          setFlags(mappedFlags);
        } else {
          setFlags(defaultFlags);
        }
      } catch (error) {
        console.error('Error loading feature flags:', error);
        setFlags(defaultFlags);
      } finally {
        setLoading(false);
      }
    };
    
    loadFlags();
  }, []);
  
  // Toggle a feature flag
  const toggleFlag = (key: string) => {
    setFlags(prev => prev.map(flag => 
      flag.key === key ? { ...flag, enabled: !flag.enabled } : flag
    ));
  };
  
  // Save changes
  const saveChanges = () => {
    setSaveStatus('saving');
    
    try {
      // Update flags in main site using the global function
      flags.forEach(flag => {
        if (window.setFeatureFlag) {
          if (flag.key === 'show_cookies_banner') {
            window.setFeatureFlag('show_cookies_banner', flag.enabled);
          }
          // Add handling for other flags
        }
      });
      
      setSaveStatus('success');
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving feature flags:', error);
      setSaveStatus('error');
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };
  
  if (loading) {
    return <div className="text-center p-4">Loading feature flags...</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Feature Flags</h2>
        <button
          onClick={saveChanges}
          disabled={saveStatus === 'saving'}
          className={`px-4 py-2 rounded-md text-white ${
            saveStatus === 'saving' ? 'bg-gray-400' :
            saveStatus === 'success' ? 'bg-green-500' :
            saveStatus === 'error' ? 'bg-red-500' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saveStatus === 'saving' ? 'Saving...' :
           saveStatus === 'success' ? 'Saved!' :
           saveStatus === 'error' ? 'Error!' :
           'Save Changes'}
        </button>
      </div>
      
      <div className="space-y-4">
        {flags.map(flag => (
          <div key={flag.key} className="border p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-lg">{flag.name}</h3>
                <p className="text-sm text-gray-500">{flag.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flag.enabled}
                  onChange={() => toggleFlag(flag.key)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="text-xs text-gray-500 italic">
              Key: {flag.key}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureFlagAdmin;