import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BookingLayout from '../../components/booking/BookingLayout';
import VehicleCard from '../../components/booking/VehicleCard';
import VehicleModal from '../../components/booking/VehicleModal';
import { vehicles } from '../../data/vehicles';

const Step1Vehicle = () => {
  const navigate = useNavigate();
  const { from, to, type, date, returnDate, passengers } = useParams();
  
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [modalVehicle, setModalVehicle] = useState<typeof vehicles[0] | null>(null);

  const handleNext = () => {
    const basePath = `/transfer/${from}/${to}/${type}/${date}`;
    const fullPath = returnDate
      ? `${basePath}/${returnDate}/${passengers}/details`
      : `${basePath}/${passengers}/details`;
    navigate(fullPath);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <BookingLayout
      currentStep={1}
      totalPrice={selectedVehicle.price}
      onNext={handleNext}
      onBack={handleBack}
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

export default Step1Vehicle;