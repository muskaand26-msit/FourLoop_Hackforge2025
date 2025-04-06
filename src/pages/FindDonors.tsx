import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Filter, Users, Phone, Calendar, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { calculateDistance } from '../lib/geolocation';
import { ChatButton } from '../components/ChatButton';

interface DonorSearchFilters {
  bloodType?: string;
  location?: string;
  distance?: number;
  availability?: boolean;
  lastDonation?: string;
}

interface Donor {
  id: string;
  first_name: string;
  last_name: string;
  blood_type: string;
  phone: string;
  address: string;
  last_donation_date: string | null;
  is_available: boolean;
  latitude: number | null;
  longitude: number | null;
  response_rate: number;
}

const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const DISTANCE_OPTIONS = [
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
];

export function FindDonors() {
  const [filters, setFilters] = useState<DonorSearchFilters>({});
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasShownAuthToast = useRef(false);
  const itemsPerPage = 10;

  useEffect(() => {
    // Get user's location for distance calculations
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location. Distance filtering may be limited.');
      }
    );
  }, []);

  // First effect to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }

      if (!session && !hasShownAuthToast.current) {
        toast.error('Please sign in to view donors');
        hasShownAuthToast.current = true;
        return;
      }

      setCurrentUser(session?.user || null);
    };

    checkAuth();
  }, []);

  // Second effect to fetch data only if user is authenticated
  useEffect(() => {
    const fetchDonors = async () => {
      if (!currentUser) {
        setDonors([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, get the current user's donor ID if they are a donor
        const { data: currentDonorData } = await supabase
          .from('donors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();

        const currentDonorId = currentDonorData?.id;

        let query = supabase
          .from('donors')
          .select('*', { count: 'exact' })
          .eq('status', 'active');

        // Exclude current user from results if they're a donor
        if (currentDonorId) {
          query = query.neq('id', currentDonorId);
        }

        // Apply filters
        if (filters.bloodType) {
          query = query.eq('blood_type', filters.bloodType);
        }

        if (filters.availability) {
          query = query.eq('is_available', true);
        }

        if (filters.lastDonation === 'available') {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          query = query.or(`last_donation_date.lt.${threeMonthsAgo.toISOString()},last_donation_date.is.null`);
        }

        // Add pagination
        const from = (currentPage - 1) * itemsPerPage;
        query = query.range(from, from + itemsPerPage - 1);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        let filteredDonors = data || [];

        // Apply distance filtering if location is available and distance filter is set
        if (userLocation && typeof filters.distance === 'number' && filteredDonors.length > 0) {
          filteredDonors = filteredDonors.filter((donor) => {
            if (!donor.latitude || !donor.longitude) return false;
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              donor.latitude,
              donor.longitude
            );
            return distance <= filters.distance!;
          });
        }

        // Apply location text search
        if (filters.location) {
          const searchTerm = filters.location.toLowerCase();
          filteredDonors = filteredDonors.filter((donor) =>
            donor.address.toLowerCase().includes(searchTerm)
          );
        }

        // Double check to ensure current user is not in results
        if (currentDonorId) {
          filteredDonors = filteredDonors.filter(donor => donor.id !== currentDonorId);
        }

        setDonors(filteredDonors);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      } catch (err) {
        console.error('Error fetching donors:', err);
        setError('Failed to fetch donors. Please try again.');
        toast.error('Error loading donors');
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, [filters, currentPage, userLocation, currentUser]);

  const handleFilterChange = (key: keyof DonorSearchFilters, value: any) => {
    setCurrentPage(1); // Reset to first page when filters change
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleContactDonor = (donor: Donor) => {
    // Remove this function as we're using ChatButton now
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by location"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
              <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              onChange={(e) => handleFilterChange('bloodType', e.target.value)}
              value={filters.bloodType || ''}
            >
              <option value="">All Blood Types</option>
              {BLOOD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              onChange={(e) => handleFilterChange('distance', Number(e.target.value))}
              value={filters.distance || ''}
            >
              <option value="">Any Distance</option>
              {DISTANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleFilterChange('availability', !filters.availability)}
              className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                filters.availability
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Available Donors Only
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-red-500 mr-2" />
              <h2 className="text-xl font-semibold">Available Donors</h2>
            </div>
            <span className="text-gray-500">{donors.length} results found</span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading donors...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500">{error}</p>
            </div>
          ) : donors.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No donors found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-6">
              {donors.map((donor) => (
                <div
                  key={donor.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {donor.first_name} {donor.last_name}
                      </h3>
                      <div className="mt-2 space-y-2">
                        <p className="text-gray-600 flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {donor.address}
                        </p>
                        <p className="text-gray-600 flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {donor.phone}
                        </p>
                        {donor.last_donation_date && (
                          <p className="text-gray-600 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Last donation:{' '}
                            {format(new Date(donor.last_donation_date), 'PPP')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        {donor.blood_type}
                      </span>
                      <div className="mt-2 flex items-center justify-end">
                        <Shield className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-gray-600">
                          {donor.response_rate}% response rate
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          donor.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {donor.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <ChatButton
                      donorId={donor.id}
                      donorName={`${donor.first_name} ${donor.last_name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </button>
              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-full ${
                      page === currentPage
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 hover:bg-red-100'
                    }`}
                    disabled={loading}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}