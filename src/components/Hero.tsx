import React, { useEffect } from 'react';
import SearchForm from './SearchForm';
import { motion } from 'framer-motion';

const Hero = () => {
  // Preload images
  useEffect(() => {
    const imagesToPreload = [
      'https://i.imghippo.com/files/GSIu4447oeQ.webp',
      'https://i.imghippo.com/files/MJSV1132ko.webp',
      'https://i.imgur.com/pfnf4hc.jpeg',
      'https://i.imgur.com/4U5ngny.jpeg'
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <div id="booking-form" className="relative h-[800px] md:h-auto md:min-h-[700px]">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <picture className="w-full h-full">
          {/* Mobile Image */}
          <source
            media="(max-width: 767px)"
            srcSet="https://i.imghippo.com/files/GSIu4447oeQ.webp"
            type="image/webp"
            fetchpriority="high"
          />
          <source
            media="(max-width: 767px)"
            srcSet="https://i.imgur.com/pfnf4hc.jpeg"
            type="image/jpeg"
            fetchpriority="high"
          />
          
          {/* Desktop Image */}
          <source
            media="(min-width: 768px)"
            srcSet="https://i.imghippo.com/files/MJSV1132ko.webp"
            type="image/webp"
            fetchpriority="high"
          />
          <source
            media="(min-width: 768px)"
            srcSet="https://i.imgur.com/4U5ngny.jpeg"
            type="image/jpeg"
            fetchpriority="high"
          />
          
          {/* Fallback Image */}
          <img
            src="https://i.imgur.com/4U5ngny.jpeg"
            alt="Royal Transfer EU Hero"
            className="w-full h-full object-cover"
            fetchpriority="high"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 md:pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="text-white text-center md:text-right">
            <div className="md:absolute md:right-[50%] md:translate-x-[-2rem] md:top-[200px]">
              <motion.h1 
                className="text-4xl md:text-6xl font-bold mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                The road is part of<br />the adventure
              </motion.h1>
              <motion.p 
                className="text-[18px] mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Enjoy the trip — we'll handle the rest
              </motion.p>
            </div>
          </div>
          
          <motion.div 
            className="w-full md:max-w-xl lg:max-w-2xl"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SearchForm />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;