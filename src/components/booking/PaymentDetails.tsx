import React, { useState, useEffect } from 'react';
import { ChevronDown, CreditCard, Banknote, Tag, UserCircle as LoaderCircle, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import BookingLayout from './BookingLayout';
import { supabase } from '../../lib/supabase';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';

// Initialize Stripe outside component to prevent re-initialization
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

// Payment form component using Stripe Elements
const StripePaymentForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    // Check payment status if returning from redirect
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        switch (paymentIntent.status) {
          case "succeeded":
            setMessage("Payment succeeded!");
            onSuccess(paymentIntent.id);
            break;
          case "processing":
            setMessage("Your payment is processing.");
            break;
          case "requires_payment_method":
            setMessage("Your payment was not successful, please try again.");
            break;
          default:
            setMessage("Something went wrong.");
            break;
        }
      }
    });
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-confirmation`,
        payment_method_data: {
          billing_details: {
            email: linkEmail || undefined
          }
        },
        save_payment_method: savePaymentMethod,
      },
      redirect: 'if_required',
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "An unexpected error occurred");
        onError(error.message || "Payment failed");
      } else {
        setMessage("An unexpected error occurred");
        onError("An unexpected error occurred");
      }
    } else {
      // Payment succeeded without redirect
      setMessage("Payment succeeded!");
      onSuccess("direct_payment");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Your email for Stripe Link
          </label>
          <div className="flex items-center text-gray-500 text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Secure connection
          </div>
        </div>
        <input
          type="email"
          value={linkEmail}
          onChange={(e) => setLinkEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enable easy checkout on future visits with Stripe Link
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Information
        </label>
        <PaymentElement 
          options={{
            paymentMethodOrder: ['link', 'card'],
            defaultValues: {
              billingDetails: {
                email: linkEmail
              }
            }
          }} 
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Billing Address
        </label>
        <AddressElement 
          options={{
            mode: 'billing',
          }} 
        />
      </div>

      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={savePaymentMethod}
            onChange={(e) => setSavePaymentMethod(e.target.checked)}
            className="h-4 w-4 text-black rounded"
          />
          <span className="ml-2 text-sm text-gray-600">
            Save my payment information for future purchases
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-3 rounded-md transition-colors ${
          isProcessing || !stripe
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800'
        } flex items-center justify-center`}
      >
        {isProcessing ? (
          <>
            <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay €{(amount/100).toFixed(2)}
          </>
        )}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.includes('succeeded') 
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        } flex items-center`}>
          {message.includes('succeeded') 
            ? <CheckCircle className="w-5 h-5 mr-2" />
            : <AlertCircle className="w-5 h-5 mr-2" />
          }
          {message}
        </div>
      )}
    </form>
  );
};

const PaymentDetails = () => {
  const { bookingState, setBookingState } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalActive, setIsModalActive] = useState(false);

  // Calculate totals
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
    ...(Array.from(bookingState.personalDetails?.selectedExtras || []).map(extraId => {
      const extra = extras.find(e => e.id === extraId);
      return {
        label: extra?.name || '',
        price: extra?.price || 0
      };
    }))
  ];

  const total = priceDetails.reduce((sum, item) => sum + item.price, 0);
  const totalInCents = Math.round(total * 100);

  // Create payment intent when component mounts and payment method is 'card'
  useEffect(() => {
    if (paymentMethod === 'card' && !clientSecret) {
      createPaymentIntent();
    }
  }, [paymentMethod]);

  const createPaymentIntent = async () => {
    if (!user) {
      setErrorMessage('You must be logged in to make a payment');
      return;
    }

    setPaymentStatus('loading');

    try {
      // Create payment intent via Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          amount: total,
          currency: 'eur',
          email: user.email,
          metadata: {
            userId: user.id,
            vehicleId: bookingState.selectedVehicle?.id,
            pickupLocation: bookingState.personalDetails?.pickup || '',
            dropoffLocation: bookingState.personalDetails?.dropoff || '',
            date: bookingState.personalDetails?.date || '',
            returnDate: bookingState.personalDetails?.returnDate || '',
            passengers: bookingState.personalDetails?.passengers || 1,
            extras: Array.from(bookingState.personalDetails?.selectedExtras || []),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setClientSecret(data.clientSecret);
      setPaymentStatus('idle');
    } catch (error) {
      console.error('Error creating payment intent:', error);
      setErrorMessage(error.message || 'Failed to initialize payment. Please try again.');
      setPaymentStatus('error');
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentStatus('success');
    
    // Create trip record in database
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user?.id,
            status: 'pending',
            estimated_price: total,
            datetime: new Date().toISOString(),
            // Add other trip details as needed
          }
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            trip_id: trip.id,
            user_id: user?.id,
            amount: total,
            payment_method: 'credit_card',
            status: 'completed',
            paid_at: new Date().toISOString()
          }
        ]);

      if (paymentError) throw paymentError;

      // Navigate to success page
      navigate('/booking-confirmation');
    } catch (error) {
      console.error('Error saving booking details:', error);
      setErrorMessage('Payment successful, but we had an issue saving your booking. Our team has been notified.');
    }
  };

  const handlePaymentError = (message: string) => {
    setErrorMessage(message);
    setPaymentStatus('error');
  };

  const handleCashBooking = async () => {
    // Create trip record in database
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            user_id: user?.id,
            status: 'pending',
            estimated_price: total,
            datetime: new Date().toISOString(),
            // Add other trip details as needed
          }
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      // Create payment record for cash payment (pending)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            trip_id: trip.id,
            user_id: user?.id,
            amount: total,
            payment_method: 'cash',
            status: 'pending'
          }
        ]);

      if (paymentError) throw paymentError;

      // Navigate to success page
      navigate('/booking-confirmation');
    } catch (error) {
      console.error('Error creating cash booking:', error);
      setErrorMessage('We had an issue processing your booking. Please try again.');
    }
  };

  // Only show the next step button for cash payments
  // For card payments, we use the Stripe submit button
  const showNextButton = paymentMethod === 'cash';
  
  return (
    <BookingLayout
      currentStep={3}
      totalPrice={total}
      onNext={handleCashBooking} // Only used for cash payments
      nextButtonText="Complete Booking"
      showNewsletter={true}
      modalOpen={isModalActive}
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
                  className="h-5 w-5 text-black"
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
                  className="h-5 w-5 text-black"
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
            <h2 className="text-xl font-semibold mb-4">Card Payment</h2>

            {paymentStatus === 'loading' && (
              <div className="flex justify-center items-center py-12">
                <LoaderCircle className="w-8 h-8 text-black animate-spin mr-3" />
                <span>Initializing payment...</span>
              </div>
            )}

            {paymentStatus === 'error' && errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {clientSecret && paymentStatus !== 'loading' && (
              <Elements 
                stripe={stripePromise} 
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#000000',
                    },
                  },
                }}
              >
                <StripePaymentForm 
                  amount={totalInCents} 
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            )}
            
            {/* Notice to use Pay button in form instead of Next */}
            {clientSecret && (
              <div className="mt-4 bg-yellow-50 p-3 rounded-md text-sm text-yellow-700 flex items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <p>Please use the payment button above to complete your booking. The "Next Step" button at the bottom will be disabled.</p>
              </div>
            )}
          </section>
        )}

        {/* Discount Code */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center text-black hover:text-gray-700"
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
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
              className="text-black hover:text-gray-700 flex items-center"
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
            By clicking {paymentMethod === 'cash' ? "'Complete Booking'" : "'Pay'"} you acknowledge that you have read and
            agree to our Terms & Conditions and Privacy Policy.
          </div>
        </section>
      </div>
    </BookingLayout>
  );
};

export default PaymentDetails;