import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { X, User, Phone, Droplet } from 'lucide-react';
import { SchedulerForm } from './SchedulerForm';

interface DonationOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  donorInfo: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    blood_type: string;
  };
  requestId: string;
  responseId: string;
  requesterId: string;
}

export function DonationOfferModal({
  isOpen,
  onClose,
  donorInfo,
  requestId,
  responseId,
  requesterId,
}: DonationOfferModalProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      // First check if the request is still available
      const { data: requestData, error: requestError } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        toast.error('Failed to fetch request details');
        setIsSubmitting(false);
        return;
      }

      // Check if request is already accepted or fulfilled
      if (!requestData) {
        toast.error('Request not found');
        onClose();
        setIsSubmitting(false);
        return;
      }
      
      // Allow accepting if status is pending or in_progress (if not fulfilled or cancelled)
      if (requestData.status === 'fulfilled' || requestData.status === 'cancelled') {
        toast.error('This request is no longer available');
        onClose();
        setIsSubmitting(false);
        return;
      }

      // Only set to in_progress if it's not already
      let newStatus = 'in_progress';
      if (requestData.status === 'in_progress') {
        // Already in progress, no need to change status
        newStatus = 'in_progress';
      }

      // Update the emergency request in a single operation
      const { error: updateError } = await supabase
        .from('emergency_requests')
        .update({
          status: newStatus,
          accepted_donor_id: donorInfo.id
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error('Error updating emergency request:', updateError);
        toast.error('Failed to update request. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Update the donor response status to accepted
      const { error: responseError } = await supabase
        .from('donor_responses')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', responseId);

      if (responseError) {
        console.error('Error updating donor response:', responseError);
        toast.error('Failed to update donor response');
        setIsSubmitting(false);
        return;
      }

      // Reject all other donor responses for this request
      const { error: rejectError } = await supabase
        .from('donor_responses')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
        .neq('id', responseId);

      if (rejectError) {
        console.error('Error rejecting other responses:', rejectError);
        // Continue even if this fails
      }

      // Get donor user ID
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('user_id')
        .eq('id', donorInfo.id)
        .single();

      if (donorError) {
        console.error('Error fetching donor user ID:', donorError);
        // Continue even if this fails
      }

      // Create notification for the donor if we have user_id
      if (donorData && donorData.user_id) {
        try {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: donorData.user_id,
              title: 'Donation Offer Accepted',
              message: `Your donation offer for request ${requestId} has been accepted.`,
              type: 'donation_accepted',
              data: {
                request_id: requestId,
                response_id: responseId,
                donor_id: donorInfo.id
              }
            });

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        } catch (error) {
          console.error('Error in notification process:', error);
          // Don't fail the whole process if notification fails
        }
      } else {
        console.error('Could not create notification: donor user_id not found');
      }

      toast.success('Donation offer accepted successfully');
      
      // Show scheduler form instead of closing
      setShowScheduler(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error accepting donation offer:', error);
      toast.error('Failed to accept donation offer');
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      // 1. Update the donor response status to 'declined'
      const { error: updateError } = await supabase
        .from('donor_responses')
        .update({ 
          status: 'declined',
          rejected_at: new Date().toISOString() // Keep track of when it was declined
        })
        .eq('id', responseId);

      if (updateError) {
        console.error('Error updating donor response:', updateError);
        toast.error('Failed to decline the donation offer');
        return;
      }

      // 2. Notify the donor that their offer was declined
      try {
        // Get the donor's user ID
        const { data: donorData, error: donorError } = await supabase
          .from('donors')
          .select('user_id')
          .eq('id', donorInfo.id)
          .single();

        if (donorError || !donorData) {
          console.error('Error fetching donor user ID:', donorError);
        } else {
          // Create notification for the donor
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: donorData.user_id,
              title: 'Donation Offer Response',
              message: 'Your donation offer was declined by the requester',
              type: 'donation_declined'
            });

          if (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }
      } catch (notifError) {
        console.error('Error in notification process:', notifError);
        // Continue anyway - notification is not critical
      }

      toast.success('Donation offer declined successfully');

      // Close the modal and reload the page to refresh the data
      onClose();
      
      // Force a refresh of the page to ensure UI is updated correctly
      setTimeout(() => {
        window.location.reload();
      }, 500); // Short delay to ensure the toast is visible
    } catch (error) {
      console.error('Error declining donation offer:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If scheduler is shown, hide the offer modal and show scheduler
  if (showScheduler) {
    return (
      <SchedulerForm
        isOpen={true}
        onClose={() => {
          setShowScheduler(false);
          onClose();
          window.location.reload();
        }}
        emergencyRequestId={requestId}
        donorId={donorInfo.id}
        requesterId={requesterId}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">Blood Donation Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <User className="h-5 w-5" />
            <span>
              {donorInfo.first_name} {donorInfo.last_name}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-gray-700">
            <Phone className="h-5 w-5" />
            <span>{donorInfo.phone}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-700">
            <Droplet className="h-5 w-5" />
            <span>Blood Type: {donorInfo.blood_type}</span>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Accepting...' : 'Accept'}
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Declining...' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}
