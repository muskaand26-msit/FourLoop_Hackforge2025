import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const confirmationSchema = z.object({
  units_received: z.number().min(1, 'Must confirm at least 1 unit received'),
  notes: z.string().optional(),
});

type ConfirmationFormData = z.infer<typeof confirmationSchema>;

interface RecipientConfirmationProps {
  requestId: string;
  donationId: string;
  expectedUnits: number;
  onConfirmed: () => void;
  onClose: () => void;
}

export function RecipientConfirmation({
  requestId,
  donationId,
  expectedUnits,
  onConfirmed,
  onClose,
}: RecipientConfirmationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      units_received: expectedUnits,
    },
  });

  const onSubmit = async (data: ConfirmationFormData) => {
    try {
      // Update blood donation record
      const { error: donationError } = await supabase
        .from('blood_donations')
        .update({
          recipient_confirmed: true,
          verification_status: 'verified',
          notes: data.notes ? `${data.notes} (Recipient confirmed ${data.units_received} units received)` : `Recipient confirmed ${data.units_received} units received`,
        })
        .eq('id', donationId);

      if (donationError) throw donationError;

      // Update emergency request status
      const { error: requestError } = await supabase
        .from('emergency_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);

      if (requestError) throw requestError;

      toast.success('Blood donation confirmed successfully!');
      onConfirmed();
    } catch (error) {
      console.error('Error confirming donation:', error);
      toast.error('Failed to confirm donation');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Confirm Blood Receipt</h2>
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Units Received
          </label>
          <input
            type="number"
            {...register('units_received', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
          {errors.units_received && (
            <p className="mt-1 text-sm text-red-500">{errors.units_received.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Additional Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
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
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md disabled:opacity-50"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}