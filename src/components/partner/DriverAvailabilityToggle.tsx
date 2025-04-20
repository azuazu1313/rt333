import React from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { Power } from 'lucide-react';

interface DriverAvailabilityToggleProps {
  isAvailable: boolean;
  onChange: (isAvailable: boolean) => void;
}

const DriverAvailabilityToggle: React.FC<DriverAvailabilityToggleProps> = ({ isAvailable, onChange }) => {
  const { toast } = useToast();
  
  const toggleAvailability = async () => {
    try {
      // Get the current driver record
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id, is_available')
        .eq('user_id', supabase.auth.getSession().then(res => res.data.session?.user?.id))
        .single();
      
      if (driverError) {
        console.error('Error fetching driver data:', driverError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not update availability. Please try again later.",
        });
        return;
      }
      
      // Update the driver availability
      if (driverData) {
        const newAvailability = !isAvailable;
        const { error: updateError } = await supabase
          .from('drivers')
          .update({ is_available: newAvailability })
          .eq('id', driverData.id);
          
        if (updateError) {
          console.error('Error updating availability:', updateError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to update your availability status.",
          });
          return;
        }
        
        // Update the local state
        onChange(newAvailability);
        
        toast({
          title: newAvailability ? "You're now available" : "You're now unavailable",
          description: newAvailability 
            ? "You'll be notified of new job assignments." 
            : "You won't receive new job assignments while unavailable."
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <button 
      onClick={toggleAvailability}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
        isAvailable 
          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/30' 
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      <Power size={16} className={isAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} />
      <span className="text-sm font-medium">{isAvailable ? 'Available' : 'Unavailable'}</span>
    </button>
  );
};

export default DriverAvailabilityToggle;