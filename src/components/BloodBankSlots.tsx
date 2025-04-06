import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Clock, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';

interface DonationSlot {
  id: string;
  blood_bank_id: string;
  day_of_week: number;
  day_of_week_text: string;
  start_time: string;
  end_time: string;
  capacity: number;
  max_donors_per_slot: number;
  created_at: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function BloodBankSlots() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<DonationSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bloodBankId, setBloodBankId] = useState<string>('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [capacity, setCapacity] = useState<number>(10);

  useEffect(() => {
    fetchBloodBankId();
  }, []);

  useEffect(() => {
    if (bloodBankId) {
      fetchSlots();
    }
  }, [bloodBankId]);

  const fetchBloodBankId = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_banks')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setBloodBankId(data.id);
    } catch (error) {
      console.error('Error fetching blood bank ID:', error);
      toast.error('Failed to load blood bank information');
    }
  };

  const fetchSlots = async () => {
    if (!bloodBankId) return;
    
    setSlotsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blood_bank_slots')
        .select('*')
        .eq('blood_bank_id', bloodBankId)
        .order('day_of_week_text', { ascending: true });

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load donation slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const createDonationSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bloodBankId) return;
    
    // Validate time range
    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Get the numeric day of week
      const numericDayOfWeek = DAYS_OF_WEEK.indexOf(dayOfWeek);
      
      const newSlot = {
        blood_bank_id: bloodBankId,
        day_of_week: numericDayOfWeek,
        day_of_week_text: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        capacity: capacity,
        max_donors_per_slot: capacity
      };
      
      const { data, error } = await supabase
        .from('blood_bank_slots')
        .insert(newSlot)
        .select();
        
      if (error) throw error;
      
      toast.success('Donation slot created successfully');
      
      // Reset form fields
      setStartTime('09:00');
      setEndTime('17:00');
      setCapacity(10);
      
      // Refresh the slots list
      fetchSlots();
    } catch (error) {
      console.error('Error creating donation slot:', error);
      toast.error('Failed to create donation slot');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this donation slot?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('blood_bank_slots')
        .delete()
        .eq('id', slotId);
        
      if (error) throw error;
      
      toast.success('Donation slot deleted');
      // Refresh the list
      fetchSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete donation slot');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-6 w-6 mr-2 text-red-500" />
          Create Donation Slots
        </h2>
        <p className="text-gray-600 mb-4">
          Create time slots when donors can schedule blood donations at your blood bank.
          These slots will be visible to donors looking to make voluntary donations.
        </p>
      </div>
      
      {/* Create new donation slot form */}
      <form onSubmit={createDonationSlot} className="border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Add New Donation Slot</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">
              Day of Week
            </label>
            <select 
              id="dayOfWeek" 
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input 
              type="time" 
              id="startTime" 
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              required
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input 
              type="time" 
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)} 
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              required
            />
          </div>
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacity (donors)
            </label>
            <input 
              type="number" 
              id="capacity" 
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <button 
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Slot
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Display existing donation slots */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900">Your Donation Slots</h3>
          <button 
            onClick={fetchSlots}
            disabled={slotsLoading}
            className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${slotsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {slotsLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No donation slots created yet. Create slots to allow donors to schedule donations.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {slot.day_of_week_text || DAYS_OF_WEEK[slot.day_of_week]}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(`2000-01-01T${slot.end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {slot.capacity || slot.max_donors_per_slot}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 