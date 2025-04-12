import React, { useState } from 'react';
import { ChevronDown, CreditCard, Banknote, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';

const PaymentDetails = () => {
  const { bookingState, setBookingState } = useBooking();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);

  const handleBook = () => {
    setBookingState(prev => ({
      ...prev,
      step: 3,
      paymentDetails: {
        method: paymentMethod,
        discountCode
      }
    }));
    // Handle booking completion logic here
    console.log('Booking completed', bookingState);
  };

  const calculateTotal = () => {
    const basePrice = bookingState.selectedVehicle?.price || 0;
    const extrasTotal = Array.from(bookingState.personalDetails?.selectedExtras || [])
      .reduce((total, extraId) => {
        const extra = extras.find(e => e.id === extraId);
        return total + (extra?.price || 0);
      }, 0);
    return basePrice + extrasTotal;
  };

  // Mock extras for the example
  const extras = [
    { id: 'child-seat', name: 'Child Seat (0-3 years)', price: 5.00 },
    { id: 'infant-seat', name: 'Infant Seat (3-6 years)', price: 5.00 },
    { id: 'extra-stop', name: 'Extra Stop', price: 10.00 },
    { id: 'night-fee', name: 'Night Transfer Fee', price: 10.00 },
  ];

  const priceDetails = [
    { label: bookingState.selectedVehicle?.name || 'Vehicle Transfer', price: bookingState.selectedVehicle?.price || 0 },
    { label: 'Night Transfer Fee', price: 10.00 },
    ...(Array.from(bookingState.personalDetails?.selectedExtras || []).map(extraId => {
      const extra = extras.find(e => e.id === extraId);
      return {
        label: extra?.name || '',
        price: extra?.price || 0
      };
    }))
  ];

  const total = priceDetails.reduce((sum, item) => sum + item.price, 0);

  return (
    <BookingLayout
      currentStep={3}
      totalPrice={total}
      onNext={handleBook}
      nextButtonText="Complete Booking"
      showNewsletter={true}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Payment Details</h1>

        {/* Payment Method Selection */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose Payment Method</h2>
          
          <div className="space-y-4">
            <label className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="h-5 w-5 text-blue-600"
                />
                <CreditCard className="w-6 h-6 text-gray-500" />
                <div>
                  <div className="font-medium">Pay in full now</div>
                  <div className="text-sm text-gray-500">
                    Pay the total transfer service now
                  </div>
                </div>
              </div>
            </label>

            <label className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="h-5 w-5 text-blue-600"
                />
                <Banknote className="w-6 h-6 text-gray-500" />
                <div>
                  <div className="font-medium">Pay in cash</div>
                  <div className="text-sm text-gray-500">
                    Pay in cash to the driver at the time of the transfer
                  </div>
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Card Payment Form */}
        {paymentMethod === 'card' && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Card Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Discount Code */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <Tag className="w-5 h-5 mr-2" />
            Got a Discount Code?
          </button>

          <AnimatePresence>
            {showDiscount && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Price Breakdown */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Price Details</h2>
            <button
              onClick={() => setShowPriceDetails(!showPriceDetails)}
              className="text-blue-600 hover:text-blue-700 flex items-center"
            >
              {showPriceDetails ? 'Hide' : 'Show'} details
              <ChevronDown
                className={`w-5 h-5 ml-1 transform transition-transform ${
                  showPriceDetails ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <AnimatePresence>
            {showPriceDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 mb-4"
              >
                {priceDetails.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-600">
                    <span>{item.label}</span>
                    <span>€{item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-sm text-gray-500">
            By clicking 'Complete Booking' you acknowledge that you have read and
            agree to our Terms & Conditions and Privacy Policy.
          </div>
        </section>
      </div>
    </BookingLayout>
  );
};

export default PaymentDetails;