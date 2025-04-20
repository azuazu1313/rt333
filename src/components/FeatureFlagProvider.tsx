import React, { createContext, useState, useEffect, useContext } from 'react';

// Define the feature flags type
interface FeatureFlags {
  showCookieBanner: boolean;
  // Add more feature flags as needed
}

// Default state for feature flags
const defaultFeatureFlags: FeatureFlags = {
  showCookieBanner: true,
  // Set defaults for other flags
};

// Create context for feature flags
const FeatureFlagContext = createContext<{
  flags: FeatureFlags;
  setFeatureFlag: (key: keyof FeatureFlags, value: boolean) => void;
}>({
  flags: defaultFeatureFlags,
  setFeatureFlag: () => {},
});

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    // Try to load flags from localStorage
    try {
      const savedFlags = localStorage.getItem('featureFlags');
      return savedFlags ? { ...defaultFeatureFlags, ...JSON.parse(savedFlags) } : defaultFeatureFlags;
    } catch (error) {
      console.error('Error loading feature flags from localStorage:', error);
      return defaultFeatureFlags;
    }
  });

  // Effect to fetch flags from a remote source if needed
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // Check for URL parameters to override flags for testing
        const urlParams = new URLSearchParams(window.location.search);
        const showBanner = urlParams.get('show_cookies_banner');
        
        if (showBanner !== null) {
          const shouldShow = showBanner === '1' || showBanner.toLowerCase() === 'true';
          setFlags(prev => ({ ...prev, showCookieBanner: shouldShow }));
        }
        
        // This could be replaced with a real API call to fetch from the admin system
        // For now, we're just using localStorage and URL parameters
      } catch (error) {
        console.error('Error fetching feature flags:', error);
      }
    };

    fetchFlags();
    
    // Optional: Set up event listener for cross-tab communication
    window.addEventListener('storage', (event) => {
      if (event.key === 'featureFlags') {
        try {
          const newFlags = JSON.parse(event.newValue || '{}');
          setFlags(prev => ({ ...prev, ...newFlags }));
        } catch (error) {
          console.error('Error parsing feature flags from storage event:', error);
        }
      }
    });
    
    return () => {
      window.removeEventListener('storage', () => {});
    };
  }, []);

  // Save flags to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('featureFlags', JSON.stringify(flags));
    } catch (error) {
      console.error('Error saving feature flags to localStorage:', error);
    }
  }, [flags]);

  // Function to set a specific feature flag
  const setFeatureFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };

  // Define a global function for admin panel integration
  useEffect(() => {
    // Expose a global function to set feature flags from the admin panel
    window.setFeatureFlag = (key: string, value: boolean) => {
      if (key === 'show_cookies_banner') {
        setFeatureFlag('showCookieBanner', value);
        return true;
      }
      // Add more mappings as needed
      return false;
    };
    
    // Clean up
    return () => {
      delete window.setFeatureFlag;
    };
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, setFeatureFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Hook to use feature flags
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

// Compatibility hook for existing code
export const useFeatureFlag = () => {
  const { flags } = useFeatureFlags();
  return flags;
};

// Extend the Window interface to include our global function
declare global {
  interface Window {
    setFeatureFlag?: (key: string, value: boolean) => boolean;
  }
}