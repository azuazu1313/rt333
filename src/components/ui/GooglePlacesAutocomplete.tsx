import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder,
  className = ''
}: GooglePlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Flag to prevent onChange being called redundantly during place selection
  const isSelectingRef = useRef(false);

  // Initialize the autocomplete when the component mounts
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;
      
      // Clear any existing autocomplete
      if (placesListenerRef.current && autocompleteRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      setIsLoading(true);

      try {
        // Create a new Autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['geocode', 'establishment'], // Allow both addresses and business names
            fields: ['formatted_address', 'geometry', 'name', 'address_components'],
          }
        );

        // Add listener for place selection
        placesListenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place) {
            isSelectingRef.current = true;
            
            // Get the formatted address or name as fallback
            let selectedValue = place.formatted_address || place.name || '';
            
            // Update the parent component state
            onChange(selectedValue);
            
            // Reset the selecting flag after a short delay to allow React to process the state update
            setTimeout(() => {
              isSelectingRef.current = false;
            }, 100);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize when Google Maps API is available
    if (window.google?.maps?.places) {
      initializeAutocomplete();
    } else {
      // Poll for Google Maps API availability
      const checkGoogleMapsLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleMapsLoaded);
          initializeAutocomplete();
        }
      }, 100);

      // Clean up interval
      return () => clearInterval(checkGoogleMapsLoaded);
    }

    return () => {
      // Clean up listeners when component unmounts
      if (placesListenerRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
      }
      
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []); // Only run on mount

  // Handle input changes from user typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only propagate changes if not in the middle of a place selection
    if (!isSelectingRef.current) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`
          w-full pl-10 pr-${isLoading ? '10' : '4'} py-2 
          border border-gray-200 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-600 
          h-[42px] transition-all
          ${isFocused ? 'border-blue-300' : ''}
        `}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
