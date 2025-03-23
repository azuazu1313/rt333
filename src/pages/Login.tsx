import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';

const Login = () => {
  const [isDriver, setIsDriver] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePartnerClick = () => {
    navigate('/partners#partner-form');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header hideSignIn />
      
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-8">
              {isDriver ? (
                <Car className="w-12 h-12 text-blue-600" />
              ) : (
                <User className="w-12 h-12 text-blue-600" />
              )}
            </div>
            
            {/* Toggle Switch */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-8">
              <button
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                  !isDriver ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}
                onClick={() => setIsDriver(false)}
              >
                Customer
              </button>
              <button
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                  isDriver ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}
                onClick={() => setIsDriver(true)}
              >
                Driver
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or Phone
                </label>
                <input
                  type="text"
                  id="emailOrPhone"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center">
              {isDriver ? (
                <button
                  onClick={handlePartnerClick}
                  className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 transition-all duration-300"
                >
                  Partner with Us
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <Link
                  to="/customer-signup"
                  className="inline-flex items-center justify-center w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 transition-all duration-300"
                >
                  Sign Up as Customer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              )}
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
              <Link
                to="/"
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center mt-6">
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Need Help? Contact Support
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;