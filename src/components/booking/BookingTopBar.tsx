import React, { useState, useEffect } from 'react';
import { MapPin, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useNavigate, useLocation } from 'react-router-dom';
import { DatePicker } from '../ui/date-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';

const formatDateForUrl = (date: Date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const parseDateFromUrl = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr === '0' || dateStr.length !== 6) {
    console.log('[DEBUG] Invalid date string:', dateStr);
    return undefined;
  }
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1;
    const day = parseInt(dateStr.slice(4, 6));
    
    // Create date at noon to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
    // Final validation
    if (isNaN(date.getTime())) {
      console.log('[DEBUG] Invalid date timestamp');
      return undefined;
    }
    
    return date;
  } catch (error) {
    console.error('[DEBUG] Error parsing date:', { dateStr, error });
    return undefined;
  }
};

interface BookingTopBarProps {
  from: string;
  to: string;
  type: string;
  date: string;
  returnDate?: string;
  passengers: string;
  currentStep?: number;
}

const BookingTopBar: React.FC<BookingTopBarProps> = ({ 
  from, 
  to, 
  type, 
  date, 
  returnDate, 
  passengers, 
  currentStep = 1 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRoundTrip, setIsRoundTrip] = useState(type === '2');

  // Parse dates first
  const departureDate = parseDateFromUrl(date);
  const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;

  const [formData, setFormData] = useState({
    from,
    to,
    type,
    departureDate: isRoundTrip ? undefined : departureDate,
    dateRange: isRoundTrip ? {
      from: departureDate,
      to: returnDateParsed
    } as DateRange | undefined : undefined,
    passengers: parseInt(passengers, 10)
  });

  const [displayPassengers, setDisplayPassengers] = useState(parseInt(passengers, 10));
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize values and sync with URL parameters only once on mount or when URL params change
  useEffect(() => {
    setPickupValue(from, false);
    setDropoffValue(to, false);
    
    // Update form data when URL params change
    setFormData(prev => ({
      ...prev,
      from,
      to,
      type,
      departureDate: isRoundTrip ? undefined : departureDate,
      dateRange: isRoundTrip ? {
        from: departureDate,
        to: returnDateParsed
      } : undefined
    }));
  }, [from, to, type, isRoundTrip, departureDate, returnDateParsed]);

  // Check for changes against URL params
  useEffect(() => {
    const currentDateStr = formData.departureDate ? formatDateForUrl(formData.departureDate) : '';
    const currentReturnDateStr = formData.dateRange?.to ? formatDateForUrl(formData.dateRange.to) : '0';
    const currentType = isRoundTrip ? '2' : '1';
    
    const hasFormChanges = 
      formData.from !== from ||
      formData.to !== to ||
      formData.passengers !== parseInt(passengers, 10) ||
      currentType !== type ||
      (isRoundTrip && (
        !formData.dateRange ||
        currentDateStr !== date ||
        currentReturnDateStr !== returnDate
      )) ||
      (!isRoundTrip && currentDateStr !== date);

    setHasChanges(hasFormChanges);
  }, [formData, from, to, date, returnDate, passengers, type, isRoundTrip]);

  const {
    ready: pickupReady,
    value: pickupValue,
    suggestions: { status: pickupStatus, data: pickupSuggestions },
    setValue: setPickupValue,
    clearSuggestions: clearPickupSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: ['it', 'fr', 'es', 'de'] } },
    debounce: 300,
    defaultValue: from
  });

  const {
    ready: dropoffReady,
    value: dropoffValue,
    suggestions: { status: dropoffStatus, data: dropoffSuggestions },
    setValue: setDropoffValue,
    clearSuggestions: clearDropoffSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: ['it', 'fr', 'es', 'de'] } },
    debounce: 300,
    defaultValue: to
  });

  const handlePickupSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setPickupValue(suggestion.description, false);
    clearPickupSuggestions();
    setFormData(prev => ({ ...prev, from: suggestion.description }));

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      console.log('Pickup coordinates:', { lat, lng });
    } catch (error) {
      console.error('Error getting coordinates:', error);
    }
  };

  const handleDropoffSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setDropoffValue(suggestion.description, false);
    clearDropoffSuggestions();
    setFormData(prev => ({ ...prev, to: suggestion.description }));

    try {
      const results = await getGeocode({ address: suggestion.description });
      const { lat, lng } = await getLatLng(results[0]);
      console.log('Dropoff coordinates:', { lat, lng });
    } catch (error) {
      console.error('Error getting coordinates:', error);
    }
  };

  const handlePassengerChange = (increment: boolean) => {
    const newPassengers = increment ? formData.passengers + 1 : formData.passengers - 1;
    if (newPassengers >= 1 && newPassengers <= 100) {
      setFormData(prev => ({ ...prev, passengers: newPassengers }));
      setDisplayPassengers(newPassengers);
    }
  };

  const handleTripTypeChange = (roundTrip: boolean) => {
    setIsRoundTrip(roundTrip);
    setFormData(prev => ({
      ...prev,
      type: roundTrip ? '2' : '1',
      departureDate: roundTrip ? undefined : prev.dateRange?.from || prev.departureDate,
      dateRange: roundTrip ? {
        from: prev.departureDate || prev.dateRange?.from,
        to: prev.dateRange?.to
      } : undefined
    }));
  };

  const handleUpdateRoute = () => {
    if (!hasChanges) return;

    const encodedFrom = encodeURIComponent(formData.from.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(formData.to.toLowerCase().replace(/\s+/g, '-'));
    
    let formattedDepartureDate;
    let formattedReturnDate = '0';

    if (isRoundTrip && formData.dateRange) {
      if (!formData.dateRange.from || !formData.dateRange.to) {
        alert('Please select both departure and return dates for round trips.');
        return;
      }
      formattedDepartureDate = formatDateForUrl(formData.dateRange.from);
      formattedReturnDate = formatDateForUrl(formData.dateRange.to);
    } else if (!isRoundTrip && formData.departureDate) {
      formattedDepartureDate = formatDateForUrl(formData.departureDate);
    } else {
      formattedDepartureDate = date;
    }
    
    const baseRoute = location.pathname.startsWith('/home') ? '/home/transfer' : '/transfer';
    const newType = isRoundTrip ? '2' : '1';
    const path = `${baseRoute}/${encodedFrom}/${encodedTo}/${newType}/${formattedDepartureDate}/${formattedReturnDate}/${formData.passengers}/form`;

    navigate(path);
  };

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          {/* Trip Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-64">
            <button
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                isRoundTrip ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
              onClick={() => handleTripTypeChange(true)}
            >
              Round Trip
            </button>
            <button
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                !isRoundTrip ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
              onClick={() => handleTripTypeChange(false)}
            >
              One Way
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className={`flex-1 w-full md:w-auto grid grid-cols-1 ${isRoundTrip ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
              {/* From Location */}
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={pickupValue}
                  onChange={(e) => {
                    setPickupValue(e.target.value);
                    setFormData(prev => ({ ...prev, from: e.target.value }));
                  }}
                  disabled={!pickupReady}
                  className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white disabled:bg-gray-50 disabled:opacity-75"
                  placeholder="From"
                />
                {pickupStatus === "OK" && (
                  <ul className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                    {pickupSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        onClick={() => handlePickupSelect(suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {suggestion.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* To Location */}
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={dropoffValue}
                  onChange={(e) => {
                    setDropoffValue(e.target.value);
                    setFormData(prev => ({ ...prev, to: e.target.value }));
                  }}
                  disabled={!dropoffReady}
                  className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white disabled:bg-gray-50 disabled:opacity-75"
                  placeholder="To"
                />
                {dropoffStatus === "OK" && (
                  <ul className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                    {dropoffSuggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        onClick={() => handleDropoffSelect(suggestion)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {suggestion.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Date Selection */}
              {isRoundTrip ? (
                <div className="col-span-2">
                  <DateRangePicker
                    dateRange={formData.dateRange}
                    onDateRangeChange={(dateRange) => {
                      setFormData(prev => ({
                        ...prev,
                        dateRange,
                        departureDate: undefined
                      }));
                    }}
                    placeholder="Select dates"
                  />
                </div>
              ) : (
                <DatePicker
                  date={formData.departureDate}
                  onDateChange={(date) => {
                    setFormData(prev => ({
                      ...prev,
                      departureDate: date,
                      dateRange: undefined
                    }));
                  }}
                  placeholder="Select date"
                />
              )}

              {/* Passengers */}
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
                  <span className="text-gray-700 text-[12px]">
                    {displayPassengers} {' '}
                    Passenger{displayPassengers !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePassengerChange(false)}
                      className={`p-1 rounded-full transition-colors ${
                        formData.passengers > 1 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                      }`}
                      disabled={formData.passengers <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePassengerChange(true)}
                      className={`p-1 rounded-full transition-colors ${
                        formData.passengers < 100 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                      }`}
                      disabled={formData.passengers >= 100}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: hasChanges ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`px-6 py-2 rounded-lg transition-all duration-300 min-w-[120px] ${
                hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges}
            >
              Update Route
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTopBar;