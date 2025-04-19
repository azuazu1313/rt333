import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideSignIn />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-5 h-5 mr-2" />
                <span>Back to Login</span>
              </button>
              <a
                href="https://royaltransfer.eu/contact"
                className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;