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
              <img 
                src="https://imgs.search.brave.com/hTSLeIeT2GpU_PAug09N4LjrAr-EQVTBmH6nhY3nz1c/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9sb2dv/cy13b3JsZC5uZXQv/d3AtY29udGVudC91/cGxvYWRzLzIwMjAv/MTEvVHJpcGFkdmlz/b3ItTG9nby03MDB4/Mzk0LnBuZw" 
                alt="Tripadvisor Logo" 
                className="h-12 md:h-16 mb-2"
              />
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
                    src="https://imgs.search.brave.com/vQ_CTHk50F04Cw1YQ9ZSYovb1YU1CzUnSbwszWTI_Q8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy81/ODQ4MjM2M2NlZjEw/MTRjMGI1ZTQ5YzEu/cG5n" 
                    alt="Visa" 
                    className="h-6 md:h-8"
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://imgs.search.brave.com/KECO8Cte79k8P0KUmH1MQUZwagpccrEehDZJRq42YW8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy81/ODQ4MjM1NGNlZjEw/MTRjMGI1ZTQ5YzAu/cG5n" 
                    alt="MasterCard" 
                    className="h-6 md:h-8"
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://imgs.search.brave.com/D-3MyxtcsQS-Nq9ZV5l6AG85LyTxOMTztKhJAWD6kPs/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy82/MGU3Zjk2NDcxMWNm/NzAwMDQ4YjZhNmEu/cG5n" 
                    alt="Google Pay" 
                    className="h-6 md:h-8"
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" 
                    alt="Apple Pay" 
                    className="h-6 md:h-8"
                  />
                </div>
                <div className="flex justify-center">
                  <img 
                    src="https://i.ibb.co/sJ6mfb7v/amexlogo.png" 
                    alt="American Express AMEX" 
                    className="h-8 md:h-12"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    src="https://i.ibb.co/Rp0fZn10/stripe-logo-white-on-blue.png"
                    alt="Stripe Payments"
                    className="h-6 md:h-10"
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