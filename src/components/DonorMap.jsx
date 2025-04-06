import React, { useState, useEffect } from 'react';
import LocationMap from './LocationMap';
import { getNearbyDonors } from '../services/donorService';

const DonorMap = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyDonors, setNearbyDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationUpdate = async (location) => {
    setUserLocation(location);
    setLoading(true);
    setError(null);

    try {
      const donors = await getNearbyDonors(location);
      setNearbyDonors(donors);
    } catch (err) {
      setError('Failed to fetch nearby donors. Please try again.');
      console.error('Error fetching donors:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donor-map-container">
      <div className="map-header">
        <h2>Find Blood Donors Near You</h2>
        {loading && <p>Loading nearby donors...</p>}
        {error && <p className="error">{error}</p>}
      </div>
      
      <div className="map-content">
        <LocationMap 
          onLocationUpdate={handleLocationUpdate}
          donors={nearbyDonors}
        />
      </div>

      <div className="donor-list">
        <h3>Nearby Donors</h3>
        {nearbyDonors.length === 0 ? (
          <p>No donors found nearby. Try moving to a different location.</p>
        ) : (
          <ul>
            {nearbyDonors.map(donor => (
              <li key={donor.id}>
                <h4>{donor.name}</h4>
                <p>Blood Type: {donor.bloodType}</p>
                <p>Distance: {donor.distance}km</p>
                <p>Last Donated: {new Date(donor.lastDonated).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DonorMap; 