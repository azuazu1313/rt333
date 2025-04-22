import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooking } from '../contexts/BookingContext';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';

const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const { bookingState, setBookingState } = useBooking();
  const navigate = useNavigate();

  // Initialize booking state from URL parameters
  useEffect(() => {
    if (from && to && date) {
      setBookingState(prev => ({
        ...prev,
        from: decodeURIComponent(from.replace(/-/g, ' ')),
        to: decodeURIComponent(to.replace(/-/g, ' ')),
        isReturn: type === '2',
        departureDate: date,
        returnDate: returnDate !== '0' ? returnDate : undefined,
        passengers: parseInt(passengers || '1', 10)
      }));
    }
  }, [from, to, type, date, returnDate, passengers, setBookingState]);

  // Handle missing parameters
  useEffect(() => {
    if (!from || !to || !date) {
      navigate('/');
    }
  }, [from, to, date, navigate]);

  // Render the appropriate step based on context state
  const renderStep = () => {
    switch (bookingState.step) {
      case 1:
        return <VehicleSelection />;
      case 2:
        return <PersonalDetails />;
      case 3:
        return <PaymentDetails />;
      default:
        return <VehicleSelection />;
    }
  };

  return <div id="booking-flow-container">{renderStep()}</div>;
};

export default BookingFlow;