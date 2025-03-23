import React, { useState, useEffect } from 'react';
import { MapPin, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from '../ui/date-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';

const formatDateForUrl = (date: Date) => {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const parseDateFromUrl = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr === '0' || dateStr.length !== 6) {
    return undefined;
  }
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1;
    const day = parseInt(dateStr.slice(4, 6));
    
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
    if (isNaN(date.getTime())) {
      return undefined;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
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

  // Parse dates from URL strings
  const departureDate = parseDateFromUrl(date);
  const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;

  // Set initial state based on URL parameters
  const [isRoundTrip, setIsRoundTrip] = useState(type === '2');
  const [displayPassengers, setDisplayPassengers] = useState(parseInt(passengers, 10));
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValues, setOriginalValues] = useState({
    from,
    to,
    type,
    departureDate,
    returnDateParsed,
    passengers: parseInt(passengers, 10)
  });

  // Form data that will be updated by user interactions
  const [formData, setFormData] = useState({
    from,
    to,
    type: isRoundTrip ? '2' : '1',
    departureDate: isRoundTrip ? undefined : departureDate,
    dateRange: isRoundTrip ? {
      from: departureDate,
      to: returnDateParsed
    } as DateRange | undefined : undefined,
    passengers: parseInt(passengers, 10)
  });

  // Initialize Places autocomplete for locations
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

  // Update state when URL parameters change
  useEffect(() => {
    setIsRoundTrip(type === '2');
    setDisplayPassengers(parseInt(passengers, 10));
    
    setFormData({
      from,
      to,
      type: type === '2' ? '2' : '1',
      departureDate: type === '2' ? undefined : departureDate,
      dateRange: type === '2' ? {
        from: departureDate,
        to: returnDateParsed
      } : undefined,
      passengers: parseInt(passengers, 10)
    });

    setOriginalValues({
      from,
      to,
      type,
      departureDate,
      returnDateParsed,
      passengers: parseInt(passengers, 10)
    });

    setPickupValue(from, false);
    setDropoffValue(to, false);
    setHasChanges(false);
  }, [from, to, type, date, returnDate, passengers, departureDate, returnDateParsed]);

  // Check for changes to enable/disable the Update Route button
  useEffect(() => {
    const currentDateStr = formData.departureDate ? formatDateForUrl(formData.departureDate) : '';
    const currentReturnDateStr = formData.dateRange?.to ? formatDateForUrl(formData.dateRange.to) : '0';
    const currentType = isRoundTrip ? '2' : '1';
    
    const hasFormChanges = 
      formData.from !== originalValues.from ||
      formData.to !== originalValues.to ||
      formData.passengers !== originalValues.passengers ||
      currentType !== originalValues.type ||
      (isRoundTrip && (
        !formData.dateRange?.from ||
        !formData.dateRange?.to ||
        currentDateStr !== date ||
        currentReturnDateStr !== (returnDate || '0')
      )) ||
      (!isRoundTrip && currentDateStr !== date);

    setHasChanges(hasFormChanges);
  }, [formData, isRoundTrip, originalValues, date, returnDate]);

  const handlePickupSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setPickupValue(suggestion.description, false);
    clearPickupSuggestions();
    setFormData(prev => ({ ...prev, from: suggestion.description }));

    try {
      const results = await getGeocode({ address: suggestion.description });
      await getLatLng(results[0]);
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
      await getLatLng(results[0]);
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
      alert('Please select a date for your trip.');
      return;
    }
    
    const baseRoute = location.pathname.startsWith('/home') ? '/home/transfer' : '/transfer';
    const newType = isRoundTrip ? '2' : '1';
    const path = `${baseRoute}/${encodedFrom}/${encodedTo}/${newType}/${formattedDepartureDate}/${formattedReturnDate}/${formData.passengers}/form`;

    navigate(path);
  };

  return (
    <div className="relative">
      <div className="absolute -top-10 left-6">
        <div className="relative h-10 bg-white rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="flex h-full">
            <button
              className={`w-32 relative z-10 transition-colors ${
                isRoundTrip ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(true)}
            >
              Round Trip
            </button>
            <button
              className={`w-32 relative z-10 transition-colors ${
                !isRoundTrip ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(false)}
            >
              One Way
            </button>
            <div 
              className={`absolute inset-y-0 w-32 bg-blue-600 transition-transform duration-300 ${
                isRoundTrip ? 'left-0' : 'left-32'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 md:hidden">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="From"
                value={pickupValue}
                onChange={(e) => setPickupValue(e.target.value)}
                className="w-full pl-10 pr-4 h-[42px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="To"
                value={dropoffValue}
                onChange={(e) => setDropoffValue(e.target.value)}
                className="w-full pl-10 pr-4 h-[42px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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

            {isRoundTrip ? (
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

            <motion.button
              whileTap={{ scale: hasChanges ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`w-full py-2 rounded-lg transition-all duration-300 ${
                hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges}
            >
              Update Route
            </motion.button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="From"
                  value={pickupValue}
                  onChange={(e) => setPickupValue(e.target.value)}
                  className="w-full pl-10 pr-4 h-[42px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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

              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="To"
                  value={dropoffValue}
                  onChange={(e) => setDropoffValue(e.target.value)}
                  className="w-full pl-10 pr-4 h-[42px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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

              {isRoundTrip ? (
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