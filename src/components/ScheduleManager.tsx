import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Building2, User, Droplet, X } from 'lucide-react';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  emergency_request_id: string;
  donor_id: string;
  requester_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  hospital_name: string;
  hospital_address: string;
  patient_name: string;
  patient_blood_group: string;
  notes: string;
  donor: {
    first_name: string;
    last_name: string;
    blood_type: string;
    phone: string;
  };
}

interface ScheduleManagerProps {
  requestId: string;
  userId: string;
}

export function ScheduleManager({ requestId, userId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  });

  useEffect(() => {
    fetchSchedules();
  }, [requestId, userId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donation_schedules')
        .select(`
          *,
          donor:donors (
            first_name,
            last_name,
            blood_type,
            phone
          )
        `)
        .eq('emergency_request_id', requestId)
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching schedules:', error);
        toast.error('Failed to load schedules');
        return;
      }

      setSchedules(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while loading schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('donation_schedules')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) {
        console.error('Error cancelling schedule:', error);
        toast.error('Failed to cancel schedule');
        return;
      }

      // Create notification for the donor
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: schedule.donor_id,
            title: 'Blood Donation Cancelled',
            message: `Your scheduled blood donation on ${schedule.scheduled_date} at ${schedule.scheduled_time} has been cancelled.`,
            type: 'donation_cancelled',
            data: {
              schedule_id: scheduleId,
              emergency_request_id: requestId,
            }
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }

      toast.success('Donation schedule cancelled successfully');
      fetchSchedules();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while cancelling the schedule');
    }
  };

  const handleReschedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time,
      notes: schedule.notes || '',
    });
    setShowRescheduleForm(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      // First cancel the current schedule
      const { error: cancelError } = await supabase
        .from('donation_schedules')
        .update({
          status: 'rescheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSchedule.id);

      if (cancelError) {
        console.error('Error updating original schedule:', cancelError);
        toast.error('Failed to reschedule donation');
        return;
      }

      // Create a new schedule
      const { data: newSchedule, error: createError } = await supabase
        .from('donation_schedules')
        .insert({
          emergency_request_id: selectedSchedule.emergency_request_id,
          donor_id: selectedSchedule.donor_id,
          requester_id: selectedSchedule.requester_id,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time,
          status: 'scheduled',
          hospital_name: selectedSchedule.hospital_name,
          hospital_address: selectedSchedule.hospital_address,
          patient_name: selectedSchedule.patient_name,
          patient_blood_group: selectedSchedule.patient_blood_group,
          notes: formData.notes,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating new schedule:', createError);
        toast.error('Failed to create new schedule');
        return;
      }

      // Create notification for the donor
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedSchedule.donor_id,
          title: 'Blood Donation Rescheduled',
          message: `Your blood donation has been rescheduled to ${formData.scheduled_date} at ${formData.scheduled_time}`,
          type: 'donation_rescheduled',
          data: {
            old_schedule_id: selectedSchedule.id,
            new_schedule_id: newSchedule.id,
            emergency_request_id: selectedSchedule.emergency_request_id,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time,
            hospital_name: selectedSchedule.hospital_name,
            hospital_address: selectedSchedule.hospital_address,
            recipient_info: 'donor'
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      toast.success('Blood donation rescheduled successfully');
      setShowRescheduleForm(false);
      fetchSchedules();
    } catch (error) {
      console.error('Error rescheduling donation:', error);
      toast.error('Failed to reschedule donation');
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-center text-gray-500">Loading schedules...</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-center text-gray-500">No donation schedules found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Scheduled Donations</h3>
      
      {showRescheduleForm && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Reschedule Donation</h2>
              <button
                onClick={() => setShowRescheduleForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitReschedule} className="space-y-4">
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
                  onClick={() => setShowRescheduleForm(false)}
                  className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {schedules.map((schedule) => (
          <div 
            key={schedule.id} 
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-lg">
                {schedule.status === 'cancelled' && (
                  <span className="text-red-500">[Cancelled] </span>
                )}
                {schedule.status === 'rescheduled' && (
                  <span className="text-orange-500">[Rescheduled] </span>
                )}
                Donation with {schedule.donor.first_name} {schedule.donor.last_name}
              </h4>
              <div className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                {schedule.status}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{format(new Date(schedule.scheduled_date), 'MMM dd, yyyy')}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <Clock className="h-4 w-4 mr-2" />
                <span>{schedule.scheduled_time}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <Building2 className="h-4 w-4 mr-2" />
                <span>{schedule.hospital_name}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-2" />
                <span>{schedule.patient_name}</span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <Droplet className="h-4 w-4 mr-2" />
                <span>Blood Type: {schedule.patient_blood_group}</span>
              </div>
            </div>
            
            {schedule.notes && (
              <div className="mb-4 text-gray-600 text-sm">
                <p className="font-medium mb-1">Notes:</p>
                <p>{schedule.notes}</p>
              </div>
            )}
            
            {schedule.status === 'scheduled' && (
              <div className="flex space-x-3 mt-3">
                <button 
                  onClick={() => handleReschedule(schedule)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm"
                >
                  Reschedule
                </button>
                <button 
                  onClick={() => handleCancel(schedule.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 