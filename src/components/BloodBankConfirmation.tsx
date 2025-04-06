import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const confirmationSchema = z.object({
  units_provided: z.number().min(1, 'Must provide at least 1 unit'),
  notes: z.string().optional(),
});

type ConfirmationFormData = z.infer<typeof confirmationSchema>;

interface BloodBankConfirmationProps {
  notificationId: string;
  requestId: string;
  bloodBankId: string;
  requestedUnits: number;
  onConfirmed: () => void;
  onClose: () => void;
}

export function BloodBankConfirmation({
  notificationId,
  requestId,
  bloodBankId,
  requestedUnits,
  onConfirmed,
  onClose,
}: BloodBankConfirmationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      units_provided: requestedUnits,
    },
  });

  const onSubmit = async (data: ConfirmationFormData) => {
    try {
      // Update notification with blood bank confirmation
      const { error: updateError } = await supabase
        .from('blood_bank_notifications')
        .update({
          blood_bank_confirmed: true,
          blood_bank_confirmation_date: new Date().toISOString(),
          blood_bank_notes: data.notes,
          units_provided: data.units_provided,
          status: 'accepted'
        })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      // Update blood bank request status
      const { error: requestError } = await supabase
        .from('blood_bank_requests')
        .update({
          status: 'accepted'
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Update blood inventory
      const { error: inventoryError } = await supabase
        .from('blood_inventory')
        .update({
          units_available: supabase.sql`units_available - ${data.units_provided}`
        })
        .eq('blood_bank_id', bloodBankId);

      if (inventoryError) throw inventoryError;

      toast.success('Blood provision confirmed successfully!');
      onConfirmed();
    } catch (error) {
      console.error('Error confirming blood provision:', error);
      toast.error('Failed to confirm blood provision');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Confirm Blood Provision</h2>
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Units Provided
          </label>
          <input
            type="number"
            {...register('units_provided', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
          {errors.units_provided && (
            <p className="mt-1 text-sm text-red-500">{errors.units_provided.message}</p>
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
            {isSubmitting ? 'Confirming...' : 'Confirm Provision'}
          </button>
        </div>
      </form>
    </div>
  );
}