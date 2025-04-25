/**
 * Utility for preloading images to ensure faster rendering
 * and graceful fallbacks when primary images fail to load
 */

import { getFallbackImageUrl } from './imageFallbacks';

type ImagePreloadStatus = {
  loaded: boolean;
  failed: boolean;
  fallbackLoaded: boolean;
};

const imageStatuses = new Map<string, ImagePreloadStatus>();

/**
 * Preload critical images in the background
 * @param urls Array of image URLs to preload
 * @param options Configuration options
 */
export const preloadImages = (
  urls: string[],
  options: {
    useFallbacks?: boolean;
    onProgress?: (loaded: number, total: number) => void;
    onComplete?: () => void;
  } = {}
) => {
  const { useFallbacks = true, onProgress, onComplete } = options;
  
  // For tracking progress
  let loadedCount = 0;
  const totalToLoad = useFallbacks ? urls.length * 2 : urls.length;
  
  // Create a unique list of all URLs to preload (primary + fallbacks)
  const uniqueUrls = [...new Set(urls)];
  const allUrls = useFallbacks
    ? [...uniqueUrls, ...uniqueUrls.map(getFallbackImageUrl)]
    : uniqueUrls;
  
  // Filter out duplicates that might have been introduced by the fallback mapping
  const urlsToLoad = [...new Set(allUrls)];

  // Start preloading all images
  urlsToLoad.forEach(url => {
    // Skip if already loaded or in progress
    if (imageStatuses.has(url)) {
      const status = imageStatuses.get(url)!;
      if (status.loaded || status.fallbackLoaded) {
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalToLoad);
        }
        if (loadedCount === urlsToLoad.length && onComplete) {
          onComplete();
        }
        return;
      }
    } else {
      imageStatuses.set(url, { loaded: false, failed: false, fallbackLoaded: false });
    }

    const img = new Image();
    
    img.onload = () => {
      const status = imageStatuses.get(url) || { loaded: false, failed: false, fallbackLoaded: false };
      imageStatuses.set(url, { ...status, loaded: true });
      
      loadedCount++;
      if (onProgress) {
        onProgress(loadedCount, totalToLoad);
      }
      
      if (loadedCount === urlsToLoad.length && onComplete) {
        onComplete();
      }
    };
    
    img.onerror = () => {
      const status = imageStatuses.get(url) || { loaded: false, failed: false, fallbackLoaded: false };
      imageStatuses.set(url, { ...status, failed: true });
      
      // If this was a primary URL and it failed, try the fallback
      if (urls.includes(url) && useFallbacks) {
        const fallbackUrl = getFallbackImageUrl(url);
        
        // Only try the fallback if it's different from the original
        if (fallbackUrl !== url) {
          const fallbackImg = new Image();
          
          fallbackImg.onload = () => {
            const status = imageStatuses.get(url) || { loaded: false, failed: true, fallbackLoaded: false };
            imageStatuses.set(url, { ...status, fallbackLoaded: true });
            
            loadedCount++;
            if (onProgress) {
              onProgress(loadedCount, totalToLoad);
            }
            
            if (loadedCount === urlsToLoad.length && onComplete) {
              onComplete();
            }
          };
          
          fallbackImg.onerror = () => {
            loadedCount++;
            if (onProgress) {
              onProgress(loadedCount, totalToLoad);
            }
            
            if (loadedCount === urlsToLoad.length && onComplete) {
              onComplete();
            }
          };
          
          fallbackImg.src = fallbackUrl;
        } else {
          // If no different fallback, just count as loaded
          loadedCount++;
          if (onProgress) {
            onProgress(loadedCount, totalToLoad);
          }
          
          if (loadedCount === urlsToLoad.length && onComplete) {
            onComplete();
          }
        }
      } else {
        // No fallback option, just count as loaded
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalToLoad);
        }
        
        if (loadedCount === urlsToLoad.length && onComplete) {
          onComplete();
        }
      }
    };
    
    // Start loading the image
    img.src = url;
  });

  // Return a status object that can be used to check the loading progress
  return {
    getProgress: () => ({ loaded: loadedCount, total: urlsToLoad.length }),
    isComplete: () => loadedCount === urlsToLoad.length,
  };
};

/**
 * Check if a specific image has been preloaded successfully
 * @param url Image URL to check
 * @returns Boolean indicating if the image is ready
 */
export const isImagePreloaded = (url: string): boolean => {
  const status = imageStatuses.get(url);
  
  if (!status) return false;
  
  return status.loaded || status.fallbackLoaded;
};

/**
 * Preload images for a specific route in advance
 * @param route The route to preload images for
 */
export const preloadImagesForRoute = (route: string): void => {
  const routeMap: Record<string, string[]> = {
    // Home page critical images
    '/': [
      'https://files.royaltransfer.eu/assets/rt-logo-black-950-500.webp',
      'https://files.royaltransfer.eu/assets/newherotest.webp',
      'https://files.royaltransfer.eu/assets/mobileherotest.webp'
    ],
    
    // Booking flow images
    '/transfer': [
      'https://files.royaltransfer.eu/assets/Standard-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/Premium-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/VIP-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/Standard-Minivan.jpg'
    ],
    
    // About page
    '/about': [
      'https://files.royaltransfer.eu/assets/about-hero.webp'
    ],
    
    // Services page
    '/services': [
      'https://files.royaltransfer.eu/assets/services-hero.webp'
    ]
  };

  // Find matching route (exact or starts with)
  const urls = Object.entries(routeMap).find(([key]) => 
    route === key || route.startsWith(key + '/')
  )?.[1] || [];

  if (urls.length > 0) {
    preloadImages(urls);
  }
};

export default {
  preloadImages,
  isImagePreloaded,
  preloadImagesForRoute,
};
