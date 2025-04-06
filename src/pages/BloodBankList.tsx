import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateDistance } from '../lib/geolocation';
import toast from 'react-hot-toast';

interface BloodBank {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  email: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  status: string;
  distance?: number;
  available_units?: number;
}

interface LocationState {
  requestId: string;
  bloodType: string;
  unitsRequired: number;
  latitude: number;
  longitude: number;
}

export function BloodBankList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const state = location.state as LocationState;

  useEffect(() => {
    if (!state) {
      toast.error('Invalid request. Please submit a new request.');
      navigate('/blood-bank-request');
      return;
    }

    fetchBloodBanks();
  }, [state, navigate]);

  const fetchBloodBanks = async () => {
    try {
      setLoading(true);

      // Get blood banks with available inventory
      const { data: bloodBankData, error: bloodBankError } = await supabase
        .from('blood_banks')
        .select(
          `
          *,
          blood_inventory!inner (
            units_available
          )
        `
        )
        .eq('status', 'active')
        .eq('blood_inventory.blood_type', state.bloodType)
        .gte('blood_inventory.units_available', state.unitsRequired);

      if (bloodBankError) throw bloodBankError;

      // Calculate distance and sort blood banks
      const banksWithDistance = (bloodBankData || [])
        .map((bank) => ({
          ...bank,
          distance:
            bank.latitude && bank.longitude
              ? calculateDistance(
                  state.latitude,
                  state.longitude,
                  bank.latitude,
                  bank.longitude
                )
              : Infinity,
          available_units: bank.blood_inventory[0].units_available,
        }))
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

      setBloodBanks(banksWithDistance);
    } catch (error) {
      console.error('Error fetching blood banks:', error);
      toast.error('Failed to load blood banks');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBlood = async (bloodBank: BloodBank) => {
    try {
      setProcessing(bloodBank.id);
      console.log(
        'Starting blood request process for blood bank:',
        bloodBank.id
      );

      // Get current user
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError || !session) {
        console.error('Auth error:', authError);
        toast.error('Please sign in to request blood');
        navigate('/signin');
        return;
      }

      console.log('Request ID:', state.requestId);

      // Update the request with selected blood bank
      const { error: updateError } = await supabase
        .from('blood_bank_requests')
        .update({
          blood_bank_id: bloodBank.id,
          status: 'pending',
        })
        .eq('id', state.requestId);

      if (updateError) {
        console.error('Error updating request:', updateError);
        throw updateError;
      }

      console.log('Blood request updated successfully');

      // Create notification for blood bank
      const { data: notifData, error: notificationError } = await supabase
        .from('blood_bank_notifications')
        .insert({
          blood_bank_id: bloodBank.id,
          request_id: state.requestId,
          status: 'pending',
        })
        .select();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }

      console.log('Notification created successfully:', notifData);

      toast.success('Blood request sent to blood bank successfully');
      navigate('/blood-bank-request');
    } catch (error) {
      console.error('Error requesting blood:', error);
      toast.error('Failed to send request to blood bank');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Finding nearby blood banks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Available Blood Banks
              </h1>
              <p className="mt-1 text-gray-600">
                Blood banks with {state.bloodType} blood type (
                {state.unitsRequired} units needed)
              </p>
            </div>
            <div className="text-right">
              <span className="text-gray-500">
                {bloodBanks.length} results found
              </span>
            </div>
          </div>

          {bloodBanks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No blood banks found with required blood type and quantity
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {bloodBanks.map((bloodBank) => (
                <div
                  key={bloodBank.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {bloodBank.name}
                        </h3>
                        {bloodBank.is_verified && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-gray-600">
                        <p className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {bloodBank.address}
                        </p>
                        <p className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {bloodBank.contact_number}
                        </p>
                        <p className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {bloodBank.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-2">
                        {bloodBank.distance !== undefined &&
                        bloodBank.distance < Infinity ? (
                          <span>{bloodBank.distance.toFixed(1)} km away</span>
                        ) : (
                          <span>Distance not available</span>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-4">
                        {bloodBank.available_units} units available
                      </div>
                      <button
                        onClick={() => handleRequestBlood(bloodBank)}
                        disabled={processing === bloodBank.id}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                      >
                        {processing === bloodBank.id ? (
                          <span className="flex items-center">
                            <Clock className="animate-spin h-4 w-4 mr-2" />
                            Processing...
                          </span>
                        ) : (
                          'Request Blood'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
