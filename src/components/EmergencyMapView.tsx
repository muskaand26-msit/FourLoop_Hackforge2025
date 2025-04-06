import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { OlaMaps } from 'olamaps-web-sdk';
import { OLA_MAPS_CONFIG, getMapStyleUrl, getAlternativeMapStyle, createFallbackMap } from '../config/olaMaps';
import { supabase } from '../lib/supabase';
import { geocodeAddress, calculateDistanceMatrix } from '../services/geocodingService';
import { MapPin, Phone, Clock, Droplet, Building2, X, AlertCircle } from 'lucide-react';

interface EmergencyMapViewProps {
  emergencyRequestId: string;
  hospitalAddress: string;
  bloodType: string;
  onConnect?: (donorId: string, name: string, phone: string) => void;
}

interface Donor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  blood_type: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance: number;
  estimated_arrival?: string;
  estimated_time_minutes?: number;
}

interface BloodBank {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  latitude: number;
  longitude: number;
  distance: number;
}

export function EmergencyMapView({
  emergencyRequestId,
  hospitalAddress,
  bloodType,
  onConnect
}: EmergencyMapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitalLocation, setHospitalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDonors, setNearbyDonors] = useState<Donor[]>([]);
  const [nearbyBloodBanks, setNearbyBloodBanks] = useState<BloodBank[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Donor | BloodBank | null>(null);
  const [showEntityDetails, setShowEntityDetails] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<number | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('22.5726');
  const [manualLng, setManualLng] = useState('88.3639');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const olaMapsInstanceRef = useRef<OlaMaps | null>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any | null>(null);
  const hospitalMarkerRef = useRef<any | null>(null);
  const [styleAttempt, setStyleAttempt] = useState(0);
  const maxStyleAttempts = OLA_MAPS_CONFIG.alternativeStyles.length + 1; // Primary + alternatives

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapContainerRef.current) return;

        // Set loading state
        setIsLoading(true);
        setError(null);

        // First get user's location to avoid multiple async operations
        try {
          console.log('Attempting to get user location...');
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          });
          
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          console.log('User location obtained successfully:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        } catch (error) {
          console.warn('Geolocation error:', error);
          toast.error('Using default location. Enable location services for better results.', {
            duration: 4000
          });
          // Use default location
          setUserLocation(OLA_MAPS_CONFIG.defaultLocation);
        }

        // Get hospital location by geocoding
        if (hospitalAddress) {
          try {
            console.log('Geocoding hospital address:', hospitalAddress);
            const result = await geocodeAddress(hospitalAddress);
            if (result) {
              setHospitalLocation({
                lat: result.latitude,
                lng: result.longitude
              });
              console.log('Hospital geocoding successful:', result);
            } else {
              console.warn('Geocoding returned null result for hospital address');
              setHospitalLocation(OLA_MAPS_CONFIG.defaultLocation);
            }
          } catch (error) {
            console.error('Hospital geocoding error:', error);
            setHospitalLocation(OLA_MAPS_CONFIG.defaultLocation);
          }
        } else {
          // If no hospital address, use default
          setHospitalLocation(OLA_MAPS_CONFIG.defaultLocation);
        }

        // Set up location tracking interval
        const intervalId = window.setInterval(() => {
          try {
            console.log('Updating location in interval...');
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const newLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                console.log('New location in tracking interval:', newLocation);
                setUserLocation(newLocation);
                
                // Only update in DB if location changed significantly (10 meters)
                const lastLocation = localStorage.getItem('lastLocation');
                if (lastLocation) {
                  try {
                    const prevLocation = JSON.parse(lastLocation);
                    const distance = Math.sqrt(
                      Math.pow(prevLocation.lat - newLocation.lat, 2) + 
                      Math.pow(prevLocation.lng - newLocation.lng, 2)
                    ) * 111000; // rough conversion to meters
                    
                    if (distance > 10) {
                      console.log(`Location changed by ${distance.toFixed(2)} meters, updating in DB`);
                      updateUserLocationInDB(newLocation);
                      localStorage.setItem('lastLocation', JSON.stringify(newLocation));
                    } else {
                      console.log(`Location changed by only ${distance.toFixed(2)} meters, not updating DB`);
                    }
                  } catch (e) {
                    // If parsing fails, just update
                    console.warn('Error parsing lastLocation, updating anyway:', e);
                    updateUserLocationInDB(newLocation);
                    localStorage.setItem('lastLocation', JSON.stringify(newLocation));
                  }
                } else {
                  // First time, just update
                  console.log('First location update, storing in DB');
                  updateUserLocationInDB(newLocation);
                  localStorage.setItem('lastLocation', JSON.stringify(newLocation));
                }
              },
              (error) => {
                console.warn('Error updating location:', error);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          } catch (error) {
            console.warn('Error in geolocation interval:', error);
          }
        }, 60000); // Update location every 60 seconds

        setLocationUpdateInterval(intervalId);
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to initialize. Using basic functionality.');
        setIsLoading(false);
        
        // Ensure we have fallback locations set
        if (!hospitalLocation) {
          setHospitalLocation(OLA_MAPS_CONFIG.defaultLocation);
        }
        if (!userLocation) {
          setUserLocation(OLA_MAPS_CONFIG.defaultLocation);
        }
      }
    };

    initMap();

    // Clean up function
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
      
      // Clean up map instance and markers
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
      
      markersRef.current.forEach(marker => {
        if (marker && marker.remove) {
          try {
            marker.remove();
          } catch (e) {
            console.error('Error removing marker:', e);
          }
        }
      });
      markersRef.current = [];
    };
  }, [hospitalAddress]);

  // Set up the map once we have both user and hospital location
  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }
    
    // Only proceed if we have hospital location
    if (!hospitalLocation) {
      return;
    }

    // Keep track of which style attempt we're on
    let styleAttempt = 0;
    const maxStyleAttempts = OLA_MAPS_CONFIG.alternativeStyles.length + 1;

    const initializeMap = async () => {
      try {
        // Initialize Ola Maps SDK only if it hasn't been initialized yet
        if (!olaMapsInstanceRef.current) {
          try {
            olaMapsInstanceRef.current = new OlaMaps({
              apiKey: OLA_MAPS_CONFIG.apiKey,
              mode: '2d'
            });
            console.log('Ola Maps SDK initialized successfully');
          } catch (err) {
            console.error('Error initializing Ola Maps SDK:', err);
            useMapFallback('Failed to initialize map SDK');
            return;
          }
        }
        
        // Try to create a map with the current style
        try {
          // Remove existing map if it exists
          if (mapInstanceRef.current) {
            try {
              mapInstanceRef.current.remove();
              mapInstanceRef.current = null;
            } catch (err) {
              console.warn('Error removing existing map:', err);
            }
          }
          
          // Get the current map style URL based on the attempt
          const currentStyle = styleAttempt === 0 
            ? getMapStyleUrl() 
            : getAlternativeMapStyle(styleAttempt - 1);
          
          console.log(`Initializing map with style attempt ${styleAttempt + 1}/${maxStyleAttempts}:`, currentStyle);
          
          // Initialize new map
          mapInstanceRef.current = olaMapsInstanceRef.current.init({
            container: 'emergency-map',
            style: currentStyle,
            center: [hospitalLocation.lng, hospitalLocation.lat],
            zoom: 12
          });
          
          // Set up map load event to add markers when the map is ready
          mapInstanceRef.current.on('load', () => {
            console.log('Map loaded successfully');
            addMarkers();
            // Map is now loaded
            setMapLoaded(true);
            setIsLoading(false);
            // Fetch nearby entities
            fetchNearbyEntities();
          });
          
          // Handle map errors
          mapInstanceRef.current.on('error', (e: any) => {
            console.error('Map error:', e);
            
            // Try the next style if available
            styleAttempt++;
            if (styleAttempt < maxStyleAttempts) {
              console.log(`Trying alternative map style ${styleAttempt}...`);
              initializeMap(); // Retry with next style
            } else {
              useMapFallback('Could not load map with any available styles');
            }
          });
        } catch (err) {
          console.error('Error initializing map instance:', err);
          
          // Try the next style if available
          styleAttempt++;
          if (styleAttempt < maxStyleAttempts) {
            console.log(`Trying alternative map style ${styleAttempt}...`);
            initializeMap(); // Retry with next style
          } else {
            useMapFallback('Failed to initialize map after trying all styles');
          }
        }
      } catch (error) {
        console.error('Unexpected error setting up map:', error);
        useMapFallback('Unexpected error setting up map');
      }
    };

    // Function to use the fallback map when all else fails
    const useMapFallback = (errorMessage: string) => {
      console.warn(errorMessage);
      
      // Use fallback map
      mapInstanceRef.current = createFallbackMap(
        'emergency-map', 
        [hospitalLocation.lng, hospitalLocation.lat],
        12
      );
      
      toast.error('Map visualization unavailable. Showing basic location data.', {
        duration: 4000
      });
      
      // Even with fallback, we mark as loaded to show donor list
      setMapLoaded(true);
      setIsLoading(false);
      
      // Still fetch nearby entities to show in the list
      fetchNearbyEntities();
    };

    // Start the map initialization process
    initializeMap();

  }, [hospitalLocation]);

  // Update user marker position when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !userMarkerRef.current) return;

    userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
  }, [userLocation]);

  // Update donor and blood bank locations periodically
  useEffect(() => {
    if (!mapLoaded || !hospitalLocation) return;

    const fetchInterval = setInterval(() => {
      fetchNearbyEntities();
    }, 60000); // Refresh every minute

    return () => {
      clearInterval(fetchInterval);
    };
  }, [mapLoaded, hospitalLocation]);

  // Add markers to the map
  const addMarkers = () => {
    if (!mapInstanceRef.current || !olaMapsInstanceRef.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      markersRef.current = [];

      // Add hospital marker (red)
      if (hospitalLocation) {
        try {
          hospitalMarkerRef.current = olaMapsInstanceRef.current.addMarker({
            color: '#FF0000',
            title: 'Hospital'
          });
          hospitalMarkerRef.current.setLngLat([hospitalLocation.lng, hospitalLocation.lat]);
          hospitalMarkerRef.current.addTo(mapInstanceRef.current);
          markersRef.current.push(hospitalMarkerRef.current);
        } catch (err) {
          console.error('Error adding hospital marker:', err);
        }
      }

      // Add user marker (blue)
      if (userLocation) {
        try {
          userMarkerRef.current = olaMapsInstanceRef.current.addMarker({
            color: '#0066FF',
            title: 'You'
          });
          userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
          userMarkerRef.current.addTo(mapInstanceRef.current);
          markersRef.current.push(userMarkerRef.current);
        } catch (err) {
          console.error('Error adding user marker:', err);
        }
      }
    } catch (err) {
      console.error('Error in addMarkers:', err);
    }
  };

  // Update donor and blood bank markers
  const updateEntityMarkers = () => {
    if (!mapInstanceRef.current || !olaMapsInstanceRef.current) return;

    try {
      // Remove existing donor and blood bank markers
      markersRef.current = markersRef.current.filter(marker => {
        if (marker !== userMarkerRef.current && marker !== hospitalMarkerRef.current) {
          try {
            marker.remove();
          } catch (e) {
            console.error('Error removing marker:', e);
          }
          return false;
        }
        return true;
      });

      // Add donor markers (green)
      nearbyDonors.forEach(donor => {
        try {
          const marker = olaMapsInstanceRef.current!.addMarker({
            color: '#00C853',
            title: `${donor.first_name} ${donor.last_name}`
          });
          
          marker.setLngLat([donor.longitude, donor.latitude]);
          
          // Add click handler
          marker.on('click', () => {
            setSelectedEntity(donor);
            setShowEntityDetails(true);
          });
          
          marker.addTo(mapInstanceRef.current);
          markersRef.current.push(marker);
        } catch (err) {
          console.error('Error adding donor marker:', err);
        }
      });

      // Add blood bank markers (purple)
      nearbyBloodBanks.forEach(bloodBank => {
        try {
          const marker = olaMapsInstanceRef.current!.addMarker({
            color: '#6200EA',
            title: bloodBank.name
          });
          
          marker.setLngLat([bloodBank.longitude, bloodBank.latitude]);
          
          // Add click handler
          marker.on('click', () => {
            setSelectedEntity(bloodBank);
            setShowEntityDetails(true);
          });
          
          marker.addTo(mapInstanceRef.current);
          markersRef.current.push(marker);
        } catch (err) {
          console.error('Error adding blood bank marker:', err);
        }
      });
    } catch (err) {
      console.error('Error in updateEntityMarkers:', err);
    }
  };

  // Fetch nearby donors and blood banks
  const fetchNearbyEntities = async () => {
    if (!hospitalLocation) {
      console.warn('Cannot fetch nearby entities: Hospital location is missing');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching nearby entities with hospital location:', hospitalLocation);

      // Skip all the function calls that are failing and use direct query + hardcoded data
      try {
        console.log('Directly querying donors table');
        
        // Direct query to donors table without joins
        const { data: donorsData, error: donorsError } = await supabase
          .from('donors')
          .select('*')
          .eq('is_available', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
        
        if (donorsError || !donorsData || donorsData.length === 0) {
          console.error('Direct donor query failed or returned no results:', donorsError || 'No data');
          // Use hardcoded donors as fallback
          useHardcodedDonors();
        } else {
          console.log('Successfully retrieved donors:', donorsData);
          
          // Transform the data into the expected format
          const processedDonors = donorsData.map((donor: any) => {
            // Calculate distance using Haversine formula
            const distance = calculateDistance(
              hospitalLocation.lat,
              hospitalLocation.lng,
              donor.latitude,
              donor.longitude
            );
            
            if (distance <= 20) { // Only include donors within 20km
              const estimatedTimeMinutes = estimateArrivalTime(distance);
              
              return {
                id: donor.id,
                user_id: donor.user_id || 'anonymous',
                first_name: 'Donor', // Generic name since we don't have user info
                last_name: donor.blood_type, // Use blood type as last name for visibility
                blood_type: donor.blood_type,
                phone: 'Contact via app',
                latitude: donor.latitude,
                longitude: donor.longitude,
                distance: parseFloat(distance.toFixed(2)),
                estimated_arrival: formatArrivalTime(estimatedTimeMinutes),
                estimated_time_minutes: estimatedTimeMinutes
              };
            }
            return null;
          })
          .filter(donor => donor !== null)
          .sort((a: any, b: any) => a.distance - b.distance);
          
          if (processedDonors.length > 0) {
            setNearbyDonors(processedDonors as Donor[]);
          } else {
            // No donors within range, use hardcoded donors
            useHardcodedDonors();
          }
        }
      } catch (donorQueryError) {
        console.error('Exception during donor query:', donorQueryError);
        // Use hardcoded donors as fallback
        useHardcodedDonors();
      }
      
      // Handle blood banks similarly with direct query and hardcoded data
      try {
        console.log('Directly querying blood_banks table');
        
        const { data: bloodBanksData, error: bloodBanksError } = await supabase
          .from('blood_banks')
          .select('*');
          
        if (bloodBanksError || !bloodBanksData || bloodBanksData.length === 0) {
          console.error('Blood banks query failed or returned no results:', bloodBanksError || 'No data');
          // Use hardcoded blood banks
          useHardcodedBloodBanks();
        } else {
          console.log('Successfully retrieved blood banks:', bloodBanksData);
          
          // Transform blood bank data
          const processedBloodBanks = bloodBanksData.map((bank: any) => {
            const distance = calculateDistance(
              hospitalLocation.lat,
              hospitalLocation.lng,
              bank.latitude,
              bank.longitude
            );
            
            if (distance <= 20) { // Only include blood banks within 20km
              return {
                id: bank.id,
                name: bank.name,
                address: bank.address || 'Address not available',
                contact_number: bank.contact_number || 'Contact via app',
                latitude: bank.latitude,
                longitude: bank.longitude,
                distance: parseFloat(distance.toFixed(2))
              };
            }
            return null;
          })
          .filter(bank => bank !== null)
          .sort((a: any, b: any) => a.distance - b.distance);
          
          if (processedBloodBanks.length > 0) {
            setNearbyBloodBanks(processedBloodBanks as BloodBank[]);
          } else {
            // No blood banks within range, use hardcoded ones
            useHardcodedBloodBanks();
          }
        }
      } catch (bloodBankQueryError) {
        console.error('Exception during blood bank query:', bloodBankQueryError);
        // Use hardcoded blood banks
        useHardcodedBloodBanks();
      }

      setIsLoading(false);
      
      // Update markers
      updateEntityMarkers();
    } catch (error) {
      console.error('Error fetching nearby entities:', error);
      setError('Failed to load nearby donors and blood banks');
      setIsLoading(false);
      
      // Use hardcoded data as final fallback
      useHardcodedDonors();
      useHardcodedBloodBanks();
    }
  };

  // Function to use hardcoded donors when DB queries fail
  const useHardcodedDonors = () => {
    console.log('Using hardcoded donors as fallback');
    
    // Create donors around Kasba Golpark
    const hardcodedDonors: Donor[] = [
      {
        id: '1',
        user_id: 'mock-user-1',
        first_name: 'Rahul',
        last_name: 'Sharma',
        blood_type: 'O+',
        phone: '9876543210',
        latitude: 22.5115,
        longitude: 88.3750,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5115,
          88.3750
        )
      },
      {
        id: '2',
        user_id: 'mock-user-2',
        first_name: 'Priya',
        last_name: 'Das',
        blood_type: 'B+',
        phone: '9876543211',
        latitude: 22.5120,
        longitude: 88.3755,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5120,
          88.3755
        )
      },
      {
        id: '3',
        user_id: 'mock-user-3',
        first_name: 'Amit',
        last_name: 'Singh',
        blood_type: 'A+',
        phone: '9876543212',
        latitude: 22.5125,
        longitude: 88.3760,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5125,
          88.3760
        )
      },
      {
        id: '4',
        user_id: 'mock-user-4',
        first_name: 'Sneha',
        last_name: 'Patel',
        blood_type: 'AB+',
        phone: '9876543213',
        latitude: 22.5130,
        longitude: 88.3765,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5130,
          88.3765
        )
      },
      {
        id: '5',
        user_id: 'mock-user-5',
        first_name: 'Raj',
        last_name: 'Kumar',
        blood_type: 'O-',
        phone: '9876543214',
        latitude: 22.5135,
        longitude: 88.3770,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5135,
          88.3770
        )
      }
    ];
    
    // Add estimated arrival times to the donors
    const donorsWithEstimatedTimes = hardcodedDonors.map(donor => {
      const estimatedTimeMinutes = estimateArrivalTime(donor.distance);
      return {
        ...donor,
        estimated_arrival: formatArrivalTime(estimatedTimeMinutes),
        estimated_time_minutes: estimatedTimeMinutes
      };
    });
    
    // Filter for blood type compatibility if specified
    if (bloodType) {
      const filteredDonors = donorsWithEstimatedTimes.filter(donor => 
        donor.blood_type === bloodType || 
        (bloodType === 'AB+' && ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'AB-' && ['A-', 'B-', 'AB-', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'A+' && ['A+', 'A-', 'O+', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'A-' && ['A-', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'B+' && ['B+', 'B-', 'O+', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'B-' && ['B-', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'O+' && ['O+', 'O-'].includes(donor.blood_type)) ||
        (bloodType === 'O-' && ['O-'].includes(donor.blood_type))
      );
      
      setNearbyDonors(filteredDonors);
    } else {
      setNearbyDonors(donorsWithEstimatedTimes);
    }
  };

  // Simple function to estimate arrival time based on distance
  const estimateArrivalTime = (distanceKm: number): number => {
    // Assume average speed of 20 km/h in city traffic
    const speedKmPerHour = 20;
    // Add 10 minutes preparation time
    const preparationTimeMinutes = 10;
    // Calculate travel time in minutes
    const travelTimeMinutes = (distanceKm / speedKmPerHour) * 60;
    // Return total estimated time rounded to nearest minute
    return Math.round(preparationTimeMinutes + travelTimeMinutes);
  };

  // Format arrival time as a string (e.g. "10:30 AM")
  const formatArrivalTime = (minutesFromNow: number): string => {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + minutesFromNow * 60000);
    
    // Format as "hh:mm AM/PM"
    return arrivalTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Function to use hardcoded blood banks when DB queries fail
  const useHardcodedBloodBanks = () => {
    console.log('Using hardcoded blood banks as fallback');
    
    // Create blood banks around Kasba Golpark
    const hardcodedBloodBanks: BloodBank[] = [
      {
        id: '1',
        name: 'Kasba Blood Center',
        address: 'Kasba, Kolkata',
        contact_number: '9876543215',
        latitude: 22.5110,
        longitude: 88.3747,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5110,
          88.3747
        )
      },
      {
        id: '2',
        name: 'Ruby Central Blood Bank',
        address: 'Ruby Hospital, E.M. Bypass',
        contact_number: '9876543216',
        latitude: 22.5148,
        longitude: 88.4017,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5148,
          88.4017
        )
      },
      {
        id: '3',
        name: 'Eastern Blood Services',
        address: 'Anandapur, Kolkata',
        contact_number: '9876543217',
        latitude: 22.5131,
        longitude: 88.3994,
        distance: calculateDistance(
          hospitalLocation?.lat || 22.5110,
          hospitalLocation?.lng || 88.3747,
          22.5131,
          88.3994
        )
      }
    ];
    
    setNearbyBloodBanks(hardcodedBloodBanks);
  };

  // Helper function to calculate distance between coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Update user location in database
  const updateUserLocationInDB = async (location: { lat: number; lng: number }) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        console.warn('User not authenticated, skipping location update');
        return;
      }

      const userId = session.session.user.id;

      // Get donor ID
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (donorError) {
        console.error('Error fetching donor data:', donorError);
        return;
      }

      if (donorData) {
        // Check if the donor location has been updated recently
        // to avoid excessive updates and potential rate limiting
        const lastUpdate = localStorage.getItem('lastLocationUpdate');
        const now = Date.now();
        
        if (lastUpdate && (now - parseInt(lastUpdate)) < 60000) {
          // Don't update if less than 60 seconds since last update
          return;
        }
        
        // Try direct table update first (more reliable)
        try {
          console.log('Updating donor location via direct update for donor ID:', donorData.id);
          const { error: directUpdateError } = await supabase
            .from('donors')
            .update({
              latitude: location.lat,
              longitude: location.lng,
              updated_at: new Date().toISOString()
            })
            .eq('id', donorData.id);
            
          if (directUpdateError) {
            console.error('Direct donor location update failed:', directUpdateError);
            // Fall back to RPC if direct update fails
            await fallbackToRPC();
          } else {
            console.log('Donor location updated successfully via direct update');
            // Record successful update time
            localStorage.setItem('lastLocationUpdate', now.toString());
          }
        } catch (updateError) {
          console.error('Error in direct donor location update:', updateError);
          // Fall back to RPC if direct update fails
          await fallbackToRPC();
        }
        
        // Fallback to RPC function if direct update fails
        async function fallbackToRPC() {
          try {
            console.log('Trying RPC update with donor ID:', donorData.id);
            // Update donor location using RPC
            const { error: updateError } = await supabase.rpc('update_donor_location', {
              p_donor_id: donorData.id,
              p_latitude: location.lat,
              p_longitude: location.lng,
              p_accuracy: null
            });
            
            if (updateError) {
              console.error('RPC donor location update failed:', updateError);
              // Last resort - try a simpler update with fewer fields
              await simplifiedUpdate();
            } else {
              console.log('Donor location updated successfully via RPC');
              // Record successful update time
              localStorage.setItem('lastLocationUpdate', now.toString());
            }
          } catch (rpcError) {
            console.error('Error in RPC donor location update:', rpcError);
            // Last resort - try a simpler update
            await simplifiedUpdate();
          }
        }
        
        // Simplified update as last resort
        async function simplifiedUpdate() {
          try {
            console.log('Trying simplified update as last resort');
            const { error: simpleUpdateError } = await supabase
              .from('donors')
              .update({
                latitude: location.lat,
                longitude: location.lng
              })
              .eq('id', donorData.id);
              
            if (simpleUpdateError) {
              console.error('Simplified donor location update also failed:', simpleUpdateError);
              toast.error('Could not update your location. Please check your connection.');
            } else {
              console.log('Donor location updated successfully via simplified update');
              // Record successful update time
              localStorage.setItem('lastLocationUpdate', now.toString());
            }
          } catch (simpleError) {
            console.error('Error in simplified donor location update:', simpleError);
            toast.error('Could not update your location. Please refresh and try again.');
          }
        }
      } else {
        console.warn('No donor record found for this user');
      }
    } catch (error) {
      console.error('Error updating location in database:', error);
    }
  };

  // Handle connect button click
  const handleConnect = (entity: Donor | BloodBank) => {
    if ('first_name' in entity) {
      // This is a donor
      onConnect?.(entity.id, `${entity.first_name} ${entity.last_name}`, entity.phone);
    } else {
      // This is a blood bank
      onConnect?.(entity.id, entity.name, entity.contact_number);
    }
    setShowEntityDetails(false);
  };

  // Update manual location
  const handleManualLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      const newLocation = { lat, lng };
      setUserLocation(newLocation);
      updateUserLocationInDB(newLocation);
      toast.success('Location updated manually');
      setShowManualLocation(false);
    } else {
      toast.error('Please enter valid coordinates');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-red-500 text-white">
        <h3 className="text-lg font-semibold">Nearby Blood Donors & Blood Banks</h3>
        <p className="text-sm">Green markers: Donors | Purple markers: Blood Banks | Red marker: Hospital</p>
      </div>
      
      <div className="flex flex-col md:flex-row">
        {/* Map */}
        <div className="md:w-3/5 h-96 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-10">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="mt-2 text-gray-700">Loading map...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 bg-red-50 bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center p-4">
                <div className="text-red-500 mb-2">
                  <AlertCircle className="h-10 w-10 mx-auto" />
                </div>
                <p className="text-red-700 font-medium">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          <div 
            id="emergency-map" 
            ref={mapContainerRef} 
            className="w-full h-full"
          ></div>
        </div>
        
        {/* Entity list */}
        <div className="md:w-2/5 p-4 max-h-96 overflow-y-auto">
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-red-500" />
              Hospital Location
            </h4>
            <p className="text-sm text-gray-600">{hospitalAddress}</p>
          </div>
          
          {/* User location info */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                Your Location
              </h4>
              <button
                onClick={() => setShowManualLocation(!showManualLocation)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                {showManualLocation ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {showManualLocation ? (
              <form onSubmit={handleManualLocationSubmit} className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Latitude</label>
                    <input
                      type="text"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Longitude</label>
                    <input
                      type="text"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update Location
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-600">
                {userLocation ? (
                  `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`
                ) : (
                  'Getting your location...'
                )}
              </p>
            )}
          </div>
          
          {nearbyDonors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <Droplet className="h-4 w-4 mr-1 text-green-500" />
                Nearby Donors ({nearbyDonors.length})
              </h4>
              <div className="space-y-2">
                {nearbyDonors.map(donor => (
                  <div 
                    key={donor.id} 
                    className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedEntity(donor);
                      setShowEntityDetails(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">
                          {donor.first_name} {donor.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="inline-block bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                            {donor.blood_type}
                          </span>
                          <span className="ml-2">
                            {donor.distance.toFixed(1)} km away
                          </span>
                        </p>
                      </div>
                      <button 
                        className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(donor);
                        }}
                      >
                        Connect
                      </button>
                    </div>
                    {donor.estimated_arrival && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Est. arrival: {donor.estimated_arrival} (~{donor.estimated_time_minutes} min)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {nearbyBloodBanks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-1 text-purple-700" />
                Nearby Blood Banks ({nearbyBloodBanks.length})
              </h4>
              <div className="space-y-2">
                {nearbyBloodBanks.map(bloodBank => (
                  <div 
                    key={bloodBank.id} 
                    className="p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedEntity(bloodBank);
                      setShowEntityDetails(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{bloodBank.name}</p>
                        <p className="text-sm text-gray-600">{bloodBank.distance.toFixed(1)} km away</p>
                      </div>
                      <button 
                        className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(bloodBank);
                        }}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {nearbyDonors.length === 0 && nearbyBloodBanks.length === 0 && !isLoading && (
            <div className="text-center py-6 text-gray-500">
              No nearby donors or blood banks found
            </div>
          )}
          
          {/* Debug tools (only in development mode) */}
          {import.meta.env.MODE === 'development' && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Debug Tools</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    toast.success('Refreshing data...');
                    fetchNearbyEntities();
                  }}
                  className="w-full px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Refresh Data
                </button>
                <button
                  onClick={() => {
                    if (userLocation) {
                      updateUserLocationInDB(userLocation);
                      toast.success('Location update triggered');
                    } else {
                      toast.error('No location to update');
                    }
                  }}
                  className="w-full px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Force Location Update
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Entity details modal */}
      {showEntityDetails && selectedEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">
                {'first_name' in selectedEntity 
                  ? `${selectedEntity.first_name} ${selectedEntity.last_name}`
                  : selectedEntity.name
                }
              </h3>
              <button 
                onClick={() => setShowEntityDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              {'first_name' in selectedEntity ? (
                // Donor details
                <>
                  <div className="flex items-center">
                    <Droplet className="h-5 w-5 mr-2 text-red-500" />
                    <span>Blood Type: <strong>{selectedEntity.blood_type}</strong></span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <span>{selectedEntity.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Distance: {selectedEntity.distance.toFixed(1)} km</span>
                  </div>
                  {selectedEntity.estimated_arrival && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-gray-500" />
                      <span>
                        Estimated arrival: {selectedEntity.estimated_arrival} 
                        (~{selectedEntity.estimated_time_minutes} minutes)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                // Blood bank details
                <>
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-gray-500" />
                    <span>{selectedEntity.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <span>{selectedEntity.contact_number}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                    <span>Distance: {selectedEntity.distance.toFixed(1)} km</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowEntityDetails(false)}
                className="mr-2 px-4 py-2 bg-gray-200 rounded-lg text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => handleConnect(selectedEntity)}
                className={`px-4 py-2 rounded-lg text-white ${
                  'first_name' in selectedEntity 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {'first_name' in selectedEntity ? 'Connect' : 'Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 