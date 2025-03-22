import React from 'react';
import SearchForm from './SearchForm';
import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <div id="booking-form" className="relative h-[800px] md:h-auto md:min-h-[700px]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url("${window.innerWidth < 768 ? 'https://i.imgur.com/pfnf4hc.jpeg' : 'https://i.imgur.com/4U5ngny.jpeg'}")`,
          backgroundPosition: 'center center',
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-12 md:pb-16">
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