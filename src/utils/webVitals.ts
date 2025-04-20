import { ReportHandler, getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

// Function to report web vitals metrics
const reportWebVitalsToGA = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Import all web vitals functions
    getCLS(onPerfEntry); // Cumulative Layout Shift
    getFID(onPerfEntry); // First Input Delay
    getLCP(onPerfEntry); // Largest Contentful Paint
    getFCP(onPerfEntry); // First Contentful Paint
    getTTFB(onPerfEntry); // Time to First Byte
  }
};

// Create a function to report web vitals to Google Analytics
export const reportWebVitals = () => {
  // Only run if we have GA measurement ID
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    reportWebVitalsToGA((metric) => {
      // Log to console in development
      if (import.meta.env.DEV) {
        console.log(`Web Vital: ${metric.name}`, metric);
      }
      
      // Report to GA
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), // CLS values are typically < 1
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
          metric_rating: metric.rating, // 'good', 'needs-improvement', or 'poor'
          non_interaction: true // Prevents this from affecting bounce rate
        });
      }
    });
  }
};
