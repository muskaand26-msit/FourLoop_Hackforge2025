import axios from 'axios';
import { OLA_MAPS_CONFIG } from '../config/olaMaps';

// Interface for geocoding response
interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// Simple cache to avoid repeated geocoding requests
const geocodeCache: Record<string, GeocodingResult> = {};

// Hardcoded geocoding data for common locations in Kolkata
const KNOWN_LOCATIONS: Record<string, GeocodingResult> = {
  'Kasba Golpark': {
    latitude: 22.5110,
    longitude: 88.3747,
    formattedAddress: 'Kasba Golpark, E. M. Bypass, Kolkata, West Bengal 700107'
  },
  'Anandapur': {
    latitude: 22.5131,
    longitude: 88.3994,
    formattedAddress: 'Anandapur, Kolkata, West Bengal'
  },
  'Sector I': {
    latitude: 22.5124,
    longitude: 88.3769,
    formattedAddress: 'Sector I, Kasba, Kolkata, West Bengal 700107'
  },
  'E. M. Bypass': {
    latitude: 22.5193,
    longitude: 88.3932,
    formattedAddress: 'E. M. Bypass, Kolkata, West Bengal'
  },
  'Kasba': {
    latitude: 22.5093,
    longitude: 88.3800,
    formattedAddress: 'Kasba, Kolkata, West Bengal 700042'
  },
  'Golpark': {
    latitude: 22.5110,
    longitude: 88.3747,
    formattedAddress: 'Golpark, Kolkata, West Bengal 700107'
  },
  'Ruby General Hospital': {
    latitude: 22.5148,
    longitude: 88.4017,
    formattedAddress: 'Ruby General Hospital, E.M. Bypass, Kasba, Kolkata, West Bengal 700107'
  },
  '576, Anandapur Main Rd': {
    latitude: 22.5139,
    longitude: 88.3968,
    formattedAddress: '576, Anandapur Main Rd, Golpark, Sector I, Kasba, Kolkata, West Bengal 700107'
  },
  'Salt Lake': {
    latitude: 22.5697,
    longitude: 88.4173,
    formattedAddress: 'Salt Lake, Kolkata, West Bengal'
  },
  'Park Street': {
    latitude: 22.5553,
    longitude: 88.3517,
    formattedAddress: 'Park Street, Kolkata, West Bengal'
  },
  'Howrah': {
    latitude: 22.5958,
    longitude: 88.2636,
    formattedAddress: 'Howrah, West Bengal'
  },
  'New Town': {
    latitude: 22.6280,
    longitude: 88.4455,
    formattedAddress: 'New Town, Kolkata, West Bengal'
  },
  'Dum Dum': {
    latitude: 22.6423,
    longitude: 88.4292,
    formattedAddress: 'Dum Dum, Kolkata, West Bengal'
  },
  'Barasat': {
    latitude: 22.7251,
    longitude: 88.4798,
    formattedAddress: 'Barasat, West Bengal'
  },
  'Sealdah': {
    latitude: 22.5677,
    longitude: 88.3704,
    formattedAddress: 'Sealdah, Kolkata, West Bengal'
  },
  'Gariahat': {
    latitude: 22.5163,
    longitude: 88.3689,
    formattedAddress: 'Gariahat, Kolkata, West Bengal'
  },
  'Esplanade': {
    latitude: 22.5698,
    longitude: 88.3509,
    formattedAddress: 'Esplanade, Kolkata, West Bengal'
  },
  'Ruby Hospital': {
    latitude: 22.5128,
    longitude: 88.4030,
    formattedAddress: 'Ruby Hospital, E.M. Bypass, Kolkata, West Bengal'
  },
  'AMRI Hospital': {
    latitude: 22.5142,
    longitude: 88.3969,
    formattedAddress: 'AMRI Hospital, Dhakuria, Kolkata, West Bengal'
  },
  'Science City': {
    latitude: 22.5387,
    longitude: 88.3952,
    formattedAddress: 'Science City, Kolkata, West Bengal'
  },
  // Adding more precise locations in and around Kasba Golpark area
  'Kasba New Market': {
    latitude: 22.5109,
    longitude: 88.3746,
    formattedAddress: 'Kasba New Market, Kolkata, West Bengal 700042'
  },
  'Kasba Golpark Main Road': {
    latitude: 22.5110,
    longitude: 88.3747,
    formattedAddress: 'Kasba Golpark Main Road, Kolkata, West Bengal 700107'
  },
  'Acropolis Mall': {
    latitude: 22.5141,
    longitude: 88.3954,
    formattedAddress: 'Acropolis Mall, 1858/1, Rajdanga Main Rd, Kasba, Kolkata, West Bengal 700107'
  },
  'Ajaynagar': {
    latitude: 22.5056,
    longitude: 88.3742,
    formattedAddress: 'Ajaynagar, Kolkata, West Bengal 700075'
  },
  'Rajdanga Main Road': {
    latitude: 22.5167,
    longitude: 88.3917,
    formattedAddress: 'Rajdanga Main Road, Kasba, Kolkata, West Bengal 700107'
  },
  'Panchashayar': {
    latitude: 22.4980,
    longitude: 88.3917,
    formattedAddress: 'Panchashayar, Kolkata, West Bengal 700094'
  },
  'Mukundapur': {
    latitude: 22.5075,
    longitude: 88.4022,
    formattedAddress: 'Mukundapur, Kolkata, West Bengal 700099'
  },
  'Santoshpur': {
    latitude: 22.4877,
    longitude: 88.3828,
    formattedAddress: 'Santoshpur, Kolkata, West Bengal 700075'
  },
  'Jadavpur': {
    latitude: 22.4972,
    longitude: 88.3714,
    formattedAddress: 'Jadavpur, Kolkata, West Bengal 700032'
  },
  'Survey Park': {
    latitude: 22.4883,
    longitude: 88.3853,
    formattedAddress: 'Survey Park, Santoshpur, Kolkata, West Bengal 700075'
  },
  'South City Mall': {
    latitude: 22.4901,
    longitude: 88.3632,
    formattedAddress: 'South City Mall, Prince Anwar Shah Rd, Kolkata, West Bengal 700045'
  }
};

