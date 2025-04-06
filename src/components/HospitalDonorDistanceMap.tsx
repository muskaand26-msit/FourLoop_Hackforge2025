import React, { useEffect, useRef, useState } from 'react';
import { OlaMaps } from 'olamaps-web-sdk';
import { OLA_MAPS_CONFIG, validateOlaMapsConfig } from '../config/olaMaps';
import { geocodeAddress, calculateDistanceMatrix } from '../services/geocodingService';

interface HospitalDonorDistanceMapProps {
  hospitalName: string;
  hospitalAddress: string;
  donors: Array<{
    id: string;
    name: string;
    bloodType: string;
    longitude: number;
    latitude: number;
    distance: number;
  }>;
  className?: string;
}

export function HospitalDonorDistanceMap({
  hospitalName,
  hospitalAddress,
  donors,
  className = ''
}: HospitalDonorDistanceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitalLocation, setHospitalLocation] = useState<{lat: number; lng: number} | null>(null);
  const [donorDistances, setDonorDistances] = useState<Record<string, number>>({});

  // Geocode hospital address to get coordinates
  useEffect(() => {
    const getHospitalCoordinates = async () => {
      try {
        if (!hospitalAddress) {
          setError('Hospital address is required');
          setIsLoading(false);
          return;
        }
        
        // Get coordinates from address
        const result = await geocodeAddress(hospitalAddress);
        
        if (!result) {
          setError('Could not geocode hospital address');
          setIsLoading(false);
          return;
        }
        
        setHospitalLocation({
          lat: result.latitude,
          lng: result.longitude
        });
      } catch (error) {
        console.error('Error geocoding hospital address:', error);
        setError('Failed to get hospital location');
        setIsLoading(false);
      }
    };
    
    getHospitalCoordinates();
  }, [hospitalAddress]);

  // Calculate distances between hospital and donors
  useEffect(() => {
    const calculateDistances = async () => {
      if (!hospitalLocation || donors.length === 0) return;
      
      try {
        // Map donor coordinates to the format needed by the distance matrix API
        const donorCoordinates = donors.map(donor => ({
          lat: donor.latitude,
          lng: donor.longitude
        }));
        
        // Calculate distances
        const distances = await calculateDistanceMatrix(hospitalLocation, donorCoordinates);
        
        // Create a map of donor ID to distance
        const distanceMap: Record<string, number> = {};
        donors.forEach((donor, index) => {
          distanceMap[donor.id] = distances[index] || donor.distance; // Use original distance if API fails
        });
        
        setDonorDistances(distanceMap);
      } catch (error) {
        console.error('Error calculating distances:', error);
      }
    };
    
    calculateDistances();
  }, [hospitalLocation, donors]);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) {
        setError('Map container not found');
        setIsLoading(false);
        return;
      }
      
      if (!hospitalLocation) {
        // Wait for hospital location to be set
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Validate OLA Maps configuration
        if (!validateOlaMapsConfig()) {
          setError('OLA Maps configuration is invalid. Please check your environment variables.');
          setIsLoading(false);
          return;
        }

        // Initialize OlaMaps with API key
        const olaMaps = new OlaMaps({
          apiKey: OLA_MAPS_CONFIG.apiKey,
          mode: '2d'
        });

        // Initialize map with configuration
        const map = olaMaps.init({
          container: mapRef.current,
          center: [hospitalLocation.lng, hospitalLocation.lat],
          zoom: 12,
          style: OLA_MAPS_CONFIG.style,
          maxZoom: OLA_MAPS_CONFIG.maxZoom,
          minZoom: OLA_MAPS_CONFIG.minZoom,
          attributionControl: true,
          attribution: OLA_MAPS_CONFIG.attribution,
          preserveDrawingBuffer: OLA_MAPS_CONFIG.preserveDrawingBuffer,
          renderWorldCopies: false
        });

        mapInstanceRef.current = map;

        // Add zoom and navigation controls
        const navControl = olaMaps.addNavigationControls();
        map.addControl(navControl, 'top-right');

        // Wait for map to load before adding markers
        map.on('load', () => {
          try {
            // Add hospital marker
            const hospitalMarker = olaMaps.addMarker({
              color: '#FF0000', // Red color for hospital
              offset: [0, -15],
              anchor: 'bottom',
              draggable: false
            });
            
            hospitalMarker.setLngLat([hospitalLocation.lng, hospitalLocation.lat]);
            hospitalMarker.setPopup(
              olaMaps.addPopup({ 
                offset: [0, -30], 
                anchor: 'bottom',
                closeButton: true,
                closeOnClick: false
              })
              .setHTML(`
                <div style="padding: 12px; min-width: 220px;">
                  <strong style="font-size: 16px;">${hospitalName}</strong><br/>
                  <div style="margin-top: 8px;">
                    <span style="color: #555;">${hospitalAddress}</span>
                  </div>
                </div>
              `)
            );
            hospitalMarker.addTo(map);

            // Track bounds to fit all markers
            let minLng = hospitalLocation.lng;
            let maxLng = hospitalLocation.lng;
            let minLat = hospitalLocation.lat;
            let maxLat = hospitalLocation.lat;
            
            // Function to determine marker color based on blood type
            const getBloodTypeColor = (bloodType: string) => {
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

            // Add donor markers
            donors.forEach(donor => {
              try {
                // Validate donor coordinates
                if (typeof donor.longitude !== 'number' || typeof donor.latitude !== 'number' ||
                    isNaN(donor.longitude) || isNaN(donor.latitude)) {
                  console.error('Invalid donor coordinates:', donor);
                  return;
                }

                const color = getBloodTypeColor(donor.bloodType);
                const marker = olaMaps.addMarker({
                  color: color,
                  offset: [0, -15],
                  anchor: 'bottom',
                  draggable: false
                });
                
                // Get hospital to donor distance
                const distanceToHospital = donorDistances[donor.id] || donor.distance;
                
                marker.setLngLat([donor.longitude, donor.latitude]);
                marker.setPopup(
                  olaMaps.addPopup({ 
                    offset: [0, -30], 
                    anchor: 'bottom',
                    closeButton: true,
                    closeOnClick: false
                  })
                  .setHTML(`
                    <div style="padding: 12px; min-width: 220px;">
                      <strong style="font-size: 16px;">${donor.name}</strong><br/>
                      <div style="margin-top: 8px;">
                        <span style="color: #333; font-weight: bold; background-color: #f0f0f0; padding: 3px 6px; border-radius: 4px;">
                          Blood Type: ${donor.bloodType}
                        </span>
                      </div>
                      <div style="margin-top: 8px;">
                        <span style="color: #555;">From your location: <strong>${donor.distance.toFixed(1)} km</strong></span>
                      </div>
                      <div style="margin-top: 4px;">
                        <span style="color: #555;">To hospital: <strong>${distanceToHospital.toFixed(1)} km</strong></span>
                      </div>
                    </div>
                  `)
                );
                marker.addTo(map);

                // Draw a line between hospital and donor
                try {
                  if (map.getSource(`line-${donor.id}`)) {
                    // Remove existing line if it exists
                    map.removeLayer(`line-${donor.id}`);
                    map.removeSource(`line-${donor.id}`);
                  }
                
                  map.addSource(`line-${donor.id}`, {
                    'type': 'geojson',
                    'data': {
                      'type': 'Feature',
                      'properties': {},
                      'geometry': {
                        'type': 'LineString',
                        'coordinates': [
                          [hospitalLocation.lng, hospitalLocation.lat],
                          [donor.longitude, donor.latitude]
                        ]
                      }
                    }
                  });
                
                  map.addLayer({
                    'id': `line-${donor.id}`,
                    'type': 'line',
                    'source': `line-${donor.id}`,
                    'layout': {
                      'line-join': 'round',
                      'line-cap': 'round'
                    },
                    'paint': {
                      'line-color': color,
                      'line-width': 2,
                      'line-opacity': 0.7,
                      'line-dasharray': [2, 1]
                    }
                  });
                } catch (err) {
                  console.error('Error adding line:', err);
                }

                // Update bounds
                minLng = Math.min(minLng, donor.longitude);
                maxLng = Math.max(maxLng, donor.longitude);
                minLat = Math.min(minLat, donor.latitude);
                maxLat = Math.max(maxLat, donor.latitude);
              } catch (err) {
                console.error('Error adding donor marker:', err);
              }
            });

            // Fit bounds to include all markers
            if (donors.length > 0) {
              try {
                // Add padding to ensure markers are not at the edge
                const padding = Math.min(0.05, 0.01 + (donors.length * 0.005));
                
                map.fitBounds([
                  [minLng - padding, minLat - padding],
                  [maxLng + padding, maxLat + padding]
                ], {
                  padding: 50,
                  maxZoom: 13 // Limit zoom level to show a broader area
                });
              } catch (err) {
                console.error('Error fitting bounds:', err);
              }
            }

            setIsLoading(false);
          } catch (err) {
            console.error('Error in map load handler:', err);
            setError('Failed to initialize map markers');
            setIsLoading(false);
          }
        });

        // Handle map errors
        map.on('error', (err: any) => {
          console.error('Map error:', err);
          setError('An error occurred while loading the map. Please try refreshing the page.');
        });

        // Cleanup on unmount
        return () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
        };
      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize map');
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [hospitalLocation, donors, hospitalName, hospitalAddress, donorDistances]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <h3 className="text-xl font-semibold text-gray-800">Hospital-Donor Distance Map</h3>
      <p className="text-sm text-gray-600">
        This map shows the distance between the hospital and potential blood donors.
        <span className="ml-1 font-medium">Red marker</span> indicates the hospital location, and the colored lines show the route to each donor.
      </p>
      
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
        
        {/* Map Legend */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-md z-10">
          <h4 className="text-sm font-semibold mb-2">Blood Type Legend</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#004d00] mr-1"></span>
              <span>O- (Universal Donor)</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#008000] mr-1"></span>
              <span>O+</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#0000cc] mr-1"></span>
              <span>A-</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#3333ff] mr-1"></span>
              <span>A+</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#cc6600] mr-1"></span>
              <span>B-</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#ff9933] mr-1"></span>
              <span>B+</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#660066] mr-1"></span>
              <span>AB-</span>
            </div>
            <div className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-[#9933ff] mr-1"></span>
              <span>AB+ (Universal Recipient)</span>
            </div>
            <div className="flex items-center col-span-2 mt-1">
              <span className="h-3 w-3 rounded-full bg-[#FF0000] mr-1"></span>
              <span>Hospital Location</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distance Information */}
      {donors.length > 0 && Object.keys(donorDistances).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
          <h4 className="text-lg font-semibold mb-3">Distance Information</h4>
          <div className="space-y-3">
            {donors.map(donor => {
              const distanceToHospital = donorDistances[donor.id];
              
              // Determine distance category for visual indication
              let distanceClass = "text-green-600";
              let distanceLabel = "Nearby";
              
              if (distanceToHospital) {
                if (distanceToHospital > 15) {
                  distanceClass = "text-red-600";
                  distanceLabel = "Far";
                } else if (distanceToHospital > 8) {
                  distanceClass = "text-yellow-600";
                  distanceLabel = "Moderate";
                }
              }
              
              return (
                <div key={donor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-2" 
                           style={{ 
                             backgroundColor: donor.bloodType === 'O-' ? '#004d00' : 
                                             donor.bloodType === 'O+' ? '#008000' :
                                             donor.bloodType === 'A-' ? '#0000cc' :
                                             donor.bloodType === 'A+' ? '#3333ff' :
                                             donor.bloodType === 'B-' ? '#cc6600' :
                                             donor.bloodType === 'B+' ? '#ff9933' :
                                             donor.bloodType === 'AB-' ? '#660066' :
                                             donor.bloodType === 'AB+' ? '#9933ff' : '#4CAF50'
                           }}></div>
                      <p className="font-medium">{donor.name}</p>
                    </div>
                    <p className="text-sm text-gray-600">Blood Type: {donor.bloodType}</p>
                    <div className="flex flex-col space-y-1 mt-1">
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">From your location:</span> {donor.distance.toFixed(1)} km
                      </span>
                      {distanceToHospital && (
                        <span className="text-sm flex items-center">
                          <span className="font-medium text-gray-600">To hospital:</span> 
                          <span className={`ml-1 ${distanceClass} font-semibold`}>
                            {distanceToHospital.toFixed(1)} km
                          </span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${distanceClass.replace('text', 'bg')}/10 ${distanceClass}`}>
                            {distanceLabel}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      // Handle donor selection here
                      console.log('Selected donor:', donor);
                    }}
                  >
                    Contact
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 