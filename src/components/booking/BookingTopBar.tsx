import React, { useState, useEffect } from 'react';
import { MapPin, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  if (!dateStr || dateStr === '0' || dateStr.length !== 6) return undefined;
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.slice(4, 6));
    
    // Create date at noon to avoid timezone issues
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
    // Validate the date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date from URL:', { dateStr, parsed: { year, month, day } });
      return undefined;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', { dateStr, error });
    return undefined;
  }
};

interface BookingTopBarProps {
  from: string;
  to: string;
  type: '1' | '2';
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
  const [formData, setFormData] = useState({
    from,
    to,
    type,
    departureDate: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: parseInt(passengers, 10)
  });

  const [displayPassengers, setDisplayPassengers] = useState(parseInt(passengers, 10));
  const [hasChanges, setHasChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(formData);
  const [savedFormData, setSavedFormData] = useState(formData);

  // Initialize values and sync with URL parameters
  useEffect(() => {
    const departureDate = parseDateFromUrl(date);
    const returnDateParsed = returnDate ? parseDateFromUrl(returnDate) : undefined;
    
    // Debug logging
    console.log('URL Parameters:', { type, date, returnDate });
    console.log('Parsed Dates:', { departureDate, returnDateParsed });

    const initialData = {
      from,
      to,
      type,
      departureDate: type === '1' ? departureDate : undefined,
      dateRange: type === '2' && departureDate ? {
        from: departureDate,
        to: returnDateParsed
      } : undefined,
      passengers: parseInt(passengers, 10)
    };

    // Debug logging
    console.log('Initial Form Data:', initialData);
    
    setFormData(initialData);
    setDisplayPassengers(parseInt(passengers, 10));
    setInitialFormData(initialData);
    setSavedFormData(initialData);
    setPickupValue(from, false);
    setDropoffValue(to, false);
  }, [from, to, type, date, returnDate, passengers]);

  // Check for changes against saved data
  useEffect(() => {
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(savedFormData);
    setHasChanges(hasFormChanges);
  }, [formData, savedFormData]);

  // Reset to saved data when changing steps without saving
  useEffect(() => {
    setFormData(savedFormData);
    setDisplayPassengers(parseInt(savedFormData.passengers.toString(), 10));
    setPickupValue(savedFormData.from, false);
    setDropoffValue(savedFormData.to, false);
  }, [currentStep]);

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

  const handleUpdateRoute = () => {
    if (!hasChanges) return;

    const encodedFrom = encodeURIComponent(formData.from.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(formData.to.toLowerCase().replace(/\s+/g, '-'));
    const tripType = formData.type;
    
    const departureDate = formData.type === '2' ? formData.dateRange?.from : formData.departureDate;
    const formattedDepartureDate = departureDate ? formatDateForUrl(departureDate) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = formData.type === '2' && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    const path = `/transfer/${encodedFrom}/${encodedTo}/${tripType}/${formattedDepartureDate}/${returnDateParam}/${formData.passengers}/form`;

    // Debug logging
    console.log('Updating Route:', {
      path,
      formData,
      dates: {
        departure: formattedDepartureDate,
        return: returnDateParam
      }
    });

    // Always navigate to step 1 when updating route
    navigate(path);

    // Save the current form data as the new saved state
    setSavedFormData(formData);
    setDisplayPassengers(formData.passengers);
    setHasChanges(false);
  };

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className={`flex-1 w-full md:w-auto grid grid-cols-1 ${type === '2' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
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
            {type === '2' ? (
              <div className="col-span-2">
                <DateRangePicker
                  dateRange={formData.dateRange}
                  onDateRangeChange={(dateRange) => setFormData(prev => ({ ...prev, dateRange }))}
                  placeholder="Select dates"
                />
              </div>
            ) : (
              <DatePicker
                date={formData.departureDate}
                onDateChange={(date) => setFormData(prev => ({ ...prev, departureDate: date }))}
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
  );
};

export default BookingTopBar;