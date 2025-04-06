import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Award, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { Link } from 'react-router-dom';

const confirmationSchema = z.object({
  units_donated: z.number().min(1, 'Must donate at least 1 unit'),
  donation_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Please enter a valid date'),
  notes: z.string().optional(),
});

type ConfirmationFormData = z.infer<typeof confirmationSchema>;

interface DonationConfirmationProps {
  requestId: string;
  donorId: string;
  requestedUnits: number;
  onConfirmed: () => void;
  onClose: () => void;
  onScheduleAnother: () => void;
}

export function DonationConfirmation({
  requestId,
  donorId,
  requestedUnits,
  onConfirmed,
  onClose,
  onScheduleAnother,
}: DonationConfirmationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      units_donated: requestedUnits,
      donation_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const updateDonorStatus = async (donationDate: Date) => {
    try {
      const nextEligibleDate = addDays(donationDate, 90);
      
      const { error: donorError } = await supabase
        .from('donors')
        .update({
          last_donation_date: donationDate.toISOString(),
          is_available: false,
          status: 'inactive',
        })
        .eq('id', donorId);

      if (donorError) throw donorError;

      // Schedule donor availability reset after 90 days
      const { error: schedulerError } = await supabase.functions.invoke('schedule-donor-reset', {
        body: { donorId, resetDate: nextEligibleDate.toISOString() },
      });

      if (schedulerError) {
        console.error('Error scheduling donor reset:', schedulerError);
      }
    } catch (error) {
      throw error;
    }
  };

  const updateDonorRewards = async (unitsConfirmed: number) => {
    try {
      // Get current rewards
      const { data: currentRewards, error: rewardsError } = await supabase
        .from('donor_rewards')
        .select('*')
        .eq('donor_id', donorId)
        .single();

      if (rewardsError && rewardsError.code !== 'PGRST116') throw rewardsError;

      const points = (currentRewards?.points || 0) + (unitsConfirmed * 10);
      const lifetimeDonations = (currentRewards?.lifetime_donations || 0) + unitsConfirmed;
      
      // Calculate new tier
      let newTier = 'bronze';
      if (lifetimeDonations >= 20) newTier = 'platinum';
      else if (lifetimeDonations >= 10) newTier = 'gold';
      else if (lifetimeDonations >= 5) newTier = 'silver';

      // Check for new achievements
      const achievements = currentRewards?.achievements || [];
      if (lifetimeDonations >= 1 && !achievements.some(a => a.id === 'first_donation')) {
        achievements.push({
          id: 'first_donation',
          title: 'First Time Donor',
          description: 'Completed your first blood donation',
          date_earned: new Date().toISOString(),
        });
      }
      if (lifetimeDonations >= 5 && !achievements.some(a => a.id === 'regular_donor')) {
        achievements.push({
          id: 'regular_donor',
          title: 'Regular Donor',
          description: 'Completed 5 blood donations',
          date_earned: new Date().toISOString(),
        });
      }

      // Update or insert rewards
      const { error: updateError } = await supabase
        .from('donor_rewards')
        .upsert({
          donor_id: donorId,
          points,
          lifetime_donations: lifetimeDonations,
          current_tier: newTier,
          achievements,
        });

      if (updateError) throw updateError;
    } catch (error) {
      throw error;
    }
  };

  const generateCertificate = async (donationId: string) => {
    try {
      const certificateNumber = `DON-${Date.now()}-${donationId.slice(0, 8)}`;
      const certificateUrl = `https://example.com/certificates/${certificateNumber}`;

      const { error: certError } = await supabase
        .from('donation_certificates')
        .insert({
          donation_id: donationId,
          certificate_number: certificateNumber,
          certificate_url: certificateUrl,
        });

      if (certError) throw certError;
    } catch (error) {
      throw error;
    }
  };

  const onSubmit = async (data: ConfirmationFormData) => {
    try {
      const donationDate = new Date(data.donation_date);

      // Get request details
      const { data: requestData, error: requestError } = await supabase
        .from('emergency_requests')
        .select('hospital_name, hospital_address')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Create blood donation record
      const { data: donation, error: donationError } = await supabase
        .from('blood_donations')
        .insert({
          donor_id: donorId,
          request_id: requestId,
          units_donated: data.units_donated,
          donation_date: donationDate.toISOString(),
          notes: data.notes,
          hospital_name: requestData.hospital_name,
          hospital_address: requestData.hospital_address,
          donor_confirmed: true,
        })
        .select()
        .single();

      if (donationError) throw donationError;

      // Update emergency request status to in_progress
      const { error: requestUpdateError } = await supabase
        .from('emergency_requests')
        .update({ status: 'in_progress' })
        .eq('id', requestId);

      if (requestUpdateError) throw requestUpdateError;

      // Update donor status and schedule reset
      await updateDonorStatus(donationDate);

      // Update rewards and achievements
      await updateDonorRewards(data.units_donated);

      // Generate certificate
      await generateCertificate(donation.id);

      toast.success('Donation confirmed successfully! Waiting for recipient confirmation.');
      onConfirmed();
    } catch (error) {
      console.error('Error confirming donation:', error);
      toast.error('Failed to confirm donation');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Donation Scheduled!</h1>
        <p className="text-gray-600 mt-3">
          Your blood donation has been successfully scheduled. Thank you for your contribution to saving lives!
        </p>
      </div>

      <div className="space-y-4">
        <Link
          to="/dashboard"
          className="block w-full bg-red-500 text-white py-3 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          View My Dashboard
        </Link>
        
        <button
          onClick={onScheduleAnother}
          className="block w-full bg-white text-red-500 border border-red-500 py-3 px-4 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Schedule Another Donation
        </button>
        
        <Link
          to="/my-donations"
          className="block w-full text-gray-700 flex items-center justify-center mt-6"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Manage My Donations
          <ChevronRight className="h-5 w-5 ml-2" />
        </Link>
      </div>
    </div>
  );
}