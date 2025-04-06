import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const confirmationSchema = z.object({
  notes: z.string().optional(),
});

type ConfirmationFormData = z.infer<typeof confirmationSchema>;

interface RecipientBloodConfirmationProps {
  requestId: string;
  expectedUnits: number;
  onConfirmed: () => void;
  onClose: () => void;
}

export function RecipientBloodConfirmation({
  requestId,
  expectedUnits,
  onConfirmed,
  onClose,
}: RecipientBloodConfirmationProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmationFormData>({
    resolver: zodResolver(confirmationSchema),
  });

  const onSubmit = async (data: ConfirmationFormData) => {
    try {
      // Update request with recipient confirmation
      const { error: updateError } = await supabase
        .from('blood_bank_requests')
        .update({
          recipient_confirmed: true,
          recipient_confirmation_date: new Date().toISOString(),
          recipient_notes: data.notes,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast.success('Blood receipt confirmed successfully!');
      onConfirmed();
    } catch (error) {
      console.error('Error confirming blood receipt:', error);
      toast.error('Failed to confirm blood receipt');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Confirm Blood Receipt</h2>
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>

      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-700">
          Please confirm that you have received {expectedUnits} units of blood from the blood bank.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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