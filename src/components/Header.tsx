import React, { useState, useEffect } from 'react';
import { Crown, User, Loader2 } from 'lucide-react';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  isAboutPage?: boolean;
  hideSignIn?: boolean;
}

const Header = ({ isAboutPage = false, hideSignIn = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, loading, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isAdmin = userData?.user_role === 'admin';

  const handleCTAClick = () => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
          const isMobile = window.innerWidth < 768;
          const offset = 70;
          
          if (!isMobile) {
            smoothScrollTo(0, 1050);
            return;
          }

          const heroText = bookingForm.querySelector('h1');
          if (heroText) {
            const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
            smoothScrollTo(scrollPosition, 1050);
          }
        }
      }, 100);
    } else {
      const bookingForm = document.getElementById('booking-form');
      if (bookingForm) {
        const isMobile = window.innerWidth < 768;
        const offset = 70;
        
        if (!isMobile) {
          smoothScrollTo(0, 1050);
          return;
        }

        const heroText = bookingForm.querySelector('h1');
        if (heroText) {
          const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
          smoothScrollTo(scrollPosition, 1050);
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setShowUserMenu(false);
      setIsMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      setShowUserMenu(false);
      setIsMenuOpen(false);
      navigate('/');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserMenu && !target.closest('#user-menu-button') && !target.closest('#user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="md:hidden w-12 h-12" />

          <button 
            onClick={() => navigate('/')}
            className="flex items-center focus:outline-none h-[70px] py-[4px]"
          >
            <picture className="h-full w-auto">
              <source srcSet="https://i.imghippo.com/files/cDgm3025PmI.webp" type="image/webp" />
              <img
                src="https://i.imgur.com/991MInn.png"
                alt="Royal Transfer EU Logo PNG"
                className="h-full w-auto object-contain"
              />
            </picture>
          </button>
          
          <nav className="hidden md:flex space-x-6 lg:space-x-8">
            <a 
              href="/" 
              className="relative py-2 text-gray-700 group"
            >
              Home
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/about" 
              className="relative py-2 text-gray-700 group"
            >
              About Us
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/services" 
              className="relative py-2 text-gray-700 group"
            >
              Services
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/blogs/destinations" 
              className="relative py-2 text-gray-700 group"
            >
              Destinations
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/faq" 
              className="relative py-2 text-gray-700 group"
            >
              FAQs
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/partners" 
              className="relative py-2 text-gray-700 group"
            >
              Partners
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/rent" 
              className="relative py-2 text-gray-700 group"
            >
              Rent a Car
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/contact" 
              className="relative py-2 text-gray-700 group"
            >
              Contact
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {!hideSignIn && (
              loading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    id="user-menu-button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </button>
                  
                  {showUserMenu && (
                    <div 
                      id="user-menu"
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200"
                    >
                      <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b">
                        {userData?.name || 'User'}
                        {userData?.user_role && (
                          <div className="text-xs text-gray-500 capitalize">
                            {userData.user_role}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <Link 
                          to="/admin" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Admin Portal
                        </Link>
                      )}
                      <Link 
                        to="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Your Profile
                      </Link>
                      <Link 
                        to="/bookings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Your Bookings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a 
                  href="/login"
                  className="hidden md:inline-flex border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 box-border"
                >
                  Sign In
                </a>
              )
            )}
            <button 
              onClick={handleCTAClick}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-white z-40 md:hidden"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 right-3 w-12 h-12 flex items-center justify-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="w-6 h-6 relative">
                  <span className="absolute top-1/2 left-0 w-6 h-0.5 bg-gray-600 -translate-y-1/2 rotate-45"></span>
                  <span className="absolute top-1/2 left-0 w-6 h-0.5 bg-gray-600 -translate-y-1/2 -rotate-45"></span>
                </div>
              </motion.button>

              <div className="flex flex-col h-full">
                <div className="flex justify-center items-center p-4 border-b">
                  <img
                    src="https://i.imghippo.com/files/cDgm3025PmI.webp"
                    alt="Royal Transfer EU Logo"
                    className="h-[62px] w-auto object-contain"
                  />
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="flex flex-col space-y-4">
                    {[
                      { href: '/', label: 'Home' },
                      { href: '/about', label: 'About Us' },
                      { href: '/services', label: 'Services' },
                      { href: '/blogs/destinations', label: 'Destinations' },
                      { href: '/faq', label: 'FAQs' },
                      { href: '/partners', label: 'Partners' },
                      { href: '/rent', label: 'Rent a Car' },
                      { href: '/contact', label: 'Contact' }
                    ].map((link) => (
                      <div key={link.href} className="flex">
                        <a
                          href={link.href}
                          className="relative py-2 text-gray-700 group"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span>{link.label}</span>
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                        </a>
                      </div>
                    ))}
                    
                    {user && (
                      <>
                        {isAdmin && (
                          <div className="flex">
                            <a
                              href="/admin"
                              className="relative py-2 text-gray-700 group"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <span>Admin Portal</span>
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                          </div>
                        )}
                        <div className="flex">
                          <a
                            href="/profile"
                            className="relative py-2 text-gray-700 group"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>Your Profile</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                          </a>
                        </div>
                        <div className="flex">
                          <a
                            href="/bookings"
                            className="relative py-2 text-gray-700 group"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>Your Bookings</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </nav>

                <div className="p-4 border-t space-y-3">
                  {!hideSignIn && (
                    loading ? (
                      <div className="flex justify-center">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    ) : user ? (
                      <button
                        onClick={handleLogout}
                        className="block w-full border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 text-center box-border"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <a
                        href="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 text-center box-border"
                      >
                        Sign In
                      </a>
                    )
                  )}
                  <button 
                    onClick={handleCTAClick}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button 
        className="md:hidden fixed top-[22px] left-4 z-50 w-12 h-12 flex items-center justify-center"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <div className="w-6 h-4 relative flex flex-col justify-between">
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
        </div>
      </button>
    </header>
  );
};

export default Header;