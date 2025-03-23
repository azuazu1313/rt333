import React, { useState } from 'react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import Newsletter from '../components/Newsletter';
import { Phone, Mail, MapPin, ArrowRight, MessageCircle, Building2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const WEBHOOK_URL = 'https://hook.eu1.make.com/abc123xyz456';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      alert('Thank you for your message! We will get back to you shortly.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      alert('Something went wrong. Please try again later.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAIChat = () => {
    // @ts-ignore - voiceflow is added via script
    if (window.voiceflow && window.voiceflow.chat) {
      // @ts-ignore
      window.voiceflow.chat.open();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-4xl font-bold mb-4">We'd Love to Hear from You!</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you have questions about our services, need assistance with a booking,
              or want to explore partnership opportunities, we're here to help.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Contact Information */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Phone</h3>
                      <p className="text-gray-600">+39 351 748 22 44</p>
                      <p className="text-sm text-gray-500">Available 24/7</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-gray-600">contact@royaltransfer.eu</p>
                      <p className="text-sm text-gray-500">Quick response guaranteed</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Address</h3>
                      <p className="text-gray-600">123 Transfer Street</p>
                      <p className="text-gray-600">EU 12345</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Business Hours</h3>
                      <p className="text-gray-600">24/7 Support Available</p>
                      <p className="text-sm text-gray-500">Office: Mon-Fri 9:00-18:00</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Leadership</h3>
                      <p className="text-gray-600">For Business Inquiries:</p>
                      <p className="text-sm text-gray-500">partnerships@royaltransfer.eu</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={openAIChat}
                    className="w-full bg-[#FFD166] text-white px-8 py-3 rounded-md hover:opacity-90 transition-all duration-300 flex items-center justify-center"
                  >
                    <MessageCircle className="w-6 h-6 mr-2" />
                    Chat with Us Now
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
                <p className="text-gray-600 mb-6">
                  Our 24/7 customer support team is ready to assist you with any urgent matters.
                </p>
                <a 
                  href="tel:+393517482244"
                  className="bg-blue-600 text-white text-[13px] md:text-xl px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Now: +39 351 748 22 44
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="booking">Booking Inquiry</option>
                    <option value="support">Customer Support</option>
                    <option value="partnership">Business Partnership</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  Send Message
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>By submitting this form, you agree to our{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                    Privacy Policy
                  </Link>
                </p>
              </div>

              {/* FAQ Link - Moved inside the form div */}
              <div className="mt-8 pt-8 border-t text-center">
                <h3 className="text-xl font-semibold mb-4">Looking for Quick Answers?</h3>
                <Link
                  to="/faq"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  Check our Frequently Asked Questions
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="bg-gray-50 py-0 mb-16">
          <Newsletter webhookUrl="https://hook.eu1.make.com/newsletter-signup" />
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default Contact;