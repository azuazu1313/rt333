import React, { createContext, useContext, useState } from 'react';
import { vehicles } from '../data/vehicles';

interface BookingState {
  step: 1 | 2 | 3;
  selectedVehicle: typeof vehicles[0];
  personalDetails: {
    title: 'mr' | 'ms';
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    phone: string;
    selectedExtras: Set<string>;
  };
  paymentDetails: {
    method: 'card' | 'cash';
    cardNumber?: string;
    expiryDate?: string;
    cvc?: string;
  };
}

interface BookingContextType {
  bookingState: BookingState;
  setBookingState: React.Dispatch<React.SetStateAction<BookingState>>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 1,
    selectedVehicle: vehicles[0],
    personalDetails: {
      title: 'mr',
      firstName: '',
      lastName: '',
      email: '',
      country: '',
      phone: '',
      selectedExtras: new Set()
    },
    paymentDetails: {
      method: 'card'
    }
  });

  return (
    <BookingContext.Provider value={{ bookingState, setBookingState }}>
      {children}
    </BookingContext.Provider>
  );
};