import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInYears, differenceInDays } from 'date-fns';
import { AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { FormField } from './FormField';

const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const MEDICAL_CONDITIONS = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'heart_disease', label: 'Heart Disease' },
  { value: 'asthma', label: 'Asthma' },
  { value: 'none', label: 'None' },
];

interface CampRegistrationFormProps {
  camp: {
    id: string;
    name: string;
    camp_date: string;
  };
  onComplete: () => void;
  onClose: () => void;
}

const registrationSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  date_of_birth: z.string().refine((date) => {
    if (!date) return false;
    const age = differenceInYears(new Date(), new Date(date));
    return age >= 18;
  }, 'You must be at least 18 years old to participate'),
  blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    errorMap: () => ({ message: 'Please select a valid blood type' }),
  }),
  contact_number: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  last_donation_date: z.string().nullable().optional(),
  medical_conditions: z.array(z.string()).default([]),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function CampRegistrationForm({ camp, onComplete, onClose }: CampRegistrationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      // Check age requirement
      const age = differenceInYears(new Date(), new Date(data.date_of_birth));
      if (age < 18) {
        toast.error('You must be at least 18 years old to participate');
        return;
      }

      // Check last donation date
      if (data.last_donation_date) {
        const daysSinceLastDonation = differenceInDays(
          new Date(),
          new Date(data.last_donation_date)
        );
        if (daysSinceLastDonation < 90) {
          toast.error('You must wait at least 90 days between donations');
          return;
        }
      }

      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError || !sessionData.session) {
        toast.error('Please sign in to register for the camp');
        return;
      }

      // Filter out 'none' from medical conditions
      const medicalConditions = data.medical_conditions.filter(
        (condition) => condition !== 'none'
      );

      const { error: registrationError } = await supabase.from('camp_registrations').insert({
        camp_id: camp.id,
        user_id: sessionData.session.user.id,
        full_name: data.full_name,
        date_of_birth: data.date_of_birth,
        blood_type: data.blood_type,
        contact_number: data.contact_number,
        last_donation_date: data.last_donation_date || null,
        medical_conditions: medicalConditions,
      });

      if (registrationError) {
        if (registrationError.code === '23505') {
          toast.error('You have already registered for this camp');
        } else {
          throw registrationError;
        }
        return;
      }

      toast.success('Successfully registered for the camp!');
      onComplete();
    } catch (error) {
      console.error('Error registering for camp:', error);
      toast.error('Failed to register for the camp');
    }
  };

  return (
    <div className="relative max-h-[80vh] overflow-y-auto p-6">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Register for Blood Donation Camp</h2>
        <p className="mt-2 text-gray-600">
          {camp.name} on {format(new Date(camp.camp_date), 'PPP')}
        </p>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Please ensure you meet the following criteria:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
              <li>You must be at least 18 years old</li>
              <li>Your last blood donation should be more than 90 days ago</li>
              <li>You should be in good health condition</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          label="Full Name"
          name="full_name"
          register={register}
          error={errors.full_name}
          required
        />

        <FormField
          label="Date of Birth"
          name="date_of_birth"
          type="date"
          register={register}
          error={errors.date_of_birth}
          required
        />

        <FormField
          label="Blood Type"
          name="blood_type"
          register={register}
          error={errors.blood_type}
          type="select"
          options={BLOOD_TYPES}
          required
        />

        <FormField
          label="Contact Number"
          name="contact_number"
          register={register}
          error={errors.contact_number}
          type="tel"
          required
        />

        <FormField
          label="Last Donation Date (if any)"
          name="last_donation_date"
          type="date"
          register={register}
          error={errors.last_donation_date}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Conditions
          </label>
          <div className="grid grid-cols-2 gap-4">
            {MEDICAL_CONDITIONS.map((condition) => (
              <label key={condition.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={condition.value}
                  {...register('medical_conditions')}
                  className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-700">{condition.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register for Camp'}
          </button>
        </div>
      </form>
    </div>
  );
}