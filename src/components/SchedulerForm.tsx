import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { X, Calendar, Clock, Building2, User, Droplet } from 'lucide-react';

interface SchedulerFormProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyRequestId: string;
  donorId: string;
  requesterId: string;
}

export function SchedulerForm({
  isOpen,
  onClose,
  emergencyRequestId,
  donorId,
  requesterId,
}: SchedulerFormProps) {
  const [loading, setLoading] = useState(false);
  const [requestDetails, setRequestDetails] = useState<any>(null);
  const [donorDetails, setDonorDetails] = useState<any>(null);
  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    hospital_name: '',
    hospital_address: '',
    patient_name: '',
    patient_blood_group: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && emergencyRequestId) {
      fetchRequestDetails();
      fetchDonorDetails();
    }
  }, [isOpen, emergencyRequestId, donorId]);

  const fetchRequestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', emergencyRequestId)
        .single();

      if (error) {
        console.error('Error fetching request details:', error);
        return;
      }

      setRequestDetails(data);
      
      // Pre-fill the form with some data from the emergency request
      if (data) {
        setFormData(prev => ({
          ...prev,
          hospital_name: data.hospital_name || '',
          hospital_address: data.hospital_address || '',
          patient_blood_group: data.blood_type || '',
        }));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchDonorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', donorId)
        .single();

      if (error) {
        console.error('Error fetching donor details:', error);
        return;
      }

      setDonorDetails(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use emergency_request_id as the field name
      const requestIdField = 'emergency_request_id';
      
      // Create donation schedule
      const scheduleData = {
        [requestIdField]: emergencyRequestId,
        donor_id: donorId,
        requester_id: requesterId,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        status: 'scheduled',
        hospital_name: formData.hospital_name,
        hospital_address: formData.hospital_address,
        patient_name: formData.patient_name,
        patient_blood_group: formData.patient_blood_group,
        notes: formData.notes,
      };

      const { data: newSchedule, error: scheduleError } = await supabase
        .from('donation_schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (scheduleError) {
        console.error('Error creating schedule:', scheduleError);
        toast.error('Failed to schedule donation');
        setLoading(false);
        return;
      }

      // Create notification for the donor - with fallback for missing recipient_type column
      try {
        if (donorDetails && donorDetails.user_id) {
          try {
            // Try with recipient_type first
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: donorDetails.user_id,
                title: 'Blood Donation Scheduled',
                message: `Your blood donation has been scheduled for ${formData.scheduled_date} at ${formData.scheduled_time}`,
                type: 'donation_scheduled',
                recipient_type: 'donor',
                data: {
                  schedule_id: newSchedule.id,
                  emergency_request_id: emergencyRequestId,
                  scheduled_date: formData.scheduled_date,
                  scheduled_time: formData.scheduled_time,
                  hospital_name: formData.hospital_name,
                  hospital_address: formData.hospital_address,
                  patient_name: formData.patient_name,
                  patient_blood_group: formData.patient_blood_group,
                  donor_id: donorId,
                  recipient_info: 'donor'
                }
              });

            if (notifError) {
              // If we get a 42703 error (column doesn't exist)
              if (notifError.code === '42703') {
                console.log('Falling back to notification without recipient_type');
                // Fallback to creating notification without recipient_type
                const { error: fallbackError } = await supabase
                  .from('notifications')
                  .insert({
                    user_id: donorDetails.user_id,
                    title: 'Blood Donation Scheduled',
                    message: `Your blood donation has been scheduled for ${formData.scheduled_date} at ${formData.scheduled_time}`,
                    type: 'donation_scheduled',
                    data: {
                      schedule_id: newSchedule.id,
                      emergency_request_id: emergencyRequestId,
                      scheduled_date: formData.scheduled_date,
                      scheduled_time: formData.scheduled_time,
                      hospital_name: formData.hospital_name,
                      hospital_address: formData.hospital_address,
                      patient_name: formData.patient_name,
                      patient_blood_group: formData.patient_blood_group,
                      donor_id: donorId,
                      recipient_info: 'donor'
                    }
                  });
                
                if (fallbackError) {
                  console.error('Error creating notification (fallback):', fallbackError);
                  // Continue anyway since notification is not critical
                } else {
                  console.log('Successfully created notification (fallback)');
                }
              } else {
                console.error('Error creating notification:', notifError);
                // Continue anyway since notification is not critical
              }
            } else {
              console.log('Successfully created notification');
            }
          } catch (notifError) {
            console.error('Error in notification process:', notifError);
            // Continue anyway since notification is not critical
          }
        }
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't block the process - notification is not critical for scheduling
      }

      toast.success('Blood donation scheduled successfully');
      onClose();
      
      // Add a small delay before reload to ensure operations complete and user sees the success message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error scheduling donation:', error);
      toast.error('Failed to schedule donation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">Schedule Blood Donation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </div>
            </label>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleChange}
              required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
            </label>
            <input
              type="time"
              name="scheduled_time"
              value={formData.scheduled_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <Building2 className="h-4 w-4" />
                <span>Hospital Name</span>
              </div>
            </label>
            <input
              type="text"
              name="hospital_name"
              value={formData.hospital_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter hospital name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <Building2 className="h-4 w-4" />
                <span>Hospital Address</span>
              </div>
            </label>
            <input
              type="text"
              name="hospital_address"
              value={formData.hospital_address}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter hospital address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Patient Name</span>
              </div>
            </label>
            <input
              type="text"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter patient name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center space-x-1">
                <Droplet className="h-4 w-4" />
                <span>Patient Blood Group</span>
              </div>
            </label>
            <input
              type="text"
              name="patient_blood_group"
              value={formData.patient_blood_group}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter blood group"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span>Additional Notes</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300"
            >
              {loading ? 'Scheduling...' : 'Schedule Donation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 