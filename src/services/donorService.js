import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export const getNearbyDonors = async (location) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/donors/nearby`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 20 // Search radius in kilometers
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby donors:', error);
    throw error;
  }
};

export const getDonorDetails = async (donorId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/donors/${donorId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching donor details:', error);
    throw error;
  }
};

export const updateDonorLocation = async (donorId, location) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/donors/${donorId}/location`, {
      latitude: location.latitude,
      longitude: location.longitude
    });
    return response.data;
  } catch (error) {
    console.error('Error updating donor location:', error);
    throw error;
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

const toRad = (value) => {
  return value * Math.PI / 180;
}; 