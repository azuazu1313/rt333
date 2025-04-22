import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// Define our props interface
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
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const initializeGoogleMapsElement = async () => {
      if (!containerRef.current) return;
      
      // Check if Google Maps API is loaded
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API not loaded');
        return;
      }

      setIsLoading(true);

      try {
        // Load the Places library
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places") as any;
        
        // Create the element
        const autocomplete = new PlaceAutocompleteElement({
          requestedLanguage: "en"
        });

        // Add event listener for the place select event
        autocomplete.addEventListener('gmp-select', (e: any) => {
          if (e && e.placePrediction) {
            // Convert the prediction to a place, which returns a Promise
            e.placePrediction.toPlace().then((place: any) => {
              // Get the most accurate representation of the selected place
              const selectedValue = place.formattedAddress || place.displayName || place.name;
              console.log('Place selected:', selectedValue);
              
              // Update with the full place name/address
              onChange(selectedValue);
            }).catch((error: any) => {
              console.error('Error converting prediction to place:', error);
            });
          }
        });
        
        // Add error listener
        autocomplete.addEventListener('gmp-error', (e: any) => {
          console.error('Google Places Autocomplete error:', e);
        });

        // Clear the container and append the new element
        if (containerRef.current) {
          // Remove any existing element
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          
          containerRef.current.appendChild(autocomplete);
          
          // Store reference to the autocomplete element
          autocompleteRef.current = autocomplete;
          
          // Find the input element inside the autocomplete element
          const input = autocomplete.querySelector('input');
          if (input) {
            setInputElement(input);
            
            // Monitor input value changes to keep our state in sync with manually typed input
            input.addEventListener('input', (e: Event) => {
              const target = e.target as HTMLInputElement;
              if (target && target.value !== value) {
                onChange(target.value);
              }
            });
            
            // Apply additional styling to input
            input.className = "w-full h-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600";
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Google Maps Places Autocomplete:', error);
        setIsLoading(false);
      }
    };

    initializeGoogleMapsElement();

    // Cleanup function
    return () => {
      if (autocompleteRef.current && containerRef.current) {
        containerRef.current.removeChild(autocompleteRef.current);
      }
    };
  }, [onChange]);

  // Set the value on the input element when it changes
  useEffect(() => {
    if (inputElement && inputElement.value !== value) {
      inputElement.value = value;
    }
  }, [value, inputElement]);

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
      
      <div 
        ref={containerRef} 
        className="w-full h-[42px]"
        data-placeholder={placeholder}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-3 z-10">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}
