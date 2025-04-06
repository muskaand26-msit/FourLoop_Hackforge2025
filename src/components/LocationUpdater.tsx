import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LocationUpdaterProps {
  bloodType?: string;
}

export function LocationUpdater({ bloodType }: LocationUpdaterProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !bloodType) return;

    const updateLocation = async (position: GeolocationPosition) => {
      try {
        // Check if user already has a location entry
        const { data: existingLocation } = await supabase
          .from('user_locations')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const locationData = {
          user_id: user.id,
          blood_type: bloodType,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          is_available: true,
          updated_at: new Date().toISOString(),
        };

        if (existingLocation) {
          // Update existing location
          const { error } = await supabase
            .from('user_locations')
            .update(locationData)
            .eq('id', existingLocation.id);

          if (error) throw error;
        } else {
          // Insert new location
          const { error } = await supabase
            .from('user_locations')
            .insert([locationData]);

          if (error) throw error;
        }

        console.log('Location updated successfully');
      } catch (error) {
        console.error('Error updating location:', error);
        toast.error('Failed to update location');
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Error getting location:', error);
      toast.error('Please enable location services to be discoverable by emergency requests');
    };

    // Get initial location
    navigator.geolocation.getCurrentPosition(updateLocation, handleError);

    // Set up location watching
    const watchId = navigator.geolocation.watchPosition(updateLocation, handleError);

    // Cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [user, bloodType]);

  return null;
} 