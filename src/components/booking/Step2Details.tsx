import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import BookingLayout from '../../components/booking/BookingLayout';

interface Extra {
  id: string;
  name: string;
  price: number;
}

const extras: Extra[] = [
  { id: 'child-seat', name: 'Child Seat (0-3 years)', price: 5.00 },
  { id: 'infant-seat', name: 'Infant Seat (3-6 years)', price: 5.00 },
  { id: 'booster-seat', name: 'Booster Seat (6-12 years)', price: 5.00 },
  { id: 'extra-stop', name: 'Extra Stop', price: 10.00 },
  { id: 'ski-snowboard', name: 'Ski/Snowboard Equipment', price: 15.00 },
  { id: 'bicycle', name: 'Bicycle Transport', price: 15.00 },
  { id: 'wheelchair', name: 'Wheelchair Accessible', price: 0.00 }
];

const Step2Details = () => {
  const navigate = useNavigate();
  const { from, to, type, date, returnDate, passengers } = useParams();

  const [formData, setFormData] = useState({
    title: 'mr',
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    phone: '',
    selectedExtras: new Set<string>()
  });

  const handleExtraToggle = (extraId: string) => {
    const newExtras = new Set(formData.selectedExtras);
    if (newExtras.has(extraId)) {
      newExtras.delete(extraId);
    } else {
      newExtras.add(extraId);
    }
    setFormData({ ...formData, selectedExtras: newExtras });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const calculateTotal = () => {
    const basePrice = 999.79; // This should come from the selected vehicle
    const extrasTotal = Array.from(formData.selectedExtras).reduce((total, extraId) => {
      const extra = extras.find(e => e.id === extraId);
      return total + (extra?.price || 0);
    }, 0);
    return basePrice + extrasTotal;
  };

  const handleNext = () => {
    const basePath = `/transfer/${from}/${to}/${type}/${date}`;
    const fullPath = returnDate
      ? `${basePath}/${returnDate}/${passengers}/payment`
      : `${basePath}/${passengers}/payment`;
    navigate(fullPath);
  };

  return (
    <BookingLayout
      currentStep={2}
      totalPrice={calculateTotal()}
      onNext={handleNext}
      nextButtonText="Next: Payment Details"
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Transfer & Personal Details</h1>

        {/* Equipment & Extras */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Equipment & Extras</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extras.map((extra) => (
              <label
                key={extra.id}
                className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.selectedExtras.has(extra.id)}
                  onChange={() => handleExtraToggle(extra.id)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium">{extra.name}</div>
                  <div className="text-sm text-gray-500">
                    {extra.price > 0 ? `€${extra.price.toFixed(2)}` : 'Free'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Personal Details */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
          
          <div className="space-y-6">
            {/* Title Selection */}
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="title"
                  value="mr"
                  checked={formData.title === 'mr'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600"
                />
                <span>Mr.</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="title"
                  value="ms"
                  checked={formData.title === 'ms'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600"
                />
                <span>Ms.</span>
              </label>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            {/* Country & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Select a country</option>
                  <option value="IT">Italy</option>
                  <option value="FR">France</option>
                  <option value="ES">Spain</option>
                  <option value="DE">Germany</option>
                  <option value="UK">United Kingdom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                  <div className="absolute right-3 top-2">
                    <Info className="w-5 h-5 text-gray-400" title="We'll only contact you about your transfer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </BookingLayout>
  );
};

export default Step2Details;