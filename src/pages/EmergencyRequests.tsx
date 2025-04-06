import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  Heart,
  Phone,
  MapPin,
  Calendar,
  Map,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { DonationOfferModal } from '../components/DonationOfferModal';
import { ScheduleManager } from '../components/ScheduleManager';
import { EmergencyMapView } from '../components/EmergencyMapView';

interface EmergencyRequest {
  id: string;
  patient_name: string;
  blood_type: string;
  units_required: number;
  hospital_name: string;
  hospital_address: string;
  contact_person: string;
  contact_number: string;
  notes: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'cancelled';
  urgency_level: string;
  created_at: string;
  user_id: string;
  fulfilled_by?: string;
  fulfilled_at?: string;
}

interface DonationOffer {
  id: string;
  request_id: string;
  donor_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  donor: {
    id: string;
    first_name: string;
    last_name: string;
    blood_type: string;
    phone: string;
  };
}

export function EmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userDonor, setUserDonor] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [donationOffers, setDonationOffers] = useState<{
    [key: string]: DonationOffer[];
  }>({});
  const [selectedOffer, setSelectedOffer] = useState<DonationOffer | null>(null);
  const [showMap, setShowMap] = useState<string | null>(null);
  const hasShownAuthToast = useRef(false);

  // First effect to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }

      if (!session && !hasShownAuthToast.current) {
        toast.error('Please sign in to view emergency requests');
        hasShownAuthToast.current = true;
        return;
      }

      setCurrentUser(session?.user || null);
    };

    checkAuth();
  }, []);

  // Second effect to fetch data only if user is authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Get user's donor profile
        const { data: donorData, error: donorError } = await supabase
          .from('donors')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (donorError) {
          console.error('Donor fetch error:', donorError);
          throw donorError;
        }

        setUserDonor(donorData);

        // Fetch emergency requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('emergency_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (requestsError) {
          console.error('Requests fetch error:', requestsError);
          throw requestsError;
        }

        // Fetch donation offers for each request
        const offers: { [key: string]: DonationOffer[] } = {};
        for (const request of requestsData || []) {
          const { data: offerData, error: offerError } = await supabase
            .from('donor_responses')
            .select(
              `
              id,
              request_id,
              donor_id,
              status,
              donor:donors (
                id,
                first_name,
                last_name,
                blood_type,
                phone
              )
            `
            )
            .eq('request_id', request.id);

          if (offerError) {
            console.error('Offer fetch error:', offerError);
            continue;
          }

          if (offerData && offerData.length > 0) {
            offers[request.id] = offerData;
          }
        }

        setDonationOffers(offers);
        setRequests(requestsData || []);
      } catch (error) {
        console.error('Error in fetchData:', error);
        toast.error('Failed to load emergency requests');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleDonate = async (requestId: string) => {
    try {
      console.log('Starting donation process for request:', requestId);

      if (!userDonor) {
        console.log('No donor profile found');
        toast.error('Please register as a donor first');
        return;
      }

      console.log('Checking existing offers for donor:', userDonor.id);

      // Check if already offered to donate
      const { data: existingOffers, error: checkError } = await supabase
        .from('donor_responses')
        .select('*')
        .eq('request_id', requestId)
        .eq('donor_id', userDonor.id);

      if (checkError) {
        console.error('Error checking existing offers:', checkError);
        throw checkError;
      }

      console.log('Existing offers:', existingOffers);

      if (existingOffers && existingOffers.length > 0) {
        console.log('Found existing offer');
        toast.error('You have already offered to donate for this request');
        return;
      }

      console.log('Creating new donation offer');

      // Get the request details first
      const { data: requestData, error: requestError } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        throw requestError;
      }

      // Create donation offer
      const { data: insertedOffer, error: offerError } = await supabase
        .from('donor_responses')
        .insert({
          request_id: requestId,
          donor_id: userDonor.id,
          status: 'pending',
          response: 'I would like to donate blood for this request'
        })
        .select()
        .single();

      if (offerError) {
        console.error('Error creating offer:', offerError);
        throw offerError;
      }

      console.log('Successfully created offer:', insertedOffer);

      // Create notification for request owner
      const notificationData = {
        user_id: requestData.user_id,
        title: 'New Blood Donation Offer',
        message: `${userDonor.first_name} ${userDonor.last_name} has offered to donate blood for ${requestData.patient_name}`,
        type: 'blood_offer',
        read: false,
        data: {
          request_id: requestId,
          donor_id: userDonor.id,
          name: `${userDonor.first_name} ${userDonor.last_name}`,
          phone: userDonor.phone,
          blood_type: userDonor.blood_type,
          patient_name: requestData.patient_name,
          hospital_name: requestData.hospital_name,
          recipient_info: 'requester'
        },
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (notifError) {
        console.error('Error creating notification:', notifError);
        console.log('Notification data:', notificationData);
        toast.error(
          'Notification creation failed, but your offer was recorded'
        );
      } else {
        console.log('Successfully created notification');
        toast.success('Your donation offer has been sent successfully');
      }

      setSelectedRequest(requestId);

      // Refresh the offers for this request
      const { data: newOffers, error: newOffersError } = await supabase
        .from('donor_responses')
        .select(
          `
          id,
          request_id,
          donor_id,
          status,
          donor:donors (
            id,
            first_name,
            last_name,
            blood_type,
            phone
          )
        `
        )
        .eq('request_id', requestId);

      if (newOffersError) {
        console.error('Error fetching new offers:', newOffersError);
      } else {
        setDonationOffers((prev) => ({
          ...prev,
          [requestId]: newOffers || [],
        }));
      }
    } catch (error) {
      console.error('Full error details:', error);
      toast.error('Failed to submit donation offer. Please try again.');
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  const handleConnectEntity = (entityId: string, name: string, phone: string) => {
    // Open phone dialer or copy phone number
    const confirmConnect = window.confirm(`Would you like to contact ${name} at ${phone}?`);
    if (confirmConnect) {
      window.location.href = `tel:${phone}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading emergency requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Emergency Blood Requests
              </h1>
              <p className="mt-1 text-gray-600">
                Help save lives by donating blood to those in need
              </p>
            </div>
            {!userDonor && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Register as a donor to help save lives
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white border rounded-lg shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
                          request.urgency_level
                        )}`}
                      >
                        {request.urgency_level.toUpperCase()}
                      </span>
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        {request.blood_type}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {format(new Date(request.created_at), 'PPp')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.patient_name}
                      </h3>
                      <p className="text-gray-600">
                        Requires {request.units_required} units of{' '}
                        {request.blood_type} blood
                      </p>
                    </div>

                    <div className="space-y-2 text-gray-600">
                      <p className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {request.hospital_address}
                      </p>
                      <p className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Status: {request.status}
                      </p>
                      {request.notes && (
                        <p className="text-gray-500 mt-2">{request.notes}</p>
                      )}
                    </div>

                    {/* Show donation offers if the user owns this request */}
                    {currentUser &&
                      request.user_id === currentUser.id && (
                        <>
                          {donationOffers[request.id] && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                Donation Offers:
                              </h4>
                              <div className="space-y-2">
                                {donationOffers[request.id].map((offer) => (
                                  <div
                                    key={offer.id}
                                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                                  >
                                    <div>
                                      <p className="font-medium">
                                        {offer.donor.first_name}{' '}
                                        {offer.donor.last_name}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Blood Type: {offer.donor.blood_type}
                                      </p>
                                    </div>
                                    {offer.status === 'pending' && (
                                      <button
                                        onClick={() => setSelectedOffer(offer)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
                                      >
                                        View Offer
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Show map button if the user owns this request */}
                          <div className="mt-4 flex">
                            <button
                              onClick={() => setShowMap(request.id === showMap ? null : request.id)}
                              className="flex items-center bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition"
                            >
                              <Map className="h-4 w-4 mr-2" />
                              {request.id === showMap ? 'Hide Map' : 'View Nearby Donors & Blood Banks'}
                            </button>
                          </div>

                          {/* Show map view if selected */}
                          {request.id === showMap && (
                            <div className="mt-4">
                              <EmergencyMapView
                                emergencyRequestId={request.id}
                                hospitalAddress={request.hospital_address}
                                bloodType={request.blood_type}
                                onConnect={handleConnectEntity}
                              />
                            </div>
                          )}

                          {/* Show ScheduleManager if the request is in_progress */}
                          {request.status === 'in_progress' && currentUser.id === request.user_id && (
                            <ScheduleManager 
                              requestId={request.id} 
                              userId={currentUser.id} 
                            />
                          )}
                        </>
                      )}
                  </div>

                  <div className="text-right">
                    {request.status === 'pending' ? (
                      <button
                        onClick={() => handleDonate(request.id)}
                        disabled={
                          !userDonor ||
                          selectedRequest === request.id ||
                          request.status !== 'pending'
                        }
                        className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {request.status !== 'pending'
                          ? 'Request In Progress'
                          : 'Donate Blood'}
                      </button>
                    ) : request.status === 'fulfilled' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Request Fulfilled
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-600">
                        <Clock className="h-5 w-5 mr-2" />
                        In Progress
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedOffer && (
        <DonationOfferModal
          isOpen={true}
          onClose={() => setSelectedOffer(null)}
          donorInfo={selectedOffer.donor}
          requestId={selectedOffer.request_id}
          responseId={selectedOffer.id}
          requesterId={currentUser?.id}
        />
      )}
    </div>
  );
}
