import React from 'react';
import { Shield, CreditCard, Star, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';

const TrustBadges = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-8 text-center">Trusted by Travelers Worldwide</h2>
          <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
            <motion.div 
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <CreditCard className="w-8 h-8 md:w-12 md:h-12 text-blue-600 mb-2" />
              <p className="text-sm md:text-base text-gray-600">Secure Payments</p>
              <p className="text-xs md:text-sm text-gray-500">All major cards accepted</p>
            </motion.div>

            <motion.div 
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-12 md:h-16 mb-2 relative">
                <img 
                  src="https://logos-world.net/wp-content/uploads/2020/11/Tripadvisor-Logo.png" 
                  alt="Tripadvisor Logo" 
                  className="h-full w-auto object-contain"
                  style={{ aspectRatio: '700/394' }}
                />
              </div>
              <div className="flex items-center mb-2">
                <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 fill-current" />
                <span className="text-xl md:text-2xl font-bold ml-2">4.9</span>
              </div>
              <p className="text-sm md:text-base text-gray-600">Tripadvisor Rating</p>
              <p className="text-xs md:text-sm text-gray-500">Based on 1000+ reviews</p>
            </motion.div>

            <motion.div 
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Shield className="w-8 h-8 md:w-12 md:h-12 text-blue-600 mb-2" />
              <p className="text-sm md:text-base text-gray-600">SSL Encrypted</p>
              <p className="text-xs md:text-sm text-gray-500">Your data is protected</p>
            </motion.div>
          </div>

          <div className="border-t pt-8">
            <p className="text-center text-gray-600 mb-6">Accepted Payment Methods</p>
            <div className="flex flex-col space-y-6">
              <div className="grid grid-cols-3 md:flex md:justify-center items-center gap-4 md:space-x-6">
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                    alt="Visa" 
                    className="h-6 md:h-8"
                    style={{ aspectRatio: '3/1' }}
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
                    alt="MasterCard" 
                    className="h-6 md:h-8"
                    style={{ aspectRatio: '1.6/1' }}
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" 
                    alt="Google Pay" 
                    className="h-6 md:h-8"
                    style={{ aspectRatio: '2.5/1' }}
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" 
                    alt="Apple Pay" 
                    className="h-6 md:h-8"
                    style={{ aspectRatio: '2.7/1' }}
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" 
                    alt="American Express" 
                    className="h-8 md:h-12"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
                    alt="Stripe Payments"
                    className="h-6 md:h-10"
                    style={{ aspectRatio: '2.5/1' }}
                  />
                </div>
              </div>
              <div className="flex justify-center items-center space-x-2">
                <Banknote className="w-6 h-6 text-green-600" />
                <span className="text-gray-600">Cash payment available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;