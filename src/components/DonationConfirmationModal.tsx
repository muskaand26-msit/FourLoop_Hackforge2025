import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface DonationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationData: {
    id: string;
    request_id: string;
    donor_id: string;
    donor_name: string;
    blood_type: string;
    patient_name: string;
  };
}

export function DonationConfirmationModal({
  isOpen,
  onClose,
  notificationData,
}: DonationConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      // Get emergency request details first
      const { data: requestData, error: requestDetailsError } = await supabase
        .from('emergency_requests')
        .select('hospital_name, hospital_address, units_required')
        .eq('id', notificationData.request_id)
        .single();

      if (requestDetailsError) {
        console.error('Error fetching request details:', requestDetailsError);
        toast.error('Failed to fetch request details');
        return;
      }

      // Start a transaction by using RPC
      const { error: transactionError } = await supabase.rpc('handle_donation_confirmation', {
        p_request_id: notificationData.request_id,
        p_donor_id: notificationData.donor_id,
        p_units_donated: requestData.units_required,
        p_hospital_name: requestData.hospital_name,
        p_hospital_address: requestData.hospital_address
      });

      if (transactionError) {
        console.error('Error in donation confirmation:', transactionError);
        toast.error('Failed to confirm donation');
        return;
      }

      // Mark notification as read and handled
      const { error: notifError } = await supabase
        .from('notifications')
        .update({
          read: true,
          handled: true,
        })
        .eq('id', notificationData.id);

      if (notifError) {
        console.error('Error updating notification:', notifError);
        // Don't return here as the main transaction was successful
      }

      toast.success('Blood donation confirmed successfully!');
      onClose();

      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error confirming donation:', error);
      toast.error('Failed to confirm donation');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Confirm Blood Donation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-600">
              Please confirm that you have received blood donation from:
            </p>
            <p className="font-medium text-gray-900 mt-1">
              {notificationData.donor_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Blood Type</p>
            <p className="font-medium text-gray-900">
              {notificationData.blood_type}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Patient Name</p>
            <p className="font-medium text-gray-900">
              {notificationData.patient_name}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleConfirm}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition flex items-center justify-center"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Donation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