/**
 * Geocodes an address to get coordinates using a smart lookup approach
 * First tries local cache, then known locations, then falls back to default
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  // Normalize address string
  const normalizedAddress = address.trim().toLowerCase();
  
  // Check cache first
  if (geocodeCache[normalizedAddress]) {
    console.log('Using cached geocoding result for:', address);
    return geocodeCache[normalizedAddress];
  }

  try {
    // Check for exact matches in the address
    for (const [key, location] of Object.entries(KNOWN_LOCATIONS)) {
      if (normalizedAddress === key.toLowerCase()) {
        console.log(`Found exact match for "${address}": ${key}`);
        // Store in cache
        geocodeCache[normalizedAddress] = {
          ...location,
          formattedAddress: address
        };
        return geocodeCache[normalizedAddress];
      }
    }
    
    // Check if the address contains any of our known locations
    const matchingLocations: Array<{key: string, score: number, location: GeocodingResult}> = [];
    
    // Calculate a score for each known location (higher is better match)
    for (const [key, location] of Object.entries(KNOWN_LOCATIONS)) {
      const keyLower = key.toLowerCase();
      if (normalizedAddress.includes(keyLower)) {
        // Calculate a match score based on how much of the address is matched
        // and how specific the match is (longer key = more specific)
        const score = (keyLower.length / normalizedAddress.length) * 100 * keyLower.length;
        matchingLocations.push({ key, score, location });
      }
    }
    
    // Sort by score descending and use the best match
    if (matchingLocations.length > 0) {
      matchingLocations.sort((a, b) => b.score - a.score);
      const bestMatch = matchingLocations[0];
      
      console.log(`Found best matching location for "${address}": ${bestMatch.key} (score: ${bestMatch.score.toFixed(2)})`);
      
      // Store in cache
      geocodeCache[normalizedAddress] = {
        ...bestMatch.location,
        formattedAddress: address
      };
      return geocodeCache[normalizedAddress];
    }
    
    // Try to extract coordinates directly from the address if they're included
    const result = extractCoordinates(address);
    if (result) {
      geocodeCache[normalizedAddress] = result;
      return result;
    }
    
    // If all else fails, try Ola Maps API (this is likely to fail due to CORS)
    try {
      const apiResult = await olaGeocodeAddress(address);
      if (apiResult) {
        geocodeCache[normalizedAddress] = apiResult;
        return apiResult;
      }
    } catch (error) {
      console.warn('API geocoding failed, continuing with fallback');
    }
    
    // Special handling for Kasba Golpark area
    if (normalizedAddress.includes('kasba') || normalizedAddress.includes('golpark')) {
      console.log('Using Kasba Golpark coordinates for address:', address);
      const fallback = {
        latitude: KNOWN_LOCATIONS['Kasba Golpark'].latitude,
        longitude: KNOWN_LOCATIONS['Kasba Golpark'].longitude,
        formattedAddress: address
      };
      
      geocodeCache[normalizedAddress] = fallback;
      return fallback;
    }
    
    // Word-based matching for enhanced precision
    const addressWords = normalizedAddress.split(/\s+/);
    
    // Find matches based on individual words or compounds
    const wordMatches: Array<{key: string, score: number, location: GeocodingResult}> = [];
    
    for (const [key, location] of Object.entries(KNOWN_LOCATIONS)) {
      const keyWords = key.toLowerCase().split(/\s+/);
      let matchScore = 0;
      
      // Check if any word in the key is present in the address
      for (const word of keyWords) {
        if (word.length > 3 && addressWords.includes(word)) {
          // Words that match exactly get higher scores
          matchScore += word.length * 2;
        } else if (word.length > 3) {
          // Check for partial word matches
          for (const addressWord of addressWords) {
            if (addressWord.includes(word) || word.includes(addressWord)) {
              // Give partial credit for partial matches
              matchScore += Math.min(word.length, addressWord.length);
            }
          }
        }
      }
      
      if (matchScore > 0) {
        wordMatches.push({key, score: matchScore, location});
      }
    }
    
    if (wordMatches.length > 0) {
      wordMatches.sort((a, b) => b.score - a.score);
      const bestWordMatch = wordMatches[0];
      
      console.log(`Using word-based match ${bestWordMatch.key} for address:`, address);
      const fallback = {
        latitude: bestWordMatch.location.latitude,
        longitude: bestWordMatch.location.longitude,
        formattedAddress: address
      };
      
      geocodeCache[normalizedAddress] = fallback;
      return fallback;
    }
    
    // Fallback to default location in Kolkata
    console.log('Using default coordinates for address:', address);
    const fallback = {
      latitude: OLA_MAPS_CONFIG.defaultLocation.lat,
      longitude: OLA_MAPS_CONFIG.defaultLocation.lng,
      formattedAddress: address
    };
    
    geocodeCache[normalizedAddress] = fallback;
    return fallback;
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    
    // Always return something valid to prevent app crashes
    return {
      latitude: OLA_MAPS_CONFIG.defaultLocation.lat,
      longitude: OLA_MAPS_CONFIG.defaultLocation.lng,
      formattedAddress: address
    };
  }
};

/**
 * Attempts to geocode using Ola Maps API
 * Note: This will likely fail in development due to CORS
 */
const olaGeocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  try {
    // URL encode the address
    const encodedAddress = encodeURIComponent(address);
    
    // Create the API request URL with the address and API key
    const url = `https://api.olamaps.io/v1/geocode?address=${encodedAddress}&key=${OLA_MAPS_CONFIG.apiKey}`;
    
    // Make direct API request (will only work if CORS is properly configured)
    const response = await axios.get(url, {
      headers: OLA_MAPS_CONFIG.headers
    });
    
    // Check if the response contains results
    if (response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to geocode with Ola Maps API, falling back to alternative method');
    return null;
  }
};

/**
 * Extract coordinates from address string if present
 */
const extractCoordinates = (address: string): GeocodingResult | null => {
  // Try to extract coordinates from the address if they're included
  const coordsMatch = address.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  
  if (coordsMatch) {
    const latitude = parseFloat(coordsMatch[1]);
    const longitude = parseFloat(coordsMatch[2]);
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      return {
        latitude,
        longitude,
        formattedAddress: address
      };
    }
  }
  
  return null;
};

/**
 * Calculate the distance between two coordinates using the Haversine formula
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

/**
 * Calculate distance matrix between one origin and multiple destinations
 * Uses Haversine formula to calculate distances directly without requiring API calls
 */
export const calculateDistanceMatrix = async (
  origin: { lat: number; lng: number },
  destinations: Array<{ lat: number; lng: number }>
): Promise<number[]> => {
  try {
    // Use Haversine formula to calculate distances directly
    return destinations.map(dest => 
      calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng)
    );
  } catch (error) {
    console.error('Error calculating distance matrix:', error);
    
    // Return default distances as fallback
    return destinations.map(() => 5); // Default 5km distance as fallback
  }
}; 