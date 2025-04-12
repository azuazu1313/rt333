import React from 'react';
import { useParams } from 'react-router-dom';
import { useBooking } from '../contexts/BookingContext';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';

const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const { bookingState } = useBooking();

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