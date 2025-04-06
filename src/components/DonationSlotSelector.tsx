import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, ArrowLeftCircle, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available: boolean;
}

interface Facility {
  id: string;
  name: string;
  address: string;
  type: 'blood_bank' | 'hospital';
}

interface DonationSlotSelectorProps {
  selectedDate: Date;
  facilityId: string;
  facilityType: 'blood_bank' | 'hospital';
  onBack: () => void;
  onComplete: () => void;
  rescheduleId?: string;
}

export function DonationSlotSelector({ 
  selectedDate, 
  facilityId, 
  facilityType, 
  onBack, 
  onComplete, 
  rescheduleId
}: DonationSlotSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const navigate = useNavigate();
  const [selectedFacility, setSelectedFacility] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetchFacilityDetails();
    fetchAvailableSlots();
  }, [facilityId, facilityType, selectedDate]);

  const fetchFacilityDetails = async () => {
    try {
      if (facilityType === 'blood_bank') {
        const { data, error } = await supabase
          .from('blood_banks')
          .select('id, name, address')
          .eq('id', facilityId)
          .single();
          
        if (error) throw error;
        
        setFacility({
          id: data.id,
          name: data.name,
          address: data.address,
          type: 'blood_bank'
        });
        setSelectedFacility(data);
      } else {
        const { data, error } = await supabase
          .from('hospitals')
          .select('id, name, address')
          .eq('id', facilityId)
          .single();
          
        if (error) throw error;
        
        setFacility({
          id: data.id,
          name: data.name,
          address: data.address,
          type: 'hospital'
        });
        setSelectedFacility(data);
      }
    } catch (error) {
      console.error('Error fetching facility details:', error);
      toast.error('Failed to load facility details');
    }
  };

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      // Format date for database query
      const dateString = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
      
      console.log(`Fetching slots for ${facilityType} with ID ${facilityId}`);
      console.log(`Date: ${dateString}`);
      
      // Use the unified get_available_slots function with correct parameter order
      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_date: dateString,
          p_facility_id: facilityId,
          p_facility_type: facilityType
        });
        
      if (error) {
        console.error('Error calling get_available_slots function:', error);
        
        // Fall back to direct table queries
        await fallbackSlotFetch(dateString);
      } else if (data && data.length > 0) {
        console.log('Slots returned from function:', data);
        setSlots(data);
      } else {
        console.log('No slots returned from function, trying fallback');
        await fallbackSlotFetch(dateString);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };
  
  const fallbackSlotFetch = async (dateString: string) => {
    try {
      const dayOfWeek = selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : '';
      
      if (facilityType === 'blood_bank') {
        const { data, error } = await supabase
          .from('blood_bank_slots')
          .select('id, start_time, end_time, capacity, day_of_week')
          .eq('blood_bank_id', facilityId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter for the current day of week
          const daySlots = data.filter(slot => 
            slot.day_of_week && slot.day_of_week.trim().toLowerCase() === dayOfWeek.toLowerCase()
          );
          
          if (daySlots.length > 0) {
            const formattedSlots = daySlots.map(slot => ({
              id: slot.id,
              day: slot.day_of_week || '',
              start_time: formatTimeForDisplay(slot.start_time),
              end_time: formatTimeForDisplay(slot.end_time),
              capacity: slot.capacity,
              booked_count: slot.booked_count,
              available: true // Assume available as a fallback
            }));
            
            setSlots(formattedSlots);
          } else {
            // If no slots found for the specific day, generate default slots
            generateDefaultSlots();
          }
        } else {
          generateDefaultSlots();
        }
      } else {
        // Hospital slots
        const { data, error } = await supabase
          .from('hospital_donation_slots')
          .select('id, start_time, end_time, capacity, day_of_week')
          .eq('hospital_id', facilityId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Filter for the current day of week
          const daySlots = data.filter(slot => 
            slot.day_of_week && slot.day_of_week.trim().toLowerCase() === dayOfWeek.toLowerCase()
          );
          
          if (daySlots.length > 0) {
            const formattedSlots = daySlots.map(slot => ({
              id: slot.id,
              day: slot.day_of_week || '',
              start_time: formatTimeForDisplay(slot.start_time),
              end_time: formatTimeForDisplay(slot.end_time),
              capacity: slot.capacity,
              booked_count: slot.booked_count,
              available: true // Assume available as a fallback
            }));
            
            setSlots(formattedSlots);
          } else {
            // If no slots found for the specific day, generate default slots
            generateDefaultSlots();
          }
        } else {
          generateDefaultSlots();
        }
      }
    } catch (error) {
      console.error('Error in fallback slot fetch:', error);
      // As last resort, generate default slots
      generateDefaultSlots();
    }
  };
  
  const generateDefaultSlots = () => {
    // Create default time slots (9am to 5pm, hourly)
    const defaultSlots: TimeSlot[] = [];
    for (let hour = 9; hour < 17; hour++) {
      defaultSlots.push({
        id: `default-${hour}`,
        day: '',
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${hour.toString().padStart(2, '0')}:00`,
        capacity: 0,
        booked_count: 0,
        available: true
      });
    }
    setSlots(defaultSlots);
  };
  
  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return "";
    
    // Handle different time formats
    if (timeStr.includes(':')) {
      // Already in HH:MM format
      return timeStr.substring(0, 5);
    } else {
      try {
        // Try to parse as a time object
        const time = new Date(`2000-01-01T${timeStr}`);
        return time.getHours().toString().padStart(2, '0') + ':' + 
               time.getMinutes().toString().padStart(2, '0');
      } catch (e) {
        return timeStr;
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedDate || !selectedSlot) {
      setFormError('Please select both a date and time slot');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        toast.error('Please sign in to schedule a donation');
        navigate('/signin');
        return;
      }
      
      // Get donor ID from user ID
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
        
      if (donorError) {
        console.error('Error fetching donor ID:', donorError);
        throw new Error('Failed to retrieve donor information');
      }
      
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // If rescheduleId is present, first cancel the existing appointment
      if (rescheduleId) {
        // Determine if it's a hospital or blood bank donation
        if (facilityType === 'hospital') {
          await supabase
            .from('hospital_donations')
            .update({ status: 'cancelled' })
            .eq('id', rescheduleId);
        } else {
          await supabase
            .from('scheduled_donations')
            .update({ status: 'cancelled' })
            .eq('id', rescheduleId);
        }
      }
      
      // Schedule the new donation using RPC function
      const { data: donationId, error: schedulingError } = await supabase.rpc(
        'schedule_donation',
        {
          p_donor_id: donorData.id,
          p_facility_id: facilityId,
          p_facility_type: facilityType,
          p_slot_id: selectedSlot.id,
          p_scheduled_date: formattedDate,
          p_scheduled_time: selectedSlot.start_time,
          p_notes: notes || null
        }
      );
      
      if (schedulingError) {
        console.error('Error from schedule_donation function:', schedulingError);
        
        // Handle specific error messages with user-friendly responses
        if (schedulingError.message.includes('already has an active donation scheduled')) {
          toast.error('You already have a donation scheduled at this time. Please select a different time slot or check your upcoming appointments.');
          setFormError('You already have an appointment scheduled at this time');
        } else if (schedulingError.message.includes('No available slots')) {
          toast.error('This time slot is no longer available. Please select a different time.');
          setFormError('This time slot is no longer available');
        } else {
          toast.error('Failed to schedule donation: ' + schedulingError.message);
          setFormError('Failed to schedule donation. Please try again later.');
        }
        return;
      }
      
      // Success handling
      toast.success('Donation scheduled successfully!');
      
      // Create a notification for the donor
      const facilityName = selectedFacility?.name || 'the selected facility';
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: session.user.id,
          title: 'Donation Scheduled',
          message: `Your donation at ${facilityName} on ${format(selectedDate, 'EEEE, MMMM d')} at ${formatTime(selectedSlot.start_time)} has been scheduled.`,
          type: 'appointment',
          recipient_type: 'donor',
          data: {
            donation_id: donationId,
            facility_id: facilityId,
            facility_type: facilityType,
            date: formattedDate,
            time: selectedSlot.start_time
          }
        });
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
      
      // Redirect to dashboard or confirmation page
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error scheduling donation:', error);
      setFormError('An unexpected error occurred. Please try again later.');
      toast.error('Failed to schedule donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 mb-6 hover:text-gray-800"
      >
        <ArrowLeftCircle className="h-5 w-5 mr-1" />
        Back to facility selection
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select a Time Slot
        </h2>
        <p className="text-gray-600">
          Choose a convenient time for your blood donation at{' '}
          {facility?.name || 'the selected facility'} on{' '}
          {selectedDate?.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading available slots...</span>
        </div>
      ) : slots.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
                className={`relative flex flex-col items-center justify-center p-4 border rounded-lg transition-colors 
                  ${selectedSlot === slot 
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-500 ring-opacity-50' 
                    : slot.available 
                      ? 'border-gray-200 hover:border-red-300 hover:bg-red-50' 
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  }`}
              >
                <Clock className={`h-5 w-5 mb-1 ${selectedSlot === slot ? 'text-red-500' : slot.available ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${selectedSlot === slot ? 'text-red-700' : slot.available ? 'text-gray-700' : 'text-gray-400'}`}>
                  {formatTime(slot.start_time)}
                </span>
                {selectedSlot === slot && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                {!slot.available && (
                  <span className="text-xs text-gray-400 mt-1">Fully booked</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Special Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any health conditions, medications, or special requirements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="bg-red-50 border border-red-100 rounded-md p-4 mt-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Before donating</h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Make sure you're well-rested and hydrated</li>
                    <li>Eat a healthy meal before your appointment</li>
                    <li>Bring a valid photo ID</li>
                    <li>Bring a list of medications you're currently taking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={!selectedSlot || submitting}
              className={`px-6 py-2 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                ${!selectedSlot || submitting 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-10 border border-gray-200 rounded-lg">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No Available Slots</h3>
          <p className="text-gray-500">There are no donation slots available for this date.</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md font-medium hover:bg-red-200"
          >
            Select Another Facility
          </button>
        </div>
      )}
    </div>
  );
} 