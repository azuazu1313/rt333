import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Calendar, MapPin, Users } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { motion } from 'framer-motion';

const BookingSuccess = () => {
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the session_id from the URL query parameters
    const params = new URLSearchParams(location.search);
    const id = params.get('session_id');
    setSessionId(id);
    
    // You could fetch the session details from your backend here
    // if you need to display more information about the booking
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Thank you for booking with Royal Transfer EU. Your transfer has been successfully confirmed.
            </p>
            
            {sessionId && (
              <div className="mb-8 text-left bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Booking Reference:</p>
                <p className="font-mono text-sm">{sessionId}</p>
              </div>
            )}
            
            <div className="border-t border-b py-6 my-6">
              <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex flex-col items-center text-center">
                  <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">Confirmation Email</h3>
                  <p className="text-sm text-gray-600">Check your inbox for booking details</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <MapPin className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">Driver Assignment</h3>
                  <p className="text-sm text-gray-600">We'll assign your driver soon</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Users className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">24/7 Support</h3>
                  <p className="text-sm text-gray-600">We're here if you need assistance</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/bookings"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
              >
                View My Bookings
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/"
                className="border border-blue-600 text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition-all duration-300"
              >
                Return to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default BookingSuccess;