export const loadGoogleMaps = () => {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    // Setup callbacks
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));

    // Add script to document
    document.head.appendChild(script);
  });
};