import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Initialize GA with Measurement ID from environment variables
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string;

export const useAnalytics = () => {
  const location = useLocation();
  const initialized = ReactGA.isInitialized;

  // Initialize GA only once
  useEffect(() => {
    if (!initialized && MEASUREMENT_ID) {
      ReactGA.initialize(MEASUREMENT_ID, {
        gtagOptions: {
          send_page_view: false // We'll handle this manually
        }
      });
      console.log('Google Analytics initialized with ID:', MEASUREMENT_ID);
    }
  }, [initialized]);

  // Track page views when location changes
  useEffect(() => {
    if (initialized) {
      const pagePath = location.pathname + location.search;
      ReactGA.send({ 
        hitType: 'pageview', 
        page: pagePath,
        title: document.title
      });
      console.log('Page view tracked:', pagePath);
    }
  }, [location, initialized]);

  // Custom event tracking function
  const trackEvent = useCallback((category: string, action: string, label?: string, value?: number, nonInteraction: boolean = false) => {
    if (initialized) {
      ReactGA.event({
        category,
        action,
        label,
        value,
        nonInteraction
      });
      console.log('Event tracked:', { category, action, label, value });
    } else {
      console.warn('Cannot track event: Google Analytics not initialized');
    }
  }, [initialized]);

  // User identification (can be used after login)
  const setUserId = useCallback((userId: string) => {
    if (initialized) {
      ReactGA.set({ userId });
      console.log('User ID set:', userId);
    }
  }, [initialized]);

  // Set user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    if (initialized) {
      ReactGA.gtag('set', 'user_properties', properties);
      console.log('User properties set:', properties);
    }
  }, [initialized]);

  // Exception tracking
  const trackException = useCallback((description: string, fatal: boolean = false) => {
    if (initialized) {
      ReactGA.exception({
        description,
        fatal
      });
      console.log('Exception tracked:', { description, fatal });
    }
  }, [initialized]);

  return {
    trackEvent,
    setUserId,
    setUserProperties,
    trackException
  };
};