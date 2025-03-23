import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
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
      console.error('Error parsing date: Invalid date');
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
  
  // Flag to prevent re-initializing values after first setup
  const initializedRef = useRef(false);
  const isInitialRenderRef = useRef(true);

  // Parse dates from URL strings
  const departureDate = parseDateFromUrl(date);
  const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;

  // Explicitly check if type is '1' for One Way (ensures proper toggle selection)
  const [isOneWay, setIsOneWay] = useState(type === '1');
  const [displayPassengers, setDisplayPassengers] = useState(parseInt(passengers, 10));
  const [hasChanges, setHasChanges] = useState(false);
  
  // Input field states
  const [pickupValue, setPickupValue] = useState(from);
  const [dropoffValue, setDropoffValue] = useState(to);
  
  // Store original URL values for comparison
  const originalValuesRef = useRef({
    from,
    to,
    type,
    date,
    returnDate: returnDate || '0',
    passengers: parseInt(passengers, 10)
  });

  // Form data that will be updated by user interactions
  const [formData, setFormData] = useState({
    from,
    to,
    type,
    departureDate: isOneWay ? departureDate : undefined,
    dateRange: !isOneWay ? {
      from: departureDate,
      to: returnDateParsed
    } as DateRange | undefined : undefined,
    passengers: parseInt(passengers, 10)
  });

  // Initialize component only once on mount
  useEffect(() => {
    // Only initialize if not already done
    if (!initializedRef.current) {
      console.log("Initializing BookingTopBar with type:", type, "isOneWay should be:", type === '1');
      
      const isUrlOneWay = type === '1';
      setIsOneWay(isUrlOneWay);
      setDisplayPassengers(parseInt(passengers, 10));
      
      // Store original values for change detection
      originalValuesRef.current = {
        from,
        to,
        type,
        date,
        returnDate: returnDate || '0',
        passengers: parseInt(passengers, 10)
      };
      
      // Initialize location inputs
      setPickupValue(from);
      setDropoffValue(to);
      
      // Explicitly set hasChanges to false on initialization
      setHasChanges(false);
      
      // Mark as initialized
      initializedRef.current = true;
    }
  // Don't include form state dependencies to prevent re-initialization
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, type, date, returnDate, passengers]);

  // Detect changes to enable/disable Update Route button
  useEffect(() => {
    // Skip the initial render to prevent false "changes" detection
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }

    if (!initializedRef.current) return;

    const formType = isOneWay ? '1' : '2';
    const formDepartureDateStr = formData.departureDate ? formatDateForUrl(formData.departureDate) : '';
    const formReturnDateStr = formData.dateRange?.to ? formatDateForUrl(formData.dateRange.to) : '0';
    
    // More precise comparison of values to detect actual changes
    const hasFormChanges = 
      pickupValue !== originalValuesRef.current.from ||
      dropoffValue !== originalValuesRef.current.to ||
      formData.passengers !== originalValuesRef.current.passengers ||
      formType !== originalValuesRef.current.type ||
      (isOneWay && formDepartureDateStr && formDepartureDateStr !== originalValuesRef.current.date) ||
      (!isOneWay && formData.dateRange?.from && formData.dateRange?.to && 
        (formatDateForUrl(formData.dateRange.from) !== originalValuesRef.current.date || 
         formReturnDateStr !== originalValuesRef.current.returnDate));
    
    // Only update state if there's an actual change to minimize re-renders
    if (hasChanges !== hasFormChanges) {
      setHasChanges(hasFormChanges);
    }
  }, [pickupValue, dropoffValue, formData, isOneWay, hasChanges]);

  const handlePassengerChange = (increment: boolean) => {
    const newPassengers = increment ? formData.passengers + 1 : formData.passengers - 1;
    if (newPassengers >= 1 && newPassengers <= 100) {
      setFormData(prev => ({ ...prev, passengers: newPassengers }));
      setDisplayPassengers(newPassengers);
    }
  };

  const handleTripTypeChange = (oneWay: boolean) => {
    setIsOneWay(oneWay);
    
    setFormData(prev => {
      // When switching to one way
      if (oneWay) {
        return {
          ...prev,
          type: '1',
          departureDate: prev.dateRange?.from || prev.departureDate,
          dateRange: undefined
        };
      } 
      // When switching to round trip
      else {
        return {
          ...prev,
          type: '2',
          departureDate: undefined,
          dateRange: {
            from: prev.departureDate || prev.dateRange?.from,
            to: prev.dateRange?.to || undefined
          }
        };
      }
    });
  };

  const handleUpdateRoute = () => {
    if (!hasChanges) return;

    // Get values from current state
    const encodedFrom = encodeURIComponent(pickupValue.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(dropoffValue.toLowerCase().replace(/\s+/g, '-'));
    
    let formattedDepartureDate;
    let formattedReturnDate = '0';

    if (!isOneWay && formData.dateRange) {
      if (!formData.dateRange.from || !formData.dateRange.to) {
        alert('Please select both departure and return dates for round trips.');
        return;
      }
      formattedDepartureDate = formatDateForUrl(formData.dateRange.from);
      formattedReturnDate = formatDateForUrl(formData.dateRange.to);
    } else if (isOneWay && formData.departureDate) {
      formattedDepartureDate = formatDateForUrl(formData.departureDate);
    } else {
      alert('Please select a date for your trip.');
      return;
    }
    
    const baseRoute = location.pathname.startsWith('/home') ? '/home/transfer' : '/transfer';
    const newType = isOneWay ? '1' : '2';
    const path = `${baseRoute}/${encodedFrom}/${encodedTo}/${newType}/${formattedDepartureDate}/${formattedReturnDate}/${formData.passengers}/form`;

    // Save the new values as original values to reset change detection
    originalValuesRef.current = {
      from: pickupValue,
      to: dropoffValue,
      type: newType,
      date: formattedDepartureDate,
      returnDate: formattedReturnDate,
      passengers: formData.passengers
    };

    // Reset change detection before navigation
    setHasChanges(false);
    
    navigate(path);
  };

  return (
    <div className="relative">
      <div className="absolute -top-10 left-6">
        <div className="relative h-10 bg-white rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="flex h-full">
            <button
              className={`w-32 relative z-10 transition-colors ${
                !isOneWay ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(false)}
            >
              Round Trip
            </button>
            <button
              className={`w-32 relative z-10 transition-colors ${
                isOneWay ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(true)}
            >
              One Way
            </button>
            <div 
              className={`absolute inset-y-0 w-32 bg-blue-600 transition-transform duration-300 ${
                isOneWay ? 'left-32' : 'left-0'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile View */}
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
            </div>

            {isOneWay ? (
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
            ) : (
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
                className="w-full"
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

          {/* Desktop View */}
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
              </div>

              {isOneWay ? (
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
              ) : (
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
                  className="col-span-1"
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