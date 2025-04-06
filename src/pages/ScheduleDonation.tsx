import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Building2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '../components/DatePicker';
import { toast } from 'react-hot-toast';
import { DonationDateSelector } from '../components/DonationDateSelector';
import { DonationFacilityList } from '../components/DonationFacilityList';
import { DonationSlotSelector } from '../components/DonationSlotSelector';
import { SchedulerConfirmation } from '../components/SchedulerConfirmation';

interface BloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface AvailableSlot {
  slot_time: string;
  available: boolean;
}

// Enum for workflow steps
enum Step {
  DATE_SELECTION = 'date_selection',
  FACILITY_SELECTION = 'facility_selection',
  SLOT_SELECTION = 'slot_selection',
  CONFIRMATION = 'confirmation'
}

export default function ScheduleDonation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(Step.DATE_SELECTION);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedFacilityType, setSelectedFacilityType] = useState<'blood_bank' | 'hospital'>('blood_bank');
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    // Check if user is a donor
    checkDonorProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedFacilityId && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedFacilityId, selectedDate]);

  const checkDonorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('id')
        .eq('user_id', user?.id)
        .single();
        
      if (error || !data) {
        toast.error('Please complete your donor profile before scheduling a donation');
        navigate('/complete-profile');
      }
    } catch (error) {
      console.error('Error checking donor profile:', error);
      toast.error('Please sign in as a donor to schedule donations');
      navigate('/signin');
    }
  };

  const fetchBloodBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_banks')
        .select('id, name, address, city, state')
        .order('name');

      if (error) throw error;
      setBloodBanks(data || []);
    } catch (error) {
      console.error('Error fetching blood banks:', error);
      toast.error('Failed to load blood banks');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedFacilityId || !selectedDate) return;

    try {
      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_date: selectedDate.toISOString().split('T')[0],
          p_facility_id: selectedFacilityId,
          p_facility_type: selectedFacilityType
        });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available slots');
    }
  };

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date);
    setCurrentStep(Step.FACILITY_SELECTION);
  };

  const handleFacilitySelection = (facilityId: string, facilityType: 'blood_bank' | 'hospital') => {
    setSelectedFacilityId(facilityId);
    setSelectedFacilityType(facilityType);
    setCurrentStep(Step.SLOT_SELECTION);
  };

  const handleBack = () => {
    switch (currentStep) {
      case Step.FACILITY_SELECTION:
        setCurrentStep(Step.DATE_SELECTION);
        break;
      case Step.SLOT_SELECTION:
        setCurrentStep(Step.FACILITY_SELECTION);
        break;
      default:
        // No back for confirmation
        break;
    }
  };

  const handleComplete = () => {
    setCurrentStep(Step.CONFIRMATION);
  };

  const handleScheduleAnother = () => {
    // Reset state
    setSelectedDate(null);
    setSelectedFacilityId('');
    setCurrentStep(Step.DATE_SELECTION);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !selectedDate || !selectedSlot) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const scheduledDate = new Date(selectedDate);
      const [hours, minutes] = selectedSlot.split(':');
      scheduledDate.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from('scheduled_donations')
        .insert({
          donor_id: user?.id,
          blood_bank_id: selectedFacilityId,
          scheduled_date: scheduledDate.toISOString(),
          notes
        });

      if (error) throw error;

      toast.success('Donation scheduled successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error scheduling donation:', error);
      toast.error('Failed to schedule donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentStep === Step.DATE_SELECTION && (
          <DonationDateSelector onSelectDate={handleDateSelection} />
        )}
        
        {currentStep === Step.FACILITY_SELECTION && selectedDate && (
          <DonationFacilityList 
            selectedDate={selectedDate}
            onSelectFacility={handleFacilitySelection}
            onBack={handleBack}
          />
        )}
        
        {currentStep === Step.SLOT_SELECTION && selectedDate && selectedFacilityId && (
          <DonationSlotSelector 
            selectedDate={selectedDate}
            facilityId={selectedFacilityId}
            facilityType={selectedFacilityType}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        )}
        
        {currentStep === Step.CONFIRMATION && (
          <SchedulerConfirmation onScheduleAnother={handleScheduleAnother} />
        )}

        {/* Important Information */}
        <div className="mt-8 p-4 bg-red-50 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-1 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Important Information</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                <li>Please arrive 15 minutes before your scheduled time</li>
                <li>Bring a valid ID proof</li>
                <li>Eat a healthy meal before donation</li>
                <li>Stay hydrated</li>
                <li>Get adequate rest the night before</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 