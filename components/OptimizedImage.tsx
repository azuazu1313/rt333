import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  webp?: string;
  avif?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  sizes?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  webp,
  avif,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  sizes,
}) => {
  // If we have multiple formats, use a picture element
  if (webp || avif) {
    return (
      <picture>
        {avif && <source srcSet={avif} type="image/avif" sizes={sizes} />}
        {webp && <source srcSet={webp} type="image/webp" sizes={sizes} />}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding={decoding}
          sizes={sizes}
        />
      </picture>
    );
  }

  // Otherwise use a simple img element
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      sizes={sizes}
    />
  );
};

export default OptimizedImage;