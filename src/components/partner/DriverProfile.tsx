import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { User, Phone, Award, Star, MapPin, AtSign, Car, Loader2, Save, AlertCircle } from 'lucide-react';

interface DriverData {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  created_at: string;
  license_number?: string;
  avg_rating?: number;
  total_trips?: number;
  completed_trips?: number;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: string | number;
    color: string;
    plate_number: string;
    capacity: number;
  };
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

const DriverProfile: React.FC = () => {
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    vehicle_plate: '',
    vehicle_capacity: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { userData, refreshSession } = useAuth();

  useEffect(() => {
    fetchDriverData();
  }, [userData]);

  const fetchDriverData = async () => {
    try {
      setLoading(true);

      // Fetch driver data including vehicle and user info
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, color, plate_number, capacity),
          user:users!drivers_user_id_fkey(name, email, phone)
        `)
        .eq('user_id', userData?.id)
        .single();

      if (error) throw error;

      setDriver(data);

      // Initialize form data with fetched data
      if (data) {
        setFormData({
          name: data.user?.name || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          license_number: data.license_number || '',
          vehicle_make: data.vehicle?.[0]?.make || '',
          vehicle_model: data.vehicle?.[0]?.model || '',
          vehicle_year: data.vehicle?.[0]?.year?.toString() || '',
          vehicle_color: data.vehicle?.[0]?.color || '',
          vehicle_plate: data.vehicle?.[0]?.plate_number || '',
          vehicle_capacity: data.vehicle?.[0]?.capacity?.toString() || '',
        });
      }

    } catch (error: any) {
      console.error('Error fetching driver data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load your profile data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when the user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";

    // Only validate vehicle fields if vehicle exists
    if (driver?.vehicle) {
      if (!formData.vehicle_make.trim()) newErrors.vehicle_make = "Make is required";
      if (!formData.vehicle_model.trim()) newErrors.vehicle_model = "Model is required";
      if (!formData.vehicle_plate.trim()) newErrors.vehicle_plate = "Plate number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please check the form for errors.",
      });
      return;
    }

    try {
      setSaving(true);

      // Update user information
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        })
        .eq('id', userData?.id);

      if (userError) throw userError;

      // Update driver information
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          license_number: formData.license_number,
        })
        .eq('id', driver?.id);

      if (driverError) throw driverError;

      // Update vehicle information if available
      if (driver?.vehicle?.[0]?.id) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({
            make: formData.vehicle_make,
            model: formData.vehicle_model,
            year: formData.vehicle_year,
            color: formData.vehicle_color,
            plate_number: formData.vehicle_plate,
            capacity: parseInt(formData.vehicle_capacity) || 4,
          })
          .eq('id', driver.vehicle[0].id);

        if (vehicleError) throw vehicleError;
      }

      // Refresh session to update JWT claims if email changed
      await refreshSession();

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      });

      // Refresh driver data
      await fetchDriverData();
      
      // Exit edit mode
      setEditMode(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update your profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Driver Profile Not Found</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Your driver profile hasn't been set up yet. Please contact support for assistance.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-xl font-bold dark:text-white">Driver Profile</h1>
        
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Edit Profile
          </button>
        ) : (
          <button
            onClick={() => setEditMode(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border dark:border-gray-700">
        {!editMode ? (
          /* View Mode */
          <>
            {/* Header with rating */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-3 sm:mb-0">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {driver.user?.name || 'Driver'}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <AtSign className="h-4 w-4 mr-1" />
                  {driver.user?.email}
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <Star className="h-5 w-5 text-yellow-400 mr-1" />
                  <span className="font-medium text-gray-800 dark:text-gray-200">{driver.avg_rating || 'N/A'}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                  {driver.total_trips || 0} trips completed
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex">
                      <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                        <p className="text-md font-medium text-gray-900 dark:text-white">{driver.user?.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                        <p className="text-md font-medium text-gray-900 dark:text-white">{driver.user?.phone || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex">
                      <Award className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">License Number</p>
                        <p className="text-md font-medium text-gray-900 dark:text-white">{driver.license_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Vehicle Information</h3>
                  
                  {driver.vehicle?.[0] ? (
                    <div className="space-y-4">
                      <div className="flex">
                        <Car className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Vehicle</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white">
                            {driver.vehicle[0].make} {driver.vehicle[0].model}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {driver.vehicle[0].year} · {driver.vehicle[0].color}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">License Plate</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white">{driver.vehicle[0].plate_number}</p>
                        </div>
                      </div>
                      
                      <div className="flex">
                        <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
                          <p className="text-md font-medium text-gray-900 dark:text-white">{driver.vehicle[0].capacity} passengers</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        No vehicle information available. Please contact support to register your vehicle.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit} className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Profile Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Personal Information</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.phone ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.phone && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                        errors.license_number ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    {errors.license_number && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.license_number}</p>}
                  </div>
                </div>
              </div>
              
              {/* Vehicle Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Vehicle Information</h4>
                
                {driver.vehicle?.[0] ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Make
                        </label>
                        <input
                          type="text"
                          name="vehicle_make"
                          value={formData.vehicle_make}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                            errors.vehicle_make ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {errors.vehicle_make && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.vehicle_make}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          name="vehicle_model"
                          value={formData.vehicle_model}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                            errors.vehicle_model ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {errors.vehicle_model && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.vehicle_model}</p>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Year
                        </label>
                        <input
                          type="text"
                          name="vehicle_year"
                          value={formData.vehicle_year}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Color
                        </label>
                        <input
                          type="text"
                          name="vehicle_color"
                          value={formData.vehicle_color}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          License Plate
                        </label>
                        <input
                          type="text"
                          name="vehicle_plate"
                          value={formData.vehicle_plate}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-md ${
                            errors.vehicle_plate ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {errors.vehicle_plate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.vehicle_plate}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Capacity
                        </label>
                        <input
                          type="number"
                          name="vehicle_capacity"
                          value={formData.vehicle_capacity}
                          onChange={handleChange}
                          min="1"
                          max="20"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No vehicle information available. Please contact support to register your vehicle.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DriverProfile;