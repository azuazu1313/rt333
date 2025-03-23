import React, { useState } from 'react';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';
import VehicleCard from './VehicleCard';
import VehicleModal from './VehicleModal';
import { vehicles } from '../../data/vehicles';

const VehicleSelection = () => {
  const { bookingState, setBookingState } = useBooking();
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [modalVehicle, setModalVehicle] = useState<typeof vehicles[0] | null>(null);

  const handleNext = () => {
    setBookingState(prev => ({
      ...prev,
      step: 2,
      selectedVehicle
    }));
  };

  return (
    <BookingLayout
      currentStep={1}
      totalPrice={selectedVehicle.price}
      onNext={handleNext}
      nextButtonText="Next: Personal Details"
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Choose Your Vehicle</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              {...vehicle}
              isSelected={selectedVehicle.id === vehicle.id}
              onSelect={() => setSelectedVehicle(vehicle)}
              onLearnMore={() => setModalVehicle(vehicle)}
            />
          ))}
        </div>
      </div>

      {modalVehicle && (
        <VehicleModal
          isOpen={!!modalVehicle}
          onClose={() => setModalVehicle(null)}
          onSelect={() => setSelectedVehicle(modalVehicle)}
          vehicle={modalVehicle}
        />
      )}
    </BookingLayout>
  );
};

export default VehicleSelection;