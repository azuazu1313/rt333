import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BookingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add new route for pre-filled home search */}
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
          
          {/* Single Booking Flow Route */}
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