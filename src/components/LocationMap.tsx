import React, { useEffect, useRef, useState } from 'react';
import { OlaMaps } from 'olamaps-web-sdk';
import { OLA_MAPS_CONFIG, validateOlaMapsConfig } from '../config/olaMaps';
import { supabase } from '../lib/supabase';

interface LocationMapProps {
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
  isEmergency?: boolean;
  donors?: Array<{
    id: string;
    name: string;
    bloodType: string;
    longitude: number;
    latitude: number;
    distance: number;
  }>;
  className?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Cache for map instances
const MAP_CACHE = new Map();

// Add rate limiting configuration with lower request count
const RATE_LIMIT_CONFIG = {
  maxRequests: 50, // Reduced from 100 to be more conservative
  requestCount: 0,
  lastReset: Date.now(),
  cache: new Map() // Cache for API responses
};

// Helper function to get cached map instance
const getCachedMap = (cacheKey: string) => {
  return MAP_CACHE.get(cacheKey);
};

// Helper function to set cached map instance
const setCachedMap = (cacheKey: string, map: any) => {
  MAP_CACHE.set(cacheKey, map);
};

// Modified exponential backoff with jitter
const exponentialBackoff = (attempt: number) => {
  const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
  const delay = Math.min(1000 * Math.pow(2, attempt) + jitter, 15000); // Cap at 15 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Helper function for exponential backoff
const checkRateLimit = () => {
  const now = Date.now();
  if (now - RATE_LIMIT_CONFIG.lastReset > 60000) { // Reset counter every minute
    RATE_LIMIT_CONFIG.requestCount = 0;
    RATE_LIMIT_CONFIG.lastReset = now;
  }
  
  if (RATE_LIMIT_CONFIG.requestCount >= RATE_LIMIT_CONFIG.maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  RATE_LIMIT_CONFIG.requestCount++;
};

// Helper function to determine marker color based on blood type
const getBloodTypeColor = (bloodType: string): string => {
  switch(bloodType) {
    case 'O-': return '#004d00'; // Dark green - universal donor
    case 'O+': return '#008000'; // Green
    case 'A-': return '#0000cc'; // Dark blue
    case 'A+': return '#3333ff'; // Blue
    case 'B-': return '#cc6600'; // Dark orange
    case 'B+': return '#ff9933'; // Orange
    case 'AB-': return '#660066'; // Dark purple
    case 'AB+': return '#9933ff'; // Purple - universal recipient
    default: return '#4CAF50'; // Default green
  }
};

// Helper function to generate donor popup content
const getDonorPopupContent = (donor: { name: string; bloodType: string; distance: number }): string => {
  return `
    <div style="padding: 12px; min-width: 220px;">
      <strong style="font-size: 16px;">${donor.name}</strong><br/>
      <div style="margin-top: 8px;">
        <span style="color: #333; font-weight: bold; background-color: #f0f0f0; padding: 3px 6px; border-radius: 4px;">Blood Type: ${donor.bloodType}</span>
      </div>
      <div style="margin-top: 8px;">
        <span style="color: #555;">Distance: <strong>${donor.distance.toFixed(1)} km</strong></span>
      </div>
    </div>
  `;
};

const LocationMap: React.FC<LocationMapProps> = ({
  onLocationSelect,
  initialLocation,
  isEmergency = false,
  donors = [],
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geolocateControlRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  // Function to update user location in database
  const updateUserLocation = async (coords: Coordinates) => {
    try {
      const { latitude, longitude } = coords;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          isNaN(latitude) || isNaN(longitude)) {
        console.error('Invalid coordinates for database update:', coords);
        return;
      }

      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id;

      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      // Update user's location in the database
      const { data, error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: userId,
          latitude,
          longitude,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      console.log('Location updated in database:', { latitude, longitude });
    } catch (err) {
      console.error('Error updating location in database:', err);
    }
  };

  // Function to initialize map with retry logic
  const initializeMapWithRetry = async () => {
    if (!mapRef.current) {
      setError('Map container not found');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate cache key based on props
      const cacheKey = JSON.stringify({
        initialLocation,
        isEmergency,
        donorsCount: donors.length
      });

      // Try to get cached map instance
      const cachedMap = getCachedMap(cacheKey);
      if (cachedMap) {
        console.log('Using cached map instance');
        mapInstanceRef.current = cachedMap;
        setIsLoading(false);
        return;
      }

      // Initialize OlaMaps with minimal configuration
      const olaMaps = new OlaMaps({
        apiKey: OLA_MAPS_CONFIG.apiKey,
        mode: '2d'
      });

      // Initialize map with basic style first
      const map = olaMaps.init({
        container: mapRef.current,
        center: initialLocation ? [initialLocation.lng, initialLocation.lat] : OLA_MAPS_CONFIG.defaultCenter,
        zoom: OLA_MAPS_CONFIG.defaultZoom,
        style: 'default', // Use default style instead of custom style
        preserveDrawingBuffer: true
      });

      // Cache the map instance
      setCachedMap(cacheKey, map);
      mapInstanceRef.current = map;

      // Add basic controls
      map.addControl(olaMaps.addNavigationControls(), 'top-right');

      // Wait for map to load before adding markers
      map.on('load', () => {
        try {
          // Add markers with batching
          const addMarkers = async () => {
            if (initialLocation) {
              // Add emergency marker
              const marker = olaMaps.addMarker({
                color: isEmergency ? '#ff0000' : '#4CAF50',
                offset: [0, -15],
                anchor: 'bottom'
              });
              
              marker.setLngLat([initialLocation.lng, initialLocation.lat]);
              marker.addTo(map);
            }

            // Batch donor markers in groups of 5
            const BATCH_SIZE = 5;
            for (let i = 0; i < donors.length; i += BATCH_SIZE) {
              const batch = donors.slice(i, i + BATCH_SIZE);
              await Promise.all(batch.map(donor => {
                if (!donor.longitude || !donor.latitude) return null;
                
                const marker = olaMaps.addMarker({
                  color: getBloodTypeColor(donor.bloodType),
                  offset: [0, -15],
                  anchor: 'bottom'
                });
                
                marker.setLngLat([donor.longitude, donor.latitude]);
                marker.setPopup(
                  olaMaps.addPopup({ 
                    offset: [0, -30],
                    anchor: 'bottom',
                    closeButton: true
                  })
                  .setHTML(getDonorPopupContent(donor))
                );
                return marker.addTo(map);
              }));
              
              // Add small delay between batches
              if (i + BATCH_SIZE < donors.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          };

          addMarkers().then(() => {
            // Fit bounds after all markers are added
            if (donors.length > 0) {
              // Calculate bounds manually
              const bounds = donors.reduce(
                (acc, donor) => {
                  if (donor.longitude && donor.latitude) {
                    return {
                      minLng: Math.min(acc.minLng, donor.longitude),
                      maxLng: Math.max(acc.maxLng, donor.longitude),
                      minLat: Math.min(acc.minLat, donor.latitude),
                      maxLat: Math.max(acc.maxLat, donor.latitude)
                    };
                  }
                  return acc;
                },
                {
                  minLng: initialLocation?.lng ?? donors[0].longitude,
                  maxLng: initialLocation?.lng ?? donors[0].longitude,
                  minLat: initialLocation?.lat ?? donors[0].latitude,
                  maxLat: initialLocation?.lat ?? donors[0].latitude
                }
              );

              // Add padding to bounds
              const padding = 0.02; // About 2km padding
              map.fitBounds(
                [
                  [bounds.minLng - padding, bounds.minLat - padding],
                  [bounds.maxLng + padding, bounds.maxLat + padding]
                ],
                { padding: 50 }
              );
            }
          });

          setIsLoading(false);
        } catch (err) {
          console.error('Error in map load handler:', err);
          handleMapError(err);
        }
      });

      // Handle map errors
      map.on('error', handleMapError);

    } catch (err: any) {
      console.error('Error initializing map:', err);
      if (err.message === '429' || (err.error?.status === 429)) {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          await exponentialBackoff(retryCountRef.current);
          return initializeMapWithRetry();
        }
      }
      handleMapError(err);
    }
  };

  // Function to handle map errors with retry logic
  const handleMapError = (err: any) => {
    console.error('Map error:', err);
    
    // Check if it's a rate limit error
    if (err.error?.message?.includes('429') || err.error?.status === 429) {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setError(`Rate limit reached. Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCountRef.current}/${maxRetries})`);
        
        // Retry after delay
        setTimeout(() => {
          initializeMapWithRetry();
        }, retryDelay);
      } else {
        setError('Maximum retry attempts reached. Please try again later.');
        setIsLoading(false);
      }
    } else {
      setError('An error occurred while loading the map. Please try refreshing the page.');
      setIsLoading(false);
    }
  };

  // Initialize map
  useEffect(() => {
    initializeMapWithRetry();
  }, [initialLocation, onLocationSelect, isEmergency, donors]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="relative w-full h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-red-500 text-center p-4">
              <p className="font-semibold">Error loading map</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        <div 
          ref={mapRef} 
          className="w-full h-full rounded-lg shadow-lg"
        />
      </div>

      {/* Donors List */}
      {donors.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Available Donors Nearby</h3>
          <div className="space-y-3">
            {donors.map(donor => (
              <div key={donor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{donor.name}</p>
                  <p className="text-sm text-gray-600">Blood Type: {donor.bloodType}</p>
                  <p className="text-sm text-gray-600">Distance: {donor.distance.toFixed(1)} km</p>
                </div>
                <button 
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    // TODO: Implement contact/connect functionality
                    console.log('Connect with donor:', donor.id);
                  }}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMap; 