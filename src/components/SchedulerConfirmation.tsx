import React from 'react';
import { CheckCircle, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SchedulerConfirmationProps {
  onScheduleAnother: () => void;
}

export function SchedulerConfirmation({ onScheduleAnother }: SchedulerConfirmationProps) {
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