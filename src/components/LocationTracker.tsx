import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LocationTrackerProps {
  bloodType: string;
  onLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
}

export function LocationTracker({ bloodType, onLocationUpdate }: LocationTrackerProps) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Request location permission and start tracking
    const startTracking = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          setIsTracking(true);
          updateLocation();
        } else {
          toast.error('Location permission is required for this feature');
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
        toast.error('Failed to access location');
      }
    };

    startTracking();

    // Set up interval to update location every 30 minutes
    const interval = setInterval(updateLocation, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const updateLocation = () => {
    if (!user || !isTracking) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Check if user already has a location record
          const { data: existingLocation } = await supabase
            .from('user_locations')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (existingLocation) {
            // Update existing location
            const { error } = await supabase
              .from('user_locations')
              .update({
                latitude,
                longitude,
                last_updated: new Date().toISOString(),
              })
              .eq('user_id', user.id);

            if (error) throw error;
          } else {
            // Insert new location
            const { error } = await supabase
              .from('user_locations')
              .insert({
                user_id: user.id,
                blood_type: bloodType,
                latitude,
                longitude,
                is_available: true,
              });

            if (error) throw error;
          }

          onLocationUpdate?.({ latitude, longitude });
        } catch (error) {
          console.error('Error updating location:', error);
          toast.error('Failed to update location');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get location');
      }
    );
  };

  return (
    <div className="text-sm text-gray-500">
      {isTracking ? (
        <p>Location tracking active</p>
      ) : (
        <p>Location tracking inactive</p>
      )}
    </div>
  );
} 