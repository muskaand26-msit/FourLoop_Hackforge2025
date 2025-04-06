import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone } from 'lucide-react';
import { contactDonorSchema, type ContactDonorFormData } from '../lib/validation';
import { FormField } from './FormField';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { sendSMSNotification, sendEmailNotification } from '../lib/notifications';

interface ContactDonorFormProps {
  donorId: string;
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  onClose: () => void;
}

const URGENCY_LEVELS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

export function ContactDonorForm({
  donorId,
  donorName,
  donorPhone,
  donorEmail,
  onClose,
}: ContactDonorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactDonorFormData>({
    resolver: zodResolver(contactDonorSchema),
  });

  const onSubmit = async (data: ContactDonorFormData) => {
    try {
      // Create contact request in database
      const { error: requestError } = await supabase.from('contact_requests').insert({
        donor_id: donorId,
        ...data,
      });

      if (requestError) throw requestError;

      // Send SMS notification
      const smsMessage = `Hello ${donorName}, you have a new blood donation request from ${data.recipient_name} at ${data.hospital_name}. Urgency: ${data.urgency_level}. Please respond ASAP.`;
      await sendSMSNotification(donorPhone, smsMessage);

      // Send email notification
      const emailSubject = `Urgent Blood Donation Request - ${data.hospital_name}`;
      const emailMessage = `
        Dear ${donorName},

        You have received a blood donation request with the following details:

        Recipient: ${data.recipient_name}
        Hospital: ${data.hospital_name}
        Units Required: ${data.units_required}
        Urgency Level: ${data.urgency_level}
        Contact Number: ${data.contact_number}

        ${data.message ? `Additional Message: ${data.message}` : ''}

        Please respond to this request as soon as possible.

        Thank you for your help in saving lives!
      `;
      await sendEmailNotification(donorEmail, emailSubject, emailMessage);

      toast.success('Request sent successfully to the donor');
      onClose();
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Your Name"
        name="recipient_name"
        register={register}
        error={errors.recipient_name}
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
        label="Hospital Name"
        name="hospital_name"
        register={register}
        error={errors.hospital_name}
        required
      />
      <FormField
        label="Units Required"
        name="units_required"
        register={register}
        error={errors.units_required}
        type="number"
        required
      />
      <FormField
        label="Urgency Level"
        name="urgency_level"
        register={register}
        error={errors.urgency_level}
        type="select"
        options={URGENCY_LEVELS}
        required
      />
      <FormField
        label="Additional Message"
        name="message"
        register={register}
        error={errors.message}
        type="textarea"
      />

      <div className="flex items-center space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send Request'}
          <Phone className="ml-2 h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}