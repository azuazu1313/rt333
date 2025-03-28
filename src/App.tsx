import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import FAQ from './pages/FAQ';
import BlogPost from './pages/BlogPost';
import Services from './pages/Services';
import Partners from './pages/Partners';
import Login from './pages/Login';
import Contact from './pages/Contact';
import CustomerSignup from './pages/CustomerSignup';
import Blogs from './pages/Blogs';
import BlogsDestinations from './pages/BlogsDestinations';
import BookingFlow from './pages/BookingFlow';
import { BookingProvider } from './contexts/BookingContext';

// Route observer component to handle page-specific classes
const RouteObserver = () => {
  const location = useLocation();

  useEffect(() => {
    const isBookingPage = location.pathname.startsWith('/transfer/');
    document.documentElement.classList.toggle('booking-page', isBookingPage);
    
    return () => {
      document.documentElement.classList.remove('booking-page');
    };
  }, [location]);

  return null;
};

function App() {
  return (
    <BookingProvider>
      <BrowserRouter>
        <RouteObserver />
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
          <Route 
            path="/transfer/:from/:to/:type/:date/:returnDate/:passengers/form" 
            element={<BookingFlow />} 
          />
        </Routes>
      </BrowserRouter>
    </BookingProvider>
  );
}

export default App;