import React, { useState, useEffect } from 'react';
import { getFallbackImageUrl } from '../utils/imageFallbacks';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Component that attempts to load an image with automatic fallback
 */
const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto'
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  useEffect(() => {
    // Reset states when src prop changes
    setImgSrc(src);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount < 2) {
      // First retry: Try adding cache buster
      setRetryCount(prev => prev + 1);
      setImgSrc(`${src}?cb=${Date.now()}`);
    } else if (retryCount === 2) {
      // Second retry: Get mapped fallback URL if available
      setRetryCount(prev => prev + 1);
      const fallbackUrl = getFallbackImageUrl(src);
      if (fallbackUrl !== src) {
        setImgSrc(fallbackUrl);
      } else {
        setHasError(true);
      }
    } else {
      // All retries failed
      setHasError(true);
    }
  };

  return (
    <>
      {hasError ? (
        // Final fallback - show a colored div with first letter of alt text
        <div 
          className={`flex items-center justify-center bg-gray-200 ${className}`}
          style={{ width: width || '100%', height: height || '100%' }}
          role="img"
          aria-label={alt}
        >
          <span className="text-gray-500 text-2xl font-bold">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchPriority}
          onError={handleError}
        />
      )}
    </>
  );
};

export default ImageWithFallback;
