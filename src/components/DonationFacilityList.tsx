import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, MapPin, Building2, ExternalLink, ChevronRight, ArrowLeftCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { calculateEstimatedTime, getDistanceMatrix } from '../lib/olaMapsApi';
import { formatDateForDB, formatDateForDisplay, getDayOfWeek } from '../lib/dateUtils';

interface BloodBank {
  bank_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  operating_hours: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  has_slots: boolean;
  estimated_time_minutes: number;
  actual_duration_minutes?: number;
}

interface Hospital {
  hospital_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  operating_hours: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  has_slots: boolean;
  estimated_time_minutes: number;
  actual_duration_minutes?: number;
}

interface SlotData {
  id: string;
  blood_bank_id?: string;
  hospital_id?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  capacity: number;
  slot_type: 'hospital' | 'blood_bank';
}

interface DonationFacilityListProps {
  selectedDate: Date;
  onSelectFacility: (id: string, type: 'blood_bank' | 'hospital') => void;
  onBack: () => void;
}

export function DonationFacilityList({ selectedDate, onSelectFacility, onBack }: DonationFacilityListProps) {
  const [loading, setLoading] = useState(true);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Add test function to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testHospitalSlots = async (date: string = '2025-04-07') => {
        try {
          console.log(`Testing slots for date: ${date}`);
          
          // Format for display
          const displayDate = new Date(date);
          const dayOfWeek = getDayOfWeek(displayDate);
          console.log(`Day of week: ${dayOfWeek}`);
          
          // Direct database call with default location
          const { data, error } = await supabase
            .rpc('find_hospitals_with_slots', {
              p_date: date,
              p_donor_latitude: 12.9716,
              p_donor_longitude: 77.5946,
              p_radius_km: 100
            });
          
          if (error) {
            console.error('Error testing hospital slots:', error);
            return;
          }
          
          console.log('Raw hospital data:', data);
          console.log('Hospitals with slots:', data.filter((h: Hospital) => h.has_slots));
          
          // Also test a direct query to see all hospital slots for this day
          const { data: slotsData, error: slotsError } = await supabase
            .from('hospital_donation_slots')
            .select('*, hospital:hospitals(name, is_license_verified)')
            .eq('day_of_week', dayOfWeek);
          
          if (slotsError) {
            console.error('Error fetching slots directly:', slotsError);
            return;
          }
          
          console.log(`Direct query for ${dayOfWeek} slots:`, slotsData);
        } catch (err) {
          console.error('Testing error:', err);
        }
      };
      
      console.log('Test function added to window. Call window.testHospitalSlots() in console to debug');
    }
  }, []);

  // Get user's location
  useEffect(() => {
    getUserLocation();
  }, []);

  // Fetch facilities when we have user location
  useEffect(() => {
    if (userLocation) {
      fetchFacilities();
    }
  }, [userLocation, selectedDate]);

  // Get user's current location
  const getUserLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to a default location (e.g., city center)
          setUserLocation({ lat: 12.9716, lng: 77.5946 }); // Bangalore coordinates
          setLoadingLocation(false);
          toast.error("Couldn't get your location. Using default city center.");
        }
      );
    } else {
      // Fallback for browsers without geolocation
      setUserLocation({ lat: 12.9716, lng: 77.5946 }); // Bangalore coordinates
      setLoadingLocation(false);
      toast.error("Geolocation is not supported by your browser. Using default city center.");
    }
  };

  // Fetch blood banks and hospitals with available slots
  const fetchFacilities = async () => {
    if (!userLocation || !selectedDate) return;
    
    setLoading(true);
    
    try {
      // Format date for database query using our utility
      const dateString = formatDateForDB(selectedDate);
      const dayOfWeek = getDayOfWeek(selectedDate);
      
      console.log('Fetching facilities for date:', dateString);
      console.log('Selected date is a:', dayOfWeek);
      
      // Fetch blood banks with available slots
      const { data: bloodBankData, error: bloodBankError } = await supabase
        .rpc('find_blood_banks_with_slots', {
          p_date: dateString,
          p_donor_latitude: userLocation.lat,
          p_donor_longitude: userLocation.lng,
          p_radius_km: 50
        });
      
      if (bloodBankError) {
        console.error('Blood bank error:', bloodBankError);
        throw bloodBankError;
      }
      
      console.log('Blood bank data received:', bloodBankData);
      
      // Fetch hospitals with available slots
      const { data: hospitalData, error: hospitalError } = await supabase
        .rpc('find_hospitals_with_slots', {
          p_date: dateString,
          p_donor_latitude: userLocation.lat,
          p_donor_longitude: userLocation.lng,
          p_radius_km: 50
        });
      
      if (hospitalError) {
        console.error('Hospital error:', hospitalError);
        throw hospitalError;
      }
      
      console.log('Hospital data received:', hospitalData);
      
      // Filter facilities that have available slots
      const availableBloodBanks = bloodBankData.filter((bank: BloodBank) => bank.has_slots);
      const availableHospitals = hospitalData.filter((hospital: Hospital) => hospital.has_slots);
      
      console.log('Available blood banks:', availableBloodBanks);
      console.log('Available hospitals:', availableHospitals);
      
      // If no facilities found via RPC, try a direct query as a fallback
      if (availableBloodBanks.length === 0 && availableHospitals.length === 0) {
        console.log(`No facilities found through RPC call. Trying direct slots query for ${dayOfWeek}`);
        
        // Use our direct slots fetching function
        const foundFacilitiesDirectly = await fetchDirectSlots(dayOfWeek);
        
        if (foundFacilitiesDirectly) {
          console.log('Successfully found facilities using direct slots query');
        } else {
          console.log('No facilities found through any method');
        }
      } else {
        setBloodBanks(availableBloodBanks);
        setHospitals(availableHospitals);
        
        // Use OLA Maps API to get more accurate travel times if we have facilities
        if (availableBloodBanks.length > 0 || availableHospitals.length > 0) {
          updateTravelTimes(availableBloodBanks, availableHospitals);
        }
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error('Failed to load blood donation facilities');
    } finally {
      setLoading(false);
    }
  };

  // Use OLA Maps API to update travel times
  const updateTravelTimes = async (banks: BloodBank[], hospitals: Hospital[]) => {
    try {
      if (!userLocation) return;
      
      // Prepare origins (just the user location)
      const origins: Array<[number, number]> = [[userLocation.lat, userLocation.lng]];
      
      // Prepare destinations (all facilities)
      const destinations: Array<[number, number]> = [
        ...banks.map(bank => [bank.latitude, bank.longitude] as [number, number]),
        ...hospitals.map(hospital => [hospital.latitude, hospital.longitude] as [number, number])
      ];
      
      if (destinations.length === 0) return;
      
      // Call OLA Maps API
      const response = await getDistanceMatrix(origins, destinations);
      
      // Process response
      if (response.data && response.data.matrix && response.data.matrix[0]) {
        const elements = response.data.matrix[0].elements;
        
        // Update blood banks with actual duration
        const updatedBanks = banks.map((bank, i) => {
          if (elements[i] && elements[i].duration) {
            return {
              ...bank,
              actual_duration_minutes: Math.round(elements[i].duration.value / 60)
            };
          }
          return bank;
        });
        
        // Update hospitals with actual duration
        const updatedHospitals = hospitals.map((hospital, i) => {
          const index = banks.length + i;
          if (elements[index] && elements[index].duration) {
            return {
              ...hospital,
              actual_duration_minutes: Math.round(elements[index].duration.value / 60)
            };
          }
          return hospital;
        });
        
        setBloodBanks(updatedBanks);
        setHospitals(updatedHospitals);
      }
    } catch (error) {
      console.error('Error updating travel times:', error);
      // We'll continue with the estimated times
    }
  };

  // Format the date for display
  const formattedDate = selectedDate ? formatDateForDisplay(selectedDate) : '';

  // Format duration in minutes to human-readable time
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours} hr ${remainingMinutes} min` 
      : `${hours} hr`;
  };

  // Directly query the slots tables
  const fetchDirectSlots = async (dayOfWeek: string) => {
    if (!userLocation) return false;
    
    try {
      // 1. First try blood bank slots
      const { data: bloodBankSlots, error: bbSlotError } = await supabase
        .from('blood_bank_slots')
        .select(`
          id, 
          blood_bank_id, 
          day_of_week,
          start_time, 
          end_time, 
          capacity,
          blood_bank:blood_banks(
            id, 
            name, 
            address, 
            city, 
            state, 
            phone, 
            operating_hours,
            latitude, 
            longitude,
            is_verified
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .filter('capacity', 'gt', 0);
      
      if (bbSlotError) {
        console.error('Error fetching blood bank slots:', bbSlotError);
      }
      
      // 2. Try hospital slots
      const { data: hospitalSlots, error: hSlotError } = await supabase
        .from('hospital_donation_slots')
        .select(`
          id, 
          hospital_id, 
          day_of_week,
          start_time, 
          end_time, 
          capacity,
          hospital:hospitals(
            id, 
            name, 
            address, 
            phone, 
            email,
            operating_hours, 
            latitude, 
            longitude,
            is_license_verified
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .filter('capacity', 'gt', 0);
      
      if (hSlotError) {
        console.error('Error fetching hospital slots:', hSlotError);
      }
      
      console.log('Direct blood bank slots:', bloodBankSlots);
      console.log('Direct hospital slots:', hospitalSlots);
      
      // Process blood banks
      if (bloodBankSlots && bloodBankSlots.length > 0) {
        // Group slots by blood bank
        const bloodBankMap = new Map<string, any>();
        
        // Filter out slots with no blood bank data or unverified blood banks
        const validBloodBankSlots = bloodBankSlots.filter(
          slot => slot.blood_bank && slot.blood_bank.is_verified
        );
        
        // Group slots by blood bank ID
        validBloodBankSlots.forEach(slot => {
          const bankId = slot.blood_bank_id;
          if (!bloodBankMap.has(bankId)) {
            bloodBankMap.set(bankId, {
              bank: slot.blood_bank,
              slots: []
            });
          }
          
          bloodBankMap.get(bankId).slots.push({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity: slot.capacity
          });
        });
        
        // Convert to array and calculate distances
        const bankArray: BloodBank[] = Array.from(bloodBankMap.values()).map(({ bank, slots }) => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            bank.latitude,
            bank.longitude
          );
          
          return {
            bank_id: bank.id,
            name: bank.name,
            address: bank.address,
            city: bank.city || '',
            state: bank.state || '',
            phone: bank.phone || '',
            operating_hours: bank.operating_hours || '',
            latitude: bank.latitude,
            longitude: bank.longitude,
            distance_km: distance,
            has_slots: slots.length > 0,
            estimated_time_minutes: Math.round(distance * 2) // Rough estimate: 2 min per km
          };
        });
        
        // Sort by distance
        const sortedBanks = bankArray.sort((a, b) => a.distance_km - b.distance_km);
        console.log('Processed blood banks from slots:', sortedBanks);
        
        setBloodBanks(sortedBanks);
      }
      
      // Process hospitals
      if (hospitalSlots && hospitalSlots.length > 0) {
        // Group slots by hospital
        const hospitalMap = new Map<string, any>();
        
        // Filter out slots with no hospital data or unverified hospitals
        const validHospitalSlots = hospitalSlots.filter(
          slot => slot.hospital && slot.hospital.is_license_verified
        );
        
        // Group slots by hospital ID
        validHospitalSlots.forEach(slot => {
          const hospitalId = slot.hospital_id;
          if (!hospitalMap.has(hospitalId)) {
            hospitalMap.set(hospitalId, {
              hospital: slot.hospital,
              slots: []
            });
          }
          
          hospitalMap.get(hospitalId).slots.push({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            capacity: slot.capacity
          });
        });
        
        // Convert to array and calculate distances
        const hospitalArray: Hospital[] = Array.from(hospitalMap.values()).map(({ hospital, slots }) => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            hospital.latitude,
            hospital.longitude
          );
          
          return {
            hospital_id: hospital.id,
            name: hospital.name,
            address: hospital.address,
            phone: hospital.phone || '',
            email: hospital.email || '',
            operating_hours: hospital.operating_hours || '',
            latitude: hospital.latitude,
            longitude: hospital.longitude,
            distance_km: distance,
            has_slots: slots.length > 0,
            estimated_time_minutes: Math.round(distance * 2) // Rough estimate: 2 min per km
          };
        });
        
        // Sort by distance
        const sortedHospitals = hospitalArray.sort((a, b) => a.distance_km - b.distance_km);
        console.log('Processed hospitals from slots:', sortedHospitals);
        
        setHospitals(sortedHospitals);
      }
      
      // Check if we found any facilities
      return (bloodBankSlots && bloodBankSlots.length > 0) || (hospitalSlots && hospitalSlots.length > 0);
    } catch (error) {
      console.error('Error in direct slots fetch:', error);
      return false;
    }
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <button 
          onClick={onBack}
          className="text-red-500 flex items-center mb-4 hover:text-red-600"
        >
          <ArrowLeftCircle className="h-5 w-5 mr-1" />
          Change Date
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Available Donation Facilities</h1>
        <p className="text-gray-600 mt-2">
          Showing facilities with available donation slots on {formattedDate}
        </p>
      </div>

      {(loadingLocation || loading) ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 text-red-500 animate-spin mb-4" />
          <p className="text-gray-500">
            {loadingLocation 
              ? 'Getting your location...' 
              : 'Finding available donation facilities...'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {bloodBanks.length === 0 && hospitals.length === 0 ? (
            <div className="text-center py-10 border border-gray-200 rounded-lg">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Available Facilities</h3>
              <p className="text-gray-500 mt-2">
                No blood banks or hospitals with available slots found for this date.
                <br />
                Please try a different date or check back later.
              </p>
              <button
                onClick={onBack}
                className="mt-4 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Select Another Date
              </button>
            </div>
          ) : (
            <>
              {/* Blood Banks Section */}
              {bloodBanks.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Blood Banks</h2>
                  <div className="space-y-4">
                    {bloodBanks.map((bank) => (
                      <div key={bank.bank_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{bank.name}</h3>
                            <div className="flex items-start mt-1">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                              <p className="text-gray-600 text-sm">
                                {bank.address}
                                {bank.city && `, ${bank.city}`}
                                {bank.state && `, ${bank.state}`}
                              </p>
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 text-gray-500 mr-1 flex-shrink-0" />
                              <p className="text-gray-600 text-sm">
                                {bank.operating_hours || 'Hours not available'}
                              </p>
                            </div>
                            {bank.phone && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Phone:</span> {bank.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium mb-2">
                              {bank.distance_km.toFixed(1)} km away
                            </div>
                            <div className="text-xs text-gray-500">
                              ~{formatDuration(bank.actual_duration_minutes || bank.estimated_time_minutes)} travel time
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <a 
                            href={`https://maps.google.com/?q=${bank.latitude},${bank.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm flex items-center hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open in Maps
                          </a>
                          <button
                            onClick={() => onSelectFacility(bank.bank_id, 'blood_bank')}
                            className="flex items-center text-sm font-medium text-red-500 hover:text-red-700"
                          >
                            View Slots
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hospitals Section */}
              {hospitals.length > 0 && (
                <div className={bloodBanks.length > 0 ? "mt-8" : ""}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Hospitals</h2>
                  <div className="space-y-4">
                    {hospitals.map((hospital) => (
                      <div key={hospital.hospital_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{hospital.name}</h3>
                            <div className="flex items-start mt-1">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-1 flex-shrink-0" />
                              <p className="text-gray-600 text-sm">{hospital.address}</p>
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="h-4 w-4 text-gray-500 mr-1 flex-shrink-0" />
                              <p className="text-gray-600 text-sm">
                                {hospital.operating_hours || 'Hours not available'}
                              </p>
                            </div>
                            {hospital.phone && (
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Phone:</span> {hospital.phone}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium mb-2">
                              {hospital.distance_km.toFixed(1)} km away
                            </div>
                            <div className="text-xs text-gray-500">
                              ~{formatDuration(hospital.actual_duration_minutes || hospital.estimated_time_minutes)} travel time
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <a 
                            href={`https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm flex items-center hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open in Maps
                          </a>
                          <button
                            onClick={() => onSelectFacility(hospital.hospital_id, 'hospital')}
                            className="flex items-center text-sm font-medium text-red-500 hover:text-red-700"
                          >
                            View Slots
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 