import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Calendar, Droplet, ClipboardCheck, RefreshCw, Plus, Trash2, AlertCircle, CheckCircle, XCircle, Clock, Calendar as CalendarIcon, User, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// Define interfaces for type safety
interface DonationSlot {
  id: string;
  hospital_id: string;
  date: string | null;
  day_of_week: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_recurring: boolean;
  created_at: string;
}

interface Hospital {
  id: string;
  name: string;
  address: string;
  // Add other hospital fields as needed
}

// Define interface for scheduled donations
interface ScheduledDonation {
  id: string;
  donor_id: string;
  donor_name: string;
  blood_type: string;
  donation_date: string;
  slot_time: string;
  status: string;
  notes: string | null;
  slot_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  blood_group_before_test: string | null;
  blood_group_after_test: string | null;
  units_donated: number | null;
  needs_blood_test: boolean | null;
}

export function HospitalDashboard() {
  const { user, loading } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('donations');
  const [userType, setUserType] = useState<string | null>(null);
  
  // Donation slots state
  const [donationSlots, setDonationSlots] = useState<DonationSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [capacity, setCapacity] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  // Scheduled donations state
  const [scheduledDonations, setScheduledDonations] = useState<ScheduledDonation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<ScheduledDonation | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('completed');
  const [bloodGroupAfterTest, setBloodGroupAfterTest] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [unitsdonated, setUnitsdonated] = useState<number>(1);
  const [confirmingVerification, setConfirmingVerification] = useState(false);

  // Blood group verification state
  const [pendingBloodTests, setPendingBloodTests] = useState<ScheduledDonation[]>([]);
  const [bloodTestsLoading, setBloodTestsLoading] = useState(false);
  const [showBloodTestModal, setShowBloodTestModal] = useState(false);
  const [selectedBloodTest, setSelectedBloodTest] = useState<ScheduledDonation | null>(null);
  const [bloodGroupResult, setBloodGroupResult] = useState<string>('');

  useEffect(() => {
    if (user) {
      setUserType(user.user_metadata?.user_type || 'user');
    }
  }, [user]);

  useEffect(() => {
    const fetchHospitalData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        setHospital(data);
      } catch (error) {
        console.error('Error fetching hospital data:', error);
      } finally {
        setHospitalLoading(false);
      }
    };
    
    fetchHospitalData();
  }, [user]);

  // Fetch donation slots when hospital data is loaded or active tab changes
  useEffect(() => {
    if (hospital && activeTab === 'slots') {
      fetchDonationSlots();
    } else if (hospital && activeTab === 'donations') {
      fetchScheduledDonations();
    } else if (hospital && activeTab === 'verification') {
      fetchPendingBloodTests();
    }
  }, [hospital, activeTab]);

  // Function to fetch donation slots for the hospital
  const fetchDonationSlots = async () => {
    if (!hospital) return;
    
    setSlotsLoading(true);
    try {
      const { data, error } = await supabase
        .from('hospital_donation_slots')
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('day_of_week');
        
      if (error) throw error;
      setDonationSlots(data || []);
    } catch (error) {
      console.error('Error fetching donation slots:', error);
      toast.error('Failed to load donation slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  // Function to fetch scheduled donations
  const fetchScheduledDonations = async () => {
    if (!hospital) return;
    
    setDonationsLoading(true);
    try {
      // Use the new RPC function to get scheduled donations
      const { data, error } = await supabase
        .rpc('get_hospital_scheduled_donations', {
          p_hospital_id: hospital.id
        });
        
      if (error) throw error;
      
      // Ensure the needs_blood_test field is properly set for all donations
      if (data && data.length > 0) {
        // Get additional data for needs_blood_test status
        const ids = data.map((d: ScheduledDonation) => d.id);
        const { data: donationData, error: donationError } = await supabase
          .from('hospital_donations')
          .select('id, needs_blood_test')
          .in('id', ids);
          
        if (!donationError && donationData) {
          // Create a lookup map
          const needsTestMap: Record<string, boolean> = {};
          donationData.forEach((d: { id: string; needs_blood_test: boolean }) => {
            needsTestMap[d.id] = d.needs_blood_test;
          });
          
          // Update the data with needs_blood_test values
          data.forEach((donation: ScheduledDonation) => {
            donation.needs_blood_test = needsTestMap[donation.id] || 
              (donation.status === 'completed' && 
               !donation.blood_group_after_test && 
               (donation.blood_type === 'Unknown' || donation.blood_type === null));
          });
        }
      }
      
      setScheduledDonations(data || []);
    } catch (error) {
      console.error('Error fetching scheduled donations:', error);
      toast.error('Failed to load scheduled donations');
    } finally {
      setDonationsLoading(false);
    }
  };

  // Function to fetch donors that need blood group verification
  const fetchPendingBloodTests = async () => {
    if (!hospital) return;
    
    setBloodTestsLoading(true);
    try {
      // Fetch donations that are completed but need blood group verification
      const { data, error } = await supabase
        .from('hospital_donations')
        .select(`
          id,
          donor_id,
          donation_date,
          status,
          blood_group_before_test,
          blood_group_after_test,
          verified_at,
          verified_by,
          needs_blood_test,
          donors (
            id,
            first_name,
            last_name,
            blood_type,
            needs_blood_test
          )
        `)
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed')
        .or('needs_blood_test.eq.true,blood_group_after_test.is.null');
        
      if (error) throw error;
      
      // Format the data for the component
      const formattedData = data.map(item => ({
        id: item.id,
        donor_id: item.donor_id,
        donor_name: `${item.donors.first_name} ${item.donors.last_name}`,
        blood_type: item.donors.blood_type || 'Unknown',
        donation_date: item.donation_date,
        slot_time: '', // This may be null in this context
        status: item.status,
        notes: null,
        slot_id: null,
        verified_by: item.verified_by,
        verified_at: item.verified_at,
        blood_group_before_test: item.blood_group_before_test || item.donors.blood_type,
        blood_group_after_test: item.blood_group_after_test,
        units_donated: null,
        needs_blood_test: item.needs_blood_test || item.donors.needs_blood_test
      }));
      
      setPendingBloodTests(formattedData || []);
    } catch (error) {
      console.error('Error fetching pending blood tests:', error);
      toast.error('Failed to load pending blood tests');
    } finally {
      setBloodTestsLoading(false);
    }
  };

  // Function to create a new donation slot
  const createDonationSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hospital) return;
    
    // Validate time range
    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const newSlot = {
        hospital_id: hospital.id,
        day_of_week: dayOfWeek,
        date: null, // We're using day of week instead of specific dates
        start_time: startTime,
        end_time: endTime,
        capacity: capacity,
        booked_count: 0, // Initialize with zero bookings
        is_recurring: true
      };
      
      const { data, error } = await supabase
        .from('hospital_donation_slots')
        .insert(newSlot)
        .select();
        
      if (error) throw error;
      
      toast.success('Donation slot created successfully');
      
      // Reset form fields
      setStartTime('09:00');
      setEndTime('17:00');
      setCapacity(10);
      
      // Refresh the slots list
      fetchDonationSlots();
    } catch (error) {
      console.error('Error creating donation slot:', error);
      toast.error('Failed to create donation slot');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to delete a donation slot
  const deleteSlot = async (slotId: string) => {
    try {
      // First, try the safe delete function
      const { data, error } = await supabase
        .rpc('safe_delete_donation_slot', {
          p_slot_id: slotId,
          p_handle_existing: false
        });
        
      if (error) throw error;
      
      // If the function returns false, it means there are existing donations
      if (data === false) {
        const confirmForceDelete = window.confirm(
          'This slot has existing donations scheduled. Deleting it will cancel pending donations and remove the slot reference from completed donations. Do you want to proceed?'
        );
        
        if (confirmForceDelete) {
          // Call again with handle_existing=true
          const { error: forceError } = await supabase
            .rpc('safe_delete_donation_slot', {
              p_slot_id: slotId,
              p_handle_existing: true
            });
            
          if (forceError) throw forceError;
          
          toast.success('Donation slot and associated donations have been updated');
        } else {
          toast.success('Deletion cancelled');
          return;
        }
      } else {
        toast.success('Donation slot deleted successfully');
      }
      
      // Refresh the list
      fetchDonationSlots();
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      
      // Provide more user-friendly error message
      if (error.message?.includes('foreign key constraint')) {
        toast.error('Cannot delete slot because it has associated donations. Try again with the updated system.');
      } else {
        toast.error('Failed to delete donation slot');
      }
    }
  };

  // Function to verify a donation - using the RPC function
  const verifyDonation = async () => {
    if (!selectedDonation || !user) return;
    
    setConfirmingVerification(true);
    
    try {
      // Call the verify_hospital_donation RPC function
      const { data, error } = await supabase.rpc('verify_hospital_donation', {
        p_donation_id: selectedDonation.id,
        p_status: verificationStatus,
        p_verified_by: user.id,
        p_blood_group_after_test: null, // Always pass null from the Scheduled Donations tab
        p_notes: verificationNotes || null,
        p_units_donated: unitsdonated
      });
      
      if (error) throw error;
      
      // If verification was successful, we need to update the needs_blood_test field
      // This will prevent the "Add Blood Test" button from appearing after verification
      if (verificationStatus === 'completed') {
        const { error: updateError } = await supabase
          .from('hospital_donations')
          .update({
            needs_blood_test: selectedDonation.blood_type === 'Unknown' || selectedDonation.blood_type === null
          })
          .eq('id', selectedDonation.id);
        
        if (updateError) {
          console.error('Error updating needs_blood_test field:', updateError);
          // Don't fail if this update fails
        }
      }
      
      toast.success(`Donation ${verificationStatus === 'completed' ? 'verified' : 'updated'} successfully`);
      
      // Close modal and refresh donations
      setShowVerificationModal(false);
      fetchScheduledDonations();
      
    } catch (error) {
      console.error('Error verifying donation:', error);
      toast.error('Failed to verify donation');
    } finally {
      setConfirmingVerification(false);
    }
  };

  // Function to open verification modal
  const openVerificationModal = (donation: ScheduledDonation) => {
    setSelectedDonation(donation);
    // If the donation already has units_donated, use it
    setUnitsdonated(donation.units_donated || 1);
    setVerificationStatus('completed');
    setVerificationNotes('');
    setShowVerificationModal(true);
  };

  // Function to open blood test modal
  const openBloodTestModal = (donation: ScheduledDonation) => {
    setSelectedBloodTest(donation);
    setBloodGroupResult(donation.blood_group_before_test || '');
    setVerificationNotes('');
    setShowBloodTestModal(true);
  };

  // Function to save blood test results
  const saveBloodTestResult = async () => {
    if (!selectedBloodTest || !user || !bloodGroupResult) return;
    
    setConfirmingVerification(true);
    
    try {
      // Update the hospital_donations table with blood group test results
      const { error } = await supabase
        .from('hospital_donations')
        .update({
          blood_group_after_test: bloodGroupResult,
          notes: verificationNotes ? (selectedBloodTest.notes ? `${selectedBloodTest.notes}\n${verificationNotes}` : verificationNotes) : selectedBloodTest.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBloodTest.id);
      
      if (error) throw error;
      
      // Also update the donor's blood type if it was unknown or needs verification
      if (selectedBloodTest.blood_type === 'Unknown' || selectedBloodTest.needs_blood_test) {
        const { error: donorError } = await supabase
          .from('donors')
          .update({
            blood_type: bloodGroupResult,
            needs_blood_test: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedBloodTest.donor_id);
        
        if (donorError) throw donorError;

        // Create notification for donor
        try {
          // Get donor user ID
          const { data: donorData, error: donorIdError } = await supabase
            .from('donors')
            .select('user_id')
            .eq('id', selectedBloodTest.donor_id)
            .single();

          if (!donorIdError && donorData && donorData.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: donorData.user_id,
                title: 'Blood Group Verified',
                message: `Your blood group has been verified as ${bloodGroupResult}`,
                type: 'blood_group_verified',
                data: {
                  donation_id: selectedBloodTest.id,
                  blood_group: bloodGroupResult
                }
              });
          }
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
          // Don't block the main process for notification errors
        }
      }
      
      toast.success('Blood test results saved successfully');
      
      // Close modal and refresh data
      setShowBloodTestModal(false);
      if (activeTab === 'verification') {
        fetchPendingBloodTests();
      } else {
        fetchScheduledDonations();
      }
      
    } catch (error) {
      console.error('Error saving blood test results:', error);
      toast.error('Failed to save blood test results');
    } finally {
      setConfirmingVerification(false);
    }
  };

  // Handle loading state
  if (loading || hospitalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // Redirect if not logged in, not a hospital user type, or no hospital record found
  if (!user || userType !== 'hospital' || !hospital) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {hospital.name}
          </h1>
          <p className="text-gray-600">
            Manage your hospital's donation activities and help save lives
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('donations')}
            className={`flex items-center justify-center flex-1 py-2 rounded-md ${
              activeTab === 'donations'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ClipboardCheck className="h-5 w-5 mr-2" />
            Scheduled Donations
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center justify-center flex-1 py-2 rounded-md ${
              activeTab === 'verification'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Droplet className="h-5 w-5 mr-2" />
            Blood Group Verification
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`flex items-center justify-center flex-1 py-2 rounded-md ${
              activeTab === 'slots'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Donation Slots
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Scheduled Donations Tab */}
          {activeTab === 'donations' && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <ClipboardCheck className="h-6 w-6 mr-2 text-red-500" />
                  Scheduled Donations
                </h2>
                <p className="text-gray-600 mb-4">
                  View and manage blood donations scheduled at your hospital. Confirm donations when completed.
                </p>
              </div>
              
              <div className="flex justify-end mb-4">
                <button 
                  onClick={fetchScheduledDonations}
                  disabled={donationsLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
                >
                  {donationsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Donations
                    </>
                  )}
                </button>
              </div>
              
              {donationsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                </div>
              ) : scheduledDonations.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">
                    No scheduled donations yet. Donations scheduled at your hospital will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledDonations.map((donation) => (
                    <div 
                      key={donation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between">
                        <div className="mb-4 sm:mb-0">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 mr-3">
                              {donation.donor_name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              donation.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : donation.status === 'cancelled' || donation.status === 'no_show' || donation.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : donation.status === 'confirmed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Droplet className="h-4 w-4 mr-1.5 text-red-500" />
                              <span>Blood Type: <strong>{donation.blood_type}</strong></span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                              <span>Date: <strong>{format(new Date(donation.donation_date), 'MMM d, yyyy')}</strong></span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1.5 text-purple-500" />
                              <span>Time: <strong>
                                {donation.slot_time ? 
                                  format(new Date(`2000-01-01T${donation.slot_time}`), 'h:mm a') 
                                  : 'Not specified'
                                }
                              </strong></span>
                            </div>
                            
                            {donation.blood_group_after_test && (
                              <div className="flex items-center text-sm text-gray-600">
                                <FileText className="h-4 w-4 mr-1.5 text-green-500" />
                                <span>Verified Blood Type: <strong>{donation.blood_group_after_test}</strong></span>
                              </div>
                            )}
                          </div>
                          
                          {donation.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Notes:</strong> {donation.notes}</p>
                            </div>
                          )}
                          
                          {donation.verified_at && (
                            <div className="mt-2 text-xs text-gray-500">
                              Verified at: {format(new Date(donation.verified_at), 'MMM d, yyyy h:mm a')}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex sm:flex-col gap-2">
                          {donation.status === 'scheduled' || donation.status === 'confirmed' ? (
                            <>
                              <button
                                onClick={() => openVerificationModal(donation)}
                                className="flex items-center justify-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Verify
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDonation(donation);
                                  setVerificationStatus('no_show');
                                  setVerificationNotes('Donor did not show up');
                                  setShowVerificationModal(true);
                                }}
                                className="flex items-center justify-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                              >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                No Show
                              </button>
                            </>
                          ) : donation.status === 'completed' && !donation.blood_group_after_test && donation.needs_blood_test ? (
                            <button
                              onClick={() => openBloodTestModal(donation)}
                              className="flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              <Droplet className="h-4 w-4 mr-1.5" />
                              Add Blood Test
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Blood Group Verification Tab */}
          {activeTab === 'verification' && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Droplet className="h-6 w-6 mr-2 text-red-500" />
                  Blood Group Verification
                </h2>
                <p className="text-gray-600 mb-4">
                  Verify blood groups for donors who were unsure of their blood type or need confirmation.
                  This helps maintain accurate donor records and improves matching for emergencies.
                </p>
              </div>
              
              <div className="flex justify-end mb-4">
                <button 
                  onClick={fetchPendingBloodTests}
                  disabled={bloodTestsLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
                >
                  {bloodTestsLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Pending Tests
                    </>
                  )}
                </button>
              </div>
              
              {bloodTestsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                </div>
              ) : pendingBloodTests.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <p className="text-gray-500">
                    No pending blood group verifications. Donors who need blood group verification will appear here after donation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBloodTests.map((donation) => (
                    <div 
                      key={donation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between">
                        <div className="mb-4 sm:mb-0">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 mr-3">
                              {donation.donor_name}
                            </h3>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Needs Verification
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Droplet className="h-4 w-4 mr-1.5 text-red-500" />
                              <span>Current Blood Type: <strong>{donation.blood_type === 'Unknown' ? 'Unknown' : donation.blood_type}</strong></span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                              <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                              <span>Donation Date: <strong>{format(new Date(donation.donation_date), 'MMM d, yyyy')}</strong></span>
                            </div>
                          </div>
                          
                          {donation.blood_group_after_test && (
                            <div className="mt-2 text-sm text-green-600">
                              <span>Verified Blood Type: <strong>{donation.blood_group_after_test}</strong></span>
                            </div>
                          )}

                          {donation.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>Notes:</strong> {donation.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex sm:flex-col gap-2">
                          {!donation.blood_group_after_test && (
                            <button
                              onClick={() => openBloodTestModal(donation)}
                              className="flex items-center justify-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              <Droplet className="h-4 w-4 mr-1.5" />
                              Verify Blood Group
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Donation Slots Tab */}
          {activeTab === 'slots' && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-6 w-6 mr-2 text-red-500" />
                  Create Donation Slots
                </h2>
                <p className="text-gray-600 mb-4">
                  Create time slots when donors can schedule blood donations at your hospital.
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
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
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
                    onClick={fetchDonationSlots}
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
                ) : donationSlots.length === 0 ? (
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {donationSlots.map((slot) => (
                          <tr key={slot.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {slot.day_of_week}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                              {new Date(`2000-01-01T${slot.end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {slot.capacity}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {slot.capacity - (slot.booked_count || 0)} / {slot.capacity}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    (slot.booked_count || 0) / slot.capacity > 0.9 ? 'bg-red-600' :
                                    (slot.booked_count || 0) / slot.capacity > 0.6 ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(((slot.booked_count || 0) / slot.capacity) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs mt-1 text-gray-600">
                                {(slot.booked_count || 0)} booked ({Math.round(((slot.booked_count || 0) / slot.capacity) * 100)}%)
                              </div>
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
            </>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {verificationStatus === 'completed' ? 'Verify Donation' : verificationStatus === 'no_show' ? 'Record No-Show' : 'Update Donation'}
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-1">Donor Name:</p>
              <p className="font-medium text-gray-900">{selectedDonation.donor_name}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-1">Donation Date:</p>
              <p className="font-medium text-gray-900">
                {format(new Date(selectedDonation.donation_date), 'MMMM d, yyyy')} at {' '}
                {selectedDonation.slot_time && format(new Date(`2000-01-01T${selectedDonation.slot_time}`), 'h:mm a')}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select 
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="completed">Completed</option>
                <option value="no_show">No-Show</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {verificationStatus === 'completed' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units Donated
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={unitsdonated}
                    onChange={(e) => setUnitsdonated(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the number of units (blood bags) donated
                  </p>
                </div>
              </>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea 
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                rows={3}
                placeholder="Add any additional notes here..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyDonation}
                disabled={confirmingVerification}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
              >
                {confirmingVerification ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                    Processing...
                  </>
                ) : (
                  verificationStatus === 'completed' ? 'Verify Donation' : 'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blood Group Test Modal */}
      {showBloodTestModal && selectedBloodTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Verify Blood Group
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-1">Donor Name:</p>
              <p className="font-medium text-gray-900">{selectedBloodTest.donor_name}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-1">Current Blood Type:</p>
              <p className="font-medium text-gray-900">{selectedBloodTest.blood_type === 'Unknown' ? 'Unknown' : selectedBloodTest.blood_type}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group Test Result
              </label>
              <select 
                value={bloodGroupResult}
                onChange={(e) => setBloodGroupResult(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                required
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea 
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                rows={3}
                placeholder="Add any additional notes here..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBloodTestModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveBloodTestResult}
                disabled={confirmingVerification || !bloodGroupResult}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
              >
                {confirmingVerification ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Blood Test Result'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 