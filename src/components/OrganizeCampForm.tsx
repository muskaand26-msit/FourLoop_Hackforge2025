import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { FormField } from './FormField';

const campSchema = z.object({
  name: z.string().min(2, 'Camp name must be at least 2 characters'),
  description: z.string().min(10, 'Please provide a detailed description'),
  location: z.string().min(5, 'Please enter a valid location'),
  camp_date: z.string().refine((date) => {
    if (!date) return false;
    return new Date(date) >= new Date();
  }, 'Camp date must be in the future'),
  start_time: z.string(),
  end_time: z.string(),
  organizer_name: z.string().min(2, 'Organizer name must be at least 2 characters'),
  organizer_contact: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  max_participants: z.coerce
    .number()
    .min(1, 'Must accept at least 1 participant')
    .max(1000, 'Maximum 1000 participants allowed'),
});

type CampFormData = z.infer<typeof campSchema>;

interface OrganizeCampFormProps {
  onComplete: () => void;
  onClose: () => void;
}

export function OrganizeCampForm({ onComplete, onClose }: OrganizeCampFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CampFormData>({
    resolver: zodResolver(campSchema),
    defaultValues: {
      max_participants: 100,
    },
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  const onSubmit = async (data: CampFormData) => {
    try {
      // Validate time range
      if (data.start_time >= data.end_time) {
        toast.error('End time must be after start time');
        return;
      }

      const { data: sessionData, error: authError } = await supabase.auth.getSession();
      if (authError || !sessionData.session) {
        toast.error('Please sign in to organize a camp');
        return;
      }

      const { error: campError } = await supabase.from('donation_camps').insert({
        organizer_id: sessionData.session.user.id,
        ...data,
      });

      if (campError) throw campError;

      toast.success('Blood donation camp created successfully!');
      onComplete();
    } catch (error) {
      console.error('Error creating camp:', error);
      toast.error('Failed to create blood donation camp');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Organize Blood Donation Camp</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-2 text-gray-600">
            Fill in the details below to organize a new blood donation camp
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <FormField
            label="Camp Name"
            name="name"
            register={register}
            error={errors.name}
            required
          />

          <FormField
            label="Description"
            name="description"
            register={register}
            error={errors.description}
            type="textarea"
            required
          />

          <FormField
            label="Location"
            name="location"
            register={register}
            error={errors.location}
            type="textarea"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Camp Date"
              name="camp_date"
              type="date"
              register={register}
              error={errors.camp_date}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Start Time"
                name="start_time"
                type="time"
                register={register}
                error={errors.start_time}
                required
              />

              <FormField
                label="End Time"
                name="end_time"
                type="time"
                register={register}
                error={errors.end_time}
                required
              />
            </div>

            <FormField
              label="Organizer Name"
              name="organizer_name"
              register={register}
              error={errors.organizer_name}
              required
            />

            <FormField
              label="Contact Number"
              name="organizer_contact"
              type="tel"
              register={register}
              error={errors.organizer_contact}
              required
            />
          </div>

          <FormField
            label="Maximum Participants"
            name="max_participants"
            type="number"
            register={register}
            error={errors.max_participants}
            required
          />

          <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-50 flex items-center"
              >
                <Building2 className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Creating Camp...' : 'Create Camp'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}