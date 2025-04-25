/**
 * Utility to help with image loading issues
 */

// Map of original URLs to fallback URLs
const fallbackImageMap: Record<string, string> = {
  // Logo fallbacks
  "https://files.royaltransfer.eu/assets/rt-logo-black-950-500.webp": "https://i.imgur.com/cDgm3025.webp",
  "https://files.royaltransfer.eu/assets/rt-logo-black-950-500.png": "https://i.imgur.com/mijH1834.png",
  
  // Hero image fallbacks
  "https://files.royaltransfer.eu/assets/newherotest.webp": "https://i.imgur.com/ZKj2573.webp",
  "https://files.royaltransfer.eu/assets/newherotest.png": "https://i.imgur.com/Axi3104.png",
  "https://files.royaltransfer.eu/assets/mobileherotest.webp": "https://i.imgur.com/ohfj7576.webp",
  "https://files.royaltransfer.eu/assets/mobileherotest.png": "https://i.imgur.com/lTA7682.png",
  
  // Vehicle images
  "https://files.royaltransfer.eu/assets/Standard-Sedan.jpg": "https://i.imgur.com/BUpN7Wn.jpeg",
  "https://files.royaltransfer.eu/assets/Premium-Sedan.jpg": "https://i.imgur.com/BUpN7Wn.jpeg",
  "https://files.royaltransfer.eu/assets/VIP-Sedan.jpg": "https://i.imgur.com/DKdfE4r.jpeg",
  "https://files.royaltransfer.eu/assets/Standard-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/XL-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/VIP-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/Sprinter-8.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Sprinter-16.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Sprinter-21.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Bus-51.jpg": "https://i.imgur.com/IZqo3474.jpg",
  
  // City images
  "https://files.royaltransfer.eu/assets/rome327.webp": "https://i.imgur.com/CFL9494.webp",
  "https://files.royaltransfer.eu/assets/rome1280png.png": "https://i.imgur.com/lTA7682.jpg",
  "https://files.royaltransfer.eu/assets/paris136.webp": "https://i.imgur.com/sLs3440.webp",
  "https://files.royaltransfer.eu/assets/paris1280png.png": "https://i.imgur.com/IdwC2475.jpg",
  "https://files.royaltransfer.eu/assets/barc255.webp": "https://i.imgur.com/iqAp5725.webp",
  "https://files.royaltransfer.eu/assets/barca1280png.png": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/milano250.webp": "https://i.imgur.com/ZqBO3169.webp",
  "https://files.royaltransfer.eu/assets/milano1280png.png": "https://i.imgur.com/rLX6532.jpeg",
  
  // Payment logos
  "https://files.royaltransfer.eu/assets/Visa.png": "https://i.ibb.co/cbqV7Pf/visa.png",
  "https://files.royaltransfer.eu/assets/Mastercard-logo.svg": "https://i.ibb.co/X4LwdPQ/mastercard.png",
  "https://files.royaltransfer.eu/assets/Google_Pay_Logo.png": "https://i.ibb.co/PCTrbwf/googlepay.png",
  "https://files.royaltransfer.eu/assets/applepay.png": "https://i.ibb.co/Nx8h4vk/applepay.png",
  "https://files.royaltransfer.eu/assets/American_Express_logo.png": "https://i.ibb.co/NL7bD8d/amex.png",
  "https://files.royaltransfer.eu/assets/Stripe_Logo.png": "https://i.ibb.co/1JL4TFb/stripe.png"
};

/**
 * Get fallback URL for an image if available
 * @param originalUrl The original image URL
 * @returns The fallback URL or the original if no fallback exists
 */
export const getFallbackImageUrl = (originalUrl: string): string => {
  return fallbackImageMap[originalUrl] || originalUrl;
};

/**
 * Creates an image URL with built-in fallback capability
 * @param primaryUrl The primary image URL
 * @param fallbackUrl Optional explicit fallback URL
 * @returns A URL string that may include additional parameters for retries
 */
export const createImageUrl = (primaryUrl: string, fallbackUrl?: string): string => {
  // If an explicit fallback is provided, add it as a query parameter
  if (fallbackUrl) {
    const url = new URL(primaryUrl);
    url.searchParams.append('fallback', encodeURIComponent(fallbackUrl));
    return url.toString();
  }
  
  // Otherwise check if we have a mapped fallback
  const mappedFallback = fallbackImageMap[primaryUrl];
  if (mappedFallback) {
    const url = new URL(primaryUrl);
    url.searchParams.append('fallback', encodeURIComponent(mappedFallback));
    return url.toString();
  }
  
  return primaryUrl;
};

/**
 * Check if an image exists by preloading it
 * @param url The URL to check
 * @returns Promise that resolves to true if image loads, false otherwise
 */
export const checkImageExists = async (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    img.src = url;
    
    // Also set a timeout in case the image load hangs
    setTimeout(() => resolve(false), 5000);
  });
};

export default {
  getFallbackImageUrl,
  createImageUrl,
  checkImageExists,
};
