import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { motion } from 'framer-motion';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the session_id from the URL query parameters
    const params = new URLSearchParams(location.search);
    const id = params.get('session_id');
    setSessionId(id);
    
    // You could fetch the session details from your backend here
    // if you need to display more information about the booking
  }, [location]);
  
  // Create confetti effect
  useEffect(() => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100';
    document.body.appendChild(canvas);
    
    const context = canvas.getContext('2d');
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
    }> = [];
    
    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 5,
        alpha: 1
      });
    }
    
    const animate = () => {
      if (!context) return;
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, i) => {
        particle.y += particle.vy;
        particle.x += particle.vx;
        particle.alpha -= 0.005;
        
        if (particle.y > canvas.height || particle.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          context.globalAlpha = particle.alpha;
          context.fillStyle = particle.color;
          context.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
      });
      
      if (particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };
    
    animate();
    
    // Clean up
    return () => {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

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
            
            <div className="bg-gray-50 p-6 rounded-lg mb-8 text-left">
              <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-semibold text-green-800">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Confirmation Email</h3>
                    <p className="text-sm text-gray-600">
                      Check your inbox for detailed booking information
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-semibold text-green-800">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Driver Assignment</h3>
                    <p className="text-sm text-gray-600">
                      You'll receive driver details 24 hours before pickup
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="font-semibold text-green-800">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Ready to Go</h3>
                    <p className="text-sm text-gray-600">
                      Your driver will meet you at the specified location
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/bookings')}
                className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300 flex items-center justify-center"
              >
                View My Bookings
              </button>
              <button
                onClick={() => navigate('/')}
                className="border border-black text-black px-6 py-3 rounded-md hover:bg-gray-50 transition-all duration-300"
              >
                Return to Home
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default BookingSuccess;