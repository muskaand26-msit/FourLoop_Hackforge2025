import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  MapPin,
  Droplet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BloodBankConfirmation } from './BloodBankConfirmation';

interface BloodBankRequestListProps {
  bloodBankId: string;
}

interface BloodRequest {
  id: string;
  status: string;
  blood_bank_confirmed: boolean;
  request: {
    id: string;
    patient_name: string;
    blood_type: string;
    units_required: number;
    hospital_name: string;
    hospital_address: string;
    contact_person: string;
    contact_number: string;
    urgency_level: string;
    status: string;
    created_at: string;
    notes?: string;
  };
}

export function BloodBankRequestList({
  bloodBankId,
}: BloodBankRequestListProps) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    notificationId: string;
    requestId: string;
    units: number;
  } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [bloodBankId]);

  const fetchRequests = async () => {
    try {
      console.log('Fetching requests for blood bank:', bloodBankId);
      const { data, error } = await supabase
        .from('blood_bank_requests')
        .select(
          `
          id,
          patient_name,
          blood_type,
          units_required,
          hospital_name,
          hospital_address,
          contact_person,
          contact_number,
          urgency_level,
          status,
          created_at,
          notes,
          blood_bank_notifications!blood_bank_notifications_request_id_fkey (
            id,
            status,
            blood_bank_confirmed
          )
        `
        )
        .eq('blood_bank_id', bloodBankId)
        .order('created_at', { ascending: false });

      console.log('Query result:', { data, error });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedRequests = (data || []).map((request) => ({
        id: request.blood_bank_notifications[0]?.id || '',
        status: request.blood_bank_notifications[0]?.status || request.status,
        blood_bank_confirmed:
          request.blood_bank_notifications[0]?.blood_bank_confirmed || false,
        request: {
          id: request.id,
          patient_name: request.patient_name,
          blood_type: request.blood_type,
          units_required: request.units_required,
          hospital_name: request.hospital_name,
          hospital_address: request.hospital_address,
          contact_person: request.contact_person,
          contact_number: request.contact_number,
          urgency_level: request.urgency_level,
          status: request.status,
          created_at: request.created_at,
          notes: request.notes,
        },
      }));

      console.log('Transformed requests:', transformedRequests);
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load blood requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    notificationId: string,
    action: 'accept' | 'reject'
  ) => {
    try {
      setProcessing(requestId);

      if (action === 'accept') {
        // Get the request details
        const { data: requestData, error: requestError } = await supabase
          .from('blood_bank_requests')
          .select('blood_type, units_required')
          .eq('id', requestId)
          .single();

        if (requestError) throw requestError;

        // Check blood inventory
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('blood_inventory')
          .select('units_available')
          .eq('blood_bank_id', bloodBankId)
          .eq('blood_type', requestData.blood_type)
          .single();

        if (inventoryError) throw inventoryError;

        if (inventoryData.units_available < requestData.units_required) {
          toast.error('Insufficient blood units available');
          return;
        }

        setSelectedRequest({
          notificationId: notificationId,
          requestId: requestId,
          units: requestData.units_required,
        });
        setShowConfirmation(true);
      } else {
        // Update notification status for rejection
        const { error: notifError } = await supabase
          .from('blood_bank_notifications')
          .update({
            status: 'rejected',
          })
          .eq('id', notificationId);

        if (notifError) throw notifError;

        // Update request status
        const { error: requestError } = await supabase
          .from('blood_bank_requests')
          .update({
            status: 'rejected',
          })
          .eq('id', requestId);

        if (requestError) throw requestError;

        toast.success('Request rejected');
        fetchRequests();
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmationComplete = () => {
    setShowConfirmation(false);
    setSelectedRequest(null);
    fetchRequests();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Clock className="h-8 w-8 text-red-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showConfirmation && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-lg w-full mx-4">
            <BloodBankConfirmation
              notificationId={selectedRequest.notificationId}
              requestId={selectedRequest.requestId}
              bloodBankId={bloodBankId}
              requestedUnits={selectedRequest.units}
              onConfirmed={handleConfirmationComplete}
              onClose={() => setShowConfirmation(false)}
            />
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No blood requests at the moment</p>
        </div>
      ) : (
        requests.map((notification) => (
          <div
            key={notification.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      notification.request.urgency_level === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : notification.request.urgency_level === 'urgent'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {notification.request.urgency_level.toUpperCase()}
                  </span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    <Droplet className="h-4 w-4 mr-1" />
                    {notification.request.blood_type}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      notification.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : notification.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : notification.status === 'accepted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {notification.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {notification.request.patient_name}
                  </h3>
                  <p className="text-gray-600">
                    Requires {notification.request.units_required} units of{' '}
                    {notification.request.blood_type} blood
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {notification.request.hospital_name} -{' '}
                    {notification.request.hospital_address}
                  </p>
                  <p>
                    Contact: {notification.request.contact_person} (
                    {notification.request.contact_number})
                  </p>
                  {notification.request.notes && (
                    <p className="italic">"{notification.request.notes}"</p>
                  )}
                  <p className="text-gray-500">
                    Requested on{' '}
                    {format(new Date(notification.request.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {notification.status === 'pending' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      handleRequestAction(
                        notification.request.id,
                        notification.id,
                        'accept'
                      )
                    }
                    disabled={processing === notification.request.id}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      handleRequestAction(
                        notification.request.id,
                        notification.id,
                        'reject'
                      )
                    }
                    disabled={processing === notification.request.id}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
