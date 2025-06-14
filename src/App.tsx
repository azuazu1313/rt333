import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/toaster';

// Import commonly used components directly
import { BookingProvider } from './contexts/BookingContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { useAnalytics } from './hooks/useAnalytics';
import { FeatureFlagProvider, useFeatureFlags } from './components/FeatureFlagProvider';
import { preloadImagesForRoute } from './utils/imagePreloader';

// Import feature flag bridge for cross-domain communication
import './utils/featureFlagBridge';

// Components that are needed on first render should not be lazy-loaded
import Header from './components/Header';
import CookieBanner from './components/ui/CookieBanner';

// Lazily load all pages to improve initial load time
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Services = lazy(() => import('./pages/Services'));
const Partners = lazy(() => import('./pages/Partners'));
const Login = lazy(() => import('./pages/Login'));
const Contact = lazy(() => import('./pages/Contact'));
const CustomerSignup = lazy(() => import('./pages/CustomerSignup'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogsDestinations = lazy(() => import('./pages/BlogsDestinations'));
const BookingFlow = lazy(() => import('./pages/BookingFlow'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
const BookingCancelled = lazy(() => import('./pages/BookingCancelled'));
const Profile = lazy(() => import('./pages/Profile'));
const Bookings = lazy(() => import('./pages/Bookings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Privacy = lazy(() => import('./pages/Privacy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));

// Optimized loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" aria-hidden="true" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Route observer component to handle page-specific classes and SEO updates
const RouteObserver = () => {
  const location = useLocation();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Update page-specific classes
    const isBookingPage = location.pathname.startsWith('/transfer/');
    document.documentElement.classList.toggle('booking-page', isBookingPage);
    
    // Track page transitions as events
    trackEvent('Navigation', 'Page Transition', location.pathname);
    
    // Update page title based on route
    updatePageTitle(location.pathname);
    
    // Preload images for the current route
    preloadImagesForRoute(location.pathname);

    return () => {
      document.documentElement.classList.remove('booking-page');
    };
  }, [location, trackEvent]);

  // Helper function to set appropriate page titles
  const updatePageTitle = (path: string) => {
    const baseTitle = 'Royal Transfer EU';
    let pageTitle = '';

    if (path === '/') {
      pageTitle = `${baseTitle} | Premium Airport Transfers & Taxi in Italy`;
    } else if (path.startsWith('/about')) {
      pageTitle = `About Us | ${baseTitle}`;
    } else if (path.startsWith('/services')) {
      pageTitle = `Our Services | ${baseTitle}`;
    } else if (path.startsWith('/blogs/destinations')) {
      pageTitle = `Popular Destinations | ${baseTitle}`;
    } else if (path.startsWith('/blogs')) {
      pageTitle = `Travel Blog | ${baseTitle}`;
    } else if (path.startsWith('/faq')) {
      pageTitle = `Frequently Asked Questions | ${baseTitle}`;
    } else if (path.startsWith('/partners')) {
      pageTitle = `Partner With Us | ${baseTitle}`;
    } else if (path.startsWith('/contact')) {
      pageTitle = `Contact Us | ${baseTitle}`;
    } else if (path.startsWith('/login')) {
      pageTitle = `Sign In | ${baseTitle}`;
    } else if (path.startsWith('/customer-signup')) {
      pageTitle = `Create Account | ${baseTitle}`;
    } else if (path.startsWith('/transfer')) {
      pageTitle = `Book Your Transfer | ${baseTitle}`;
    } else if (path.startsWith('/booking-success')) {
      pageTitle = `Booking Confirmed | ${baseTitle}`;
    } else if (path.startsWith('/profile')) {
      pageTitle = `Your Profile | ${baseTitle}`;
    } else if (path.startsWith('/bookings')) {
      pageTitle = `Your Bookings | ${baseTitle}`;
    } else if (path.startsWith('/privacy')) {
      pageTitle = `Privacy Policy | ${baseTitle}`;
    } else if (path.startsWith('/cookie-policy')) {
      pageTitle = `Cookie Policy | ${baseTitle}`;
    } else {
      pageTitle = `${baseTitle} | Premium Airport Transfers & Taxi Service`;
    }

    document.title = pageTitle;
  };

  return null;
};

// Protected route component with optimized loading
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { trackEvent } = useAnalytics();
  
  useEffect(() => {
    if (!loading && !user) {
      trackEvent('Authentication', 'Access Denied', 'Protected Route', 0, true);
    }
  }, [user, loading, trackEvent]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  // Use feature flags to determine if we should show the cookie banner
  const { flags } = useFeatureFlags();
  
  return (
    <>
      <RouteObserver />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home/transfer/:from/:to/:type/:date/:returnDate/:passengers/form" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/destinations" element={<BlogsDestinations />} />
          <Route path="/blogs/:city" element={<BlogPost />} />
          <Route path="/services" element={<Services />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/customer-signup" element={<CustomerSignup />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/booking-cancelled" element={<BookingCancelled />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/transfer/:from/:to/:type/:date/:returnDate/:passengers/form" 
            element={<BookingFlow />} 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {/* Conditionally render the CookieBanner based on the feature flag */}
      {flags.showCookieBanner && <CookieBanner />}
      
      {/* Toaster for displaying notifications */}
      <Toaster />
    </>
  );
}

// Wrapper component to provide analytics within Router context
const AppWithAuth = () => {
  const analytics = useAnalytics();
  
  return (
    <AuthProvider trackEvent={analytics.trackEvent} setUserId={analytics.setUserId}>
      <BookingProvider>
        <AppRoutes />
      </BookingProvider>
    </AuthProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <FeatureFlagProvider>
        <AppWithAuth />
      </FeatureFlagProvider>
    </BrowserRouter>
  );
}

export default App;