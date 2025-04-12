import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, ArrowRight, Minus, Plus } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from './ui/date-picker';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';

const formatDateForUrl = (date: Date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const parseDateFromUrl = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr.length !== 6) return undefined;
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.slice(4, 6));
    
    const date = new Date(year, month, day);
    
    // Validate the date is valid
    if (isNaN(date.getTime())) {
      return undefined;
    }
    
    // Set to noon to avoid timezone issues
    date.setHours(12, 0, 0, 0);
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return undefined;
  }
};

const SearchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Store original values for comparison and restoration
  const originalValuesRef = useRef({
    isReturn: true,
    pickup: '',
    dropoff: '',
    departureDate: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: 1
  });

  // Current form state
  const [isReturn, setIsReturn] = useState(true);
  const [passengers, setPassengers] = useState(1);
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    departureDate: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined
  });

  // Initialize form data from URL if coming from booking flow
  useEffect(() => {
    // Check if we're on the pre-filled home route
    if (location.pathname.startsWith('/home/transfer/')) {
      const { from, to, type, date, returnDate, passengers: passengerCount } = params;
      
      if (from && to && type && date) {
        // Convert type to boolean flag - '1' means One Way (isReturn = false)
        const isRoundTrip = type === '2';
        setIsReturn(isRoundTrip);
        setPassengers(Math.max(1, parseInt(passengerCount || '1', 10)));
        
        const departureDate = parseDateFromUrl(date);
        const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;
        
        const newFormData = {
          pickup: decodeURIComponent(from.replace(/-/g, ' ')),
          dropoff: decodeURIComponent(to.replace(/-/g, ' ')),
          departureDate: isRoundTrip ? undefined : departureDate,
          dateRange: isRoundTrip ? {
            from: departureDate,
            to: returnDateParsed
          } : undefined
        };

        setFormData(newFormData);

        // Store original values for comparison
        originalValuesRef.current = {
          isReturn: isRoundTrip,
          pickup: newFormData.pickup,
          dropoff: newFormData.dropoff,
          departureDate: newFormData.departureDate,
          dateRange: newFormData.dateRange,
          passengers: Math.max(1, parseInt(passengerCount || '1', 10))
        };
      }
    }
  }, [location.pathname, params]);

  const handlePickupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, pickup: e.target.value }));
  };

  const handleDropoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, dropoff: e.target.value }));
  };

  const handlePassengerChange = (increment: boolean) => {
    setPassengers(prev => Math.max(1, Math.min(100, increment ? prev + 1 : prev - 1)));
  };

  const handleTripTypeChange = (oneWay: boolean) => {
    const newIsReturn = !oneWay;
    
    // If we're toggling back to the original trip type without saving changes,
    // restore the original values
    if (newIsReturn === originalValuesRef.current.isReturn) {
      setIsReturn(newIsReturn);
      setFormData({
        ...formData,
        departureDate: originalValuesRef.current.departureDate,
        dateRange: originalValuesRef.current.dateRange
      });
      return;
    }
    
    setIsReturn(newIsReturn);
    
    if (newIsReturn) {
      // If switching to round trip
      setFormData(prev => ({
        ...prev,
        departureDate: undefined,
        dateRange: prev.departureDate ? {
          from: prev.departureDate,
          to: undefined
        } : undefined
      }));
    } else {
      // If switching to one way
      setFormData(prev => ({
        ...prev,
        // Use the departure date from the date range if it exists
        departureDate: prev.dateRange?.from || prev.departureDate,
        dateRange: undefined
      }));
    }
  };

  const handleSubmit = () => {
    const pickup = formData.pickup;
    const dropoff = formData.dropoff;
    
    if (!pickup || !dropoff || (!formData.departureDate && !formData.dateRange?.from)) {
      alert('Please fill in all required fields');
      return;
    }

    if (isReturn && !formData.dateRange?.to) {
      alert('Please select a return date for round trips');
      return;
    }

    const encodedPickup = encodeURIComponent(pickup.toLowerCase().replace(/\s+/g, '-'));
    const encodedDropoff = encodeURIComponent(dropoff.toLowerCase().replace(/\s+/g, '-'));
    
    // Important: Type is '1' for One Way, '2' for Round Trip 
    const type = isReturn ? '2' : '1';
    
    const departureDate = isReturn ? formData.dateRange?.from : formData.departureDate;
    const formattedDepartureDate = departureDate ? formatDateForUrl(departureDate) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = isReturn && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    const path = `/transfer/${encodedPickup}/${encodedDropoff}/${type}/${formattedDepartureDate}/${returnDateParam}/${passengers}/form`;
    
    // Update original values to match the new state
    originalValuesRef.current = {
      isReturn,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      departureDate: formData.departureDate,
      dateRange: formData.dateRange,
      passengers
    };
    
    navigate(path);
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full">
      <div className="flex flex-col space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 text-center rounded-lg transition-colors ${
              isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
            }`}
            onClick={() => handleTripTypeChange(false)}
          >
            Round Trip
          </button>
          <button
            className={`flex-1 py-2 text-center rounded-lg transition-colors ${
              !isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
            }`}
            onClick={() => handleTripTypeChange(true)}
          >
            One Way
          </button>
        </div>

        <div className="space-y-6">
          {/* Pickup Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pickup location"
              value={formData.pickup}
              onChange={handlePickupChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Dropoff Location */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Dropoff location"
              value={formData.dropoff}
              onChange={handleDropoffChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Date Selection */}
          {isReturn ? (
            <DateRangePicker
              dateRange={formData.dateRange}
              onDateRangeChange={(dateRange) => setFormData(prev => ({
                ...prev,
                dateRange,
                departureDate: undefined
              }))}
              placeholder="Select departure & return dates"
            />
          ) : (
            <DatePicker
              date={formData.departureDate}
              onDateChange={(date) => setFormData(prev => ({
                ...prev,
                departureDate: date,
                dateRange: undefined
              }))}
              placeholder="Select departure date"
            />
          )}

          {/* Passengers */}
          <div className="relative flex items-center">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <div className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md flex justify-between items-center">
              <span className="text-gray-700">{passengers} Passenger{passengers !== 1 ? 's' : ''}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePassengerChange(false)}
                  className={`p-1 rounded-full transition-colors ${
                    passengers > 1 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                  }`}
                  disabled={passengers <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePassengerChange(true)}
                  className={`p-1 rounded-full transition-colors ${
                    passengers < 100 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                  }`}
                  disabled={passengers >= 100}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button 
          className="w-full py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 flex items-center justify-center space-x-2" 
          onClick={handleSubmit}
        >
          <span>See Prices</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SearchForm;