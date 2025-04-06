import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LocationMap from './LocationMap';
import { calculateDistance } from '../lib/geolocation';
import { ChatButton } from './ChatButton';

interface EmergencyLocation {
  latitude: number;
  longitude: number;
  address: string;
  bloodType: string;
  requestId?: string;
}

interface MatchingDonor {
  id: string;
  user_name: string;
  user_avatar: string | null;
  blood_type: string;
  distance: number;
  latitude: number;
  longitude: number;
}

interface MapDonor {
  id: string;
  name: string;
  bloodType: string;
  latitude: number;
  longitude: number;
  distance: number;
}

interface EmergencyRequestMapProps {
  emergencyLocation: EmergencyLocation;
  onDonorSelect: (donor: MatchingDonor) => void;
  onDonorsLoaded?: (donors: MatchingDonor[]) => void;
}

export function EmergencyRequestMap({ 
  emergencyLocation, 
  onDonorSelect,
  onDonorsLoaded 
}: EmergencyRequestMapProps) {
  const [matchingDonors, setMatchingDonors] = useState<MatchingDonor[]>([]);
  const [mapDonors, setMapDonors] = useState<MapDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasShownToast = useRef(false);
  const previousDonorCount = useRef<number | null>(null);

  useEffect(() => {
    if (!emergencyLocation || !emergencyLocation.latitude || !emergencyLocation.longitude) {
      console.error('Invalid emergency location:', emergencyLocation);
      setError('Invalid emergency location coordinates');
      return;
    }

    // Reset toast flag when location changes
    hasShownToast.current = false;
    previousDonorCount.current = null;
    
    loadMatchingDonors();
    
    // Set up interval to refresh donor locations every 30 minutes
    const interval = setInterval(loadMatchingDonors, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [emergencyLocation]);

  const loadMatchingDonors = async () => {
    try {
      if (!emergencyLocation.bloodType) {
        setError('Blood type is required to find matching donors');
        return;
      }

      const { data, error } = await supabase.rpc('find_matching_donors', {
        p_blood_type: emergencyLocation.bloodType,
        lat: emergencyLocation.latitude,
        lng: emergencyLocation.longitude,
        radius_km: 20,
      });

      if (error) {
        throw error;
      }

      // Handle null response or empty array
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setMatchingDonors([]);
        setMapDonors([]);
        if (onDonorsLoaded) onDonorsLoaded([]);
        return;
      }

      // Parse the response if it's a string
      let donors;
      try {
        donors = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        console.error('Error parsing donor data:', e);
        donors = [];
      }

      if (!Array.isArray(donors)) {
        donors = [];
      }

      // Transform donors for both map and matching list
      const transformedDonors = donors.map(donor => {
        const distance = calculateDistance(
          emergencyLocation.latitude,
          emergencyLocation.longitude,
          donor.latitude,
          donor.longitude
        );
        
        return {
          id: donor.id,
          user_name: donor.user_name || `${donor.first_name} ${donor.last_name}`,
          user_avatar: donor.avatar_url || null,
          blood_type: donor.blood_type,
          latitude: donor.latitude,
          longitude: donor.longitude,
          distance
        };
      });

      const mapDonors = transformedDonors.map(donor => ({
        id: donor.id,
        name: donor.user_name,
        bloodType: donor.blood_type,
        latitude: donor.latitude,
        longitude: donor.longitude,
        distance: donor.distance
      }));

      setMatchingDonors(transformedDonors);
      setMapDonors(mapDonors);
      if (onDonorsLoaded) onDonorsLoaded(transformedDonors);

      // Show success toast if we found donors
      if (transformedDonors.length > 0 && 
          previousDonorCount.current !== transformedDonors.length) {
        toast.success(`Found ${transformedDonors.length} matching donors nearby`, {
          id: 'donors-found-toast',
          duration: 3000
        });
        hasShownToast.current = true;
      }

      // Update previous donor count
      previousDonorCount.current = transformedDonors.length;
    } catch (e) {
      console.error('Error loading matching donors:', e);
      setError('An error occurred while loading matching donors');
    }
  };

  return (
    <div>
      {/* Render your map component here */}
    </div>
  );
}
