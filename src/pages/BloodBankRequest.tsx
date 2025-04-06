import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, AlertCircle, CheckCircle, Heart, Phone, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { FormField } from '../components/FormField';
import { RecipientBloodConfirmation } from '../components/RecipientBloodConfirmation';
import { getCurrentLocation } from '../lib/geolocation';

const requestSchema = z.object({
  patient_name: z.string().min(2, 'Patient name must be at least 2 characters'),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    errorMap: () => ({ message: 'Please select a valid blood type' }),
  }),
  units_required: z.coerce.number().min(1, 'Must request at least 1 unit'),
  hospital_name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  hospital_address: z.string().min(5, 'Please enter a valid hospital address'),
  contact_person: z.string().min(2, 'Contact person name must be at least 2 characters'),
  contact_number: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  notes: z.string().optional(),
  urgency_level: z.enum(['normal', 'urgent', 'critical']).default('normal'),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface BloodBankRequest {
  id: string;
  patient_name: string;
  blood_type: string;
  units_required: number;
  hospital_name: string;
  hospital_address: string;
  contact_person: string;
  contact_number: string;
  notes: string;
  status: string;
  urgency_level: string;
  created_at: string;
  blood_bank?: {
    name: string;
    address: string;
    contact_number: string;
  };
  blood_bank_notifications?: Array<{
    id: string;
    status: string;
    blood_bank_confirmed: boolean;
    units_provided: number;
    blood_bank_notes: string;
  }>;
}

interface PendingConfirmation {
  requestId: string;
  expectedUnits: number;
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

const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

export function BloodBankRequest() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'request' | 'list'>('request');
  const [requests, setRequests] = useState<BloodBankRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        toast.error('Please sign in to request blood');
        navigate('/signin');
        return;
      }

      setCurrentUser(session.user);

      // Get user's location
      try {
        const position = await getCurrentLocation();
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }

      fetchRequests(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchRequests = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blood_bank_requests')
        .select(`
          *,
          blood_bank:blood_banks (
            name,
            address,
            contact_number
          ),
          blood_bank_notifications (
            id,
            status,
            blood_bank_confirmed,
            units_provided,
            blood_bank_notes
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check for requests needing confirmation
      const pendingConfirmation = data?.find(request => 
        request.blood_bank_notifications?.[0]?.blood_bank_confirmed &&
        !request.recipient_confirmed
      );

      if (pendingConfirmation) {
        setPendingConfirmation({
          requestId: pendingConfirmation.id,
          expectedUnits: pendingConfirmation.blood_bank_notifications[0].units_provided
        });
        setShowConfirmation(true);
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    try {
      if (!userLocation) {
        toast.error('Unable to get your location. Please enable location services.');
        return;
      }

      if (!currentUser) {
        toast.error('Please sign in to submit a request');
        return;
      }

      const { data: request, error: requestError } = await supabase
        .from('blood_bank_requests')
        .insert({
          ...data,
          user_id: currentUser.id,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      toast.success('Blood request submitted successfully!');
      navigate('/blood-bank-list', {
        state: {
          requestId: request.id,
          bloodType: data.blood_type,
          unitsRequired: data.units_required,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handleConfirmationComplete = async () => {
    setShowConfirmation(false);
    setPendingConfirmation(null);
    if (currentUser) {
      await fetchRequests(currentUser.id);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showConfirmation && pendingConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="max-w-lg w-full mx-4">
              <RecipientBloodConfirmation
                {...pendingConfirmation}
                onConfirmed={handleConfirmationComplete}
                onClose={() => setShowConfirmation(false)}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('request')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'request'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className="h-5 w-5 inline-block mr-2" />
              Request Blood
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'list'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-5 w-5 inline-block mr-2" />
              Request List
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'request' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Blood from Blood Bank</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      label="Patient Name"
                      name="patient_name"
                      register={register}
                      error={errors.patient_name}
                      required
                    />
                    <FormField
                      label="Blood Type Required"
                      name="blood_type"
                      register={register}
                      error={errors.blood_type}
                      type="select"
                      options={BLOOD_TYPES}
                      required
                    />
                    <FormField
                      label="Units Required"
                      name="units_required"
                      register={register}
                      error={errors.units_required}
                      type="number"
                      required
                    />
                    <FormField
                      label="Urgency Level"
                      name="urgency_level"
                      register={register}
                      error={errors.urgency_level}
                      type="select"
                      options={URGENCY_LEVELS}
                      required
                    />
                    <FormField
                      label="Hospital Name"
                      name="hospital_name"
                      register={register}
                      error={errors.hospital_name}
                      required
                    />
                    <FormField
                      label="Contact Person"
                      name="contact_person"
                      register={register}
                      error={errors.contact_person}
                      required
                    />
                    <FormField
                      label="Contact Number"
                      name="contact_number"
                      register={register}
                      error={errors.contact_number}
                      type="tel"
                      required
                    />
                    <div className="md:col-span-2">
                      <FormField
                        label="Hospital Address"
                        name="hospital_address"
                        register={register}
                        error={errors.hospital_address}
                        type="textarea"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        label="Additional Notes"
                        name="notes"
                        register={register}
                        error={errors.notes}
                        type="textarea"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                      <Heart className="ml-2 h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reset()}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
                    >
                      Reset Form
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Blood Bank Requests</h2>
                {loading ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
                    <p className="text-gray-600">Loading your requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No requests found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-4 mb-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                request.urgency_level === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : request.urgency_level === 'urgent'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.urgency_level.toUpperCase()}
                              </span>
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                                {request.blood_type}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                getStatusBadgeColor(request.status)
                              }`}>
                                {request.status.toUpperCase()}
                              </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                              {request.patient_name}
                            </h3>
                            <p className="text-gray-600">
                              {request.units_required} units of {request.blood_type} blood
                            </p>

                            <div className="mt-4 space-y-2 text-sm text-gray-600">
                              <p className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {request.hospital_name} - {request.hospital_address}
                              </p>
                              <p className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {request.contact_person} ({request.contact_number})
                              </p>
                              <p className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {format(new Date(request.created_at), 'PPp')}
                              </p>
                            </div>

                            {request.blood_bank && (
                              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Blood Bank Details</h4>
                                <div className="space-y-2 text-sm text-blue-800">
                                  <p>{request.blood_bank.name}</p>
                                  <p>{request.blood_bank.address}</p>
                                  <p>Contact: {request.blood_bank.contact_number}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            {request.status === 'completed' ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Completed
                              </div>
                            ) : request.blood_bank_notifications?.[0]?.blood_bank_confirmed ? (
                              <div className="text-right">
                                <div className="flex items-center text-green-600 mb-2">
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  Blood Bank Confirmed
                                </div>
                                <p className="text-sm text-gray-600">
                                  {request.blood_bank_notifications[0].units_provided} units provided
                                </p>
                                {request.blood_bank_notifications[0].blood_bank_notes && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    Note: {request.blood_bank_notifications[0].blood_bank_notes}
                                  </p>
                                )}
                              </div>
                            ) : request.status === 'rejected' ? (
                              <div className="flex items-center text-red-600">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                Rejected
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}