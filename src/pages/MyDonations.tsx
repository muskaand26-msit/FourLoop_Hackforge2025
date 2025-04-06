import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { DatePicker } from '../components/DatePicker';

interface Donation {
  id: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  facility_name: string;
  facility_address: string;
  facility_type: 'blood_bank' | 'hospital';
  facility_id: string;
}

export default function MyDonations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    fetchDonations();
  }, [user, navigate]);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      // Get donor ID first
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('id')
        .eq('user_id', user?.id)
        .single();
        
      if (donorError) throw donorError;
      
      // Fetch blood bank donations
      const { data: bloodBankDonations, error: bbError } = await supabase
        .from('scheduled_donations')
        .select(`
          id,
          scheduled_date,
          status,
          notes,
          blood_banks:blood_bank_id (
            id,
            name,
            address
          )
        `)
        .eq('donor_id', donorData.id)
        .order('scheduled_date', { ascending: true });
        
      if (bbError) throw bbError;
      
      // Fetch hospital donations
      const { data: hospitalDonations, error: hError } = await supabase
        .from('hospital_donations')
        .select(`
          id,
          donation_date,
          status,
          notes,
          hospitals:hospital_id (
            id,
            name,
            address
          )
        `)
        .eq('donor_id', donorData.id)
        .order('donation_date', { ascending: true });
        
      if (hError) throw hError;
      
      // Transform data to a unified format
      const bbFormattedDonations = (bloodBankDonations || []).map(donation => ({
        id: donation.id,
        scheduled_date: donation.scheduled_date,
        status: donation.status,
        notes: donation.notes,
        facility_name: donation.blood_banks.name,
        facility_address: donation.blood_banks.address,
        facility_type: 'blood_bank' as const,
        facility_id: donation.blood_banks.id
      }));
      
      const hFormattedDonations = (hospitalDonations || []).map(donation => ({
        id: donation.id,
        scheduled_date: donation.donation_date,
        status: donation.status,
        notes: donation.notes,
        facility_name: donation.hospitals.name,
        facility_address: donation.hospitals.address,
        facility_type: 'hospital' as const,
        facility_id: donation.hospitals.id
      }));
      
      // Combine and sort by date
      const allDonations = [...bbFormattedDonations, ...hFormattedDonations]
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
      
      setDonations(allDonations);
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast.error('Failed to load donation history');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleClick = (id: string) => {
    setRescheduleId(id);
    setCancelId(null);
    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow);
  };

  const handleCancelClick = (id: string) => {
    setCancelId(id);
    setRescheduleId(null);
  };

  const reschedule = async () => {
    if (!rescheduleId || !newDate) {
      toast.error('Please select a new date');
      return;
    }
    
    setProcessing(true);
    
    try {
      const donation = donations.find(d => d.id === rescheduleId);
      if (!donation) throw new Error('Donation not found');
      
      // Update the database based on facility type
      if (donation.facility_type === 'blood_bank') {
        const { error } = await supabase
          .from('scheduled_donations')
          .update({ 
            scheduled_date: newDate.toISOString(),
            status: 'rescheduled'
          })
          .eq('id', rescheduleId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hospital_donations')
          .update({ 
            donation_date: newDate.toISOString(),
            status: 'rescheduled'
          })
          .eq('id', rescheduleId);
          
        if (error) throw error;
      }
      
      toast.success('Donation rescheduled successfully');
      setRescheduleId(null);
      setNewDate(null);
      fetchDonations();
    } catch (error) {
      console.error('Error rescheduling donation:', error);
      toast.error('Failed to reschedule donation');
    } finally {
      setProcessing(false);
    }
  };

  const cancelDonation = async () => {
    if (!cancelId) return;
    
    setProcessing(true);
    
    try {
      const donation = donations.find(d => d.id === cancelId);
      if (!donation) throw new Error('Donation not found');
      
      // Update the database based on facility type
      if (donation.facility_type === 'blood_bank') {
        const { error } = await supabase
          .from('scheduled_donations')
          .update({ 
            status: 'cancelled', 
            notes: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled by donor'
          })
          .eq('id', cancelId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hospital_donations')
          .update({ 
            status: 'cancelled',
            notes: cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled by donor'
          })
          .eq('id', cancelId);
          
        if (error) throw error;
      }
      
      toast.success('Donation cancelled');
      setCancelId(null);
      setCancelReason('');
      fetchDonations();
    } catch (error) {
      console.error('Error cancelling donation:', error);
      toast.error('Failed to cancel donation');
    } finally {
      setProcessing(false);
    }
  };

  // Format date and time for display
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if donation can be rescheduled or cancelled
  const canModify = (donation: Donation) => {
    const status = donation.status.toLowerCase();
    return (
      status === 'pending' || 
      status === 'scheduled' || 
      status === 'rescheduled'
    );
  };

  // Tomorrow for minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-red-500" />
              My Donation Appointments
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your upcoming and past blood donation appointments
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-10 w-10 text-red-500 animate-spin mb-4" />
              <p className="text-gray-500">Loading your donations...</p>
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-10 border border-gray-200 rounded-lg">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Donations Scheduled</h3>
              <p className="text-gray-500 mt-2">
                You don't have any donation appointments yet.
              </p>
              <button
                onClick={() => navigate('/schedule-donation')}
                className="mt-4 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Schedule a Donation
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reschedule Modal */}
              {rescheduleId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Reschedule Donation</h3>
                    <p className="text-gray-600 mb-4">
                      Please select a new date for your donation:
                    </p>
                    
                    <div className="mb-4">
                      <DatePicker
                        value={newDate}
                        onChange={(date) => setNewDate(date)}
                        minDate={tomorrow}
                        className="w-full"
                        required
                        label="Select New Date"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setRescheduleId(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={reschedule}
                        disabled={!newDate || processing}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                      >
                        {processing ? 'Rescheduling...' : 'Reschedule'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Cancel Modal */}
              {cancelId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Donation</h3>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to cancel this donation appointment?
                    </p>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for cancellation (optional)
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                        placeholder="Please provide a reason..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setCancelId(null)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Keep Appointment
                      </button>
                      <button
                        onClick={cancelDonation}
                        disabled={processing}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                      >
                        {processing ? 'Cancelling...' : 'Confirm Cancellation'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Donation List */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {donations.map((donation) => {
                    const { date, time } = formatDateTime(donation.scheduled_date);
                    const isPast = new Date(donation.scheduled_date) < new Date();
                    
                    return (
                      <li key={donation.id} className="p-4 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-start">
                              <div className="mr-4">
                                <div className="bg-gray-100 rounded-lg p-2 text-center w-16">
                                  <div className="text-xs font-medium text-gray-500">
                                    {date.split(',')[0]}
                                  </div>
                                  <div className="text-lg font-bold text-gray-900">
                                    {date.split(',')[1]}
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 mr-2">
                                    {donation.facility_name}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(donation.status)}`}>
                                    {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center text-gray-600 text-sm mt-1">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {time}
                                </div>
                                
                                <div className="flex items-start text-gray-600 text-sm mt-1">
                                  <MapPin className="h-4 w-4 mr-1 mt-0.5" />
                                  <span>{donation.facility_address}</span>
                                </div>
                                
                                {donation.notes && (
                                  <div className="text-sm text-gray-500 mt-2 italic">
                                    Notes: {donation.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {canModify(donation) && !isPast && (
                            <div className="mt-4 md:mt-0 flex space-x-2 md:justify-end">
                              <button
                                onClick={() => handleRescheduleClick(donation.id)}
                                className="flex items-center text-sm text-blue-600 border border-blue-300 rounded-md px-3 py-1 hover:bg-blue-50"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelClick(donation.id)}
                                className="flex items-center text-sm text-red-600 border border-red-300 rounded-md px-3 py-1 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </button>
                            </div>
                          )}
                          
                          {donation.status === 'completed' && (
                            <div className="mt-4 md:mt-0 flex items-center text-green-600">
                              <CheckCircle className="h-5 w-5 mr-1" />
                              Completed
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              {/* Appointment Note */}
              <div className="p-4 bg-blue-50 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> You can reschedule or cancel a donation up to 24 hours before your appointment.
                    If you need to make changes after that, please contact the facility directly.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => navigate('/schedule-donation')}
                  className="bg-red-500 text-white py-2 px-6 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Schedule a New Donation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 