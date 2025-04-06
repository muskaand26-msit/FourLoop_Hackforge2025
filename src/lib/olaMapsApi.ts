// OLA Maps API integration
import axios from 'axios';

// Add declaration for window.env
declare global {
  interface Window {
    env?: {
      VITE_OLA_MAPS_API_KEY?: string;
    };
  }
}

// Get API Key from environment variables
const OLA_MAPS_API_KEY = 
  // Try to get from import.meta.env first (Vite's way)
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OLA_MAPS_API_KEY) ||
  // Then try window.env if defined
  (typeof window !== 'undefined' && window.env && window.env.VITE_OLA_MAPS_API_KEY) || 
  // Fallback to demo key only if everything else fails
  'n1AWiUYhgUz1qjiemAkVfMxuTOntjxrbProAtSD0'; // Using the key from .env as fallback

console.log('Using OLA Maps API key:', OLA_MAPS_API_KEY.substring(0, 5) + '...[hidden]');

interface DistanceMatrixResponse {
  data: {
    origins: Array<{ lat: number; lng: number }>;
    destinations: Array<{ lat: number; lng: number }>;
    matrix: Array<{
      elements: Array<{
        distance: { value: number; text: string };
        duration: { value: number; text: string };
        status: string;
      }>;
    }>;
  };
}

/**
 * Get distance and time estimation between origins and destinations
 * @param origins Array of origin coordinates [lat,lng]
 * @param destinations Array of destination coordinates [lat,lng]
 * @returns Promise with distance matrix data
 */
export async function getDistanceMatrix(
  origins: Array<[number, number]>,
  destinations: Array<[number, number]>
): Promise<DistanceMatrixResponse> {
  try {
    // Format origins and destinations for OLA Maps API
    const originsParam = origins
      .map((origin) => `${origin[0]},${origin[1]}`)
      .join('|');
    const destinationsParam = destinations
      .map((dest) => `${dest[0]},${dest[1]}`)
      .join('|');
    
    // Encode parameters
    const encodedOrigins = encodeURIComponent(originsParam);
    const encodedDestinations = encodeURIComponent(destinationsParam);
    
    // Make API call to OLA Maps Distance Matrix API
    const response = await axios.get(
      `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${encodedOrigins}&destinations=${encodedDestinations}&api_key=${OLA_MAPS_API_KEY}`,
      {
        headers: {
          'X-Request-Id': `lifelink-${Date.now()}`,
        }
      }
    );
    
    return response;
  } catch (error) {
    console.error('Error fetching distance matrix from OLA Maps:', error);
    
    // Return fallback data in case of API error
    return {
      data: {
        origins: origins.map(origin => ({ lat: origin[0], lng: origin[1] })),
        destinations: destinations.map(dest => ({ lat: dest[0], lng: dest[1] })),
        matrix: origins.map(() => ({
          elements: destinations.map(() => ({
            // Fallback to approximate calculations
            distance: { 
              value: 0, 
              text: 'Unknown' 
            },
            duration: { 
              value: 0, 
              text: 'Unknown' 
            },
            status: 'FALLBACK'
          }))
        }))
      }
    };
  }
}

/**
 * Calculate estimated travel time using Haversine formula and average speed
 * Used as fallback when API is not available
 */
export function calculateEstimatedTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  averageSpeedKph: number = 30
): { distanceKm: number; durationMinutes: number } {
  // Haversine formula to calculate distance
  const R = 6371; // Earth's radius in km
  const dLat = (destLat - originLat) * Math.PI / 180;
  const dLng = (destLng - originLng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;
  
  // Calculate duration based on average speed
  const durationHours = distanceKm / averageSpeedKph;
  const durationMinutes = Math.round(durationHours * 60);
  
  return { distanceKm, durationMinutes };
} 