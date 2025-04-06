import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface DonationDateSelectorProps {
  onSelectDate: (date: Date) => void;
}

export function DonationDateSelector({ onSelectDate }: DonationDateSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate) {
      onSelectDate(selectedDate);
    }
  };

  // Calculate tomorrow's date for the minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-7 w-7 mr-2 text-red-500" />
          Schedule a Blood Donation
        </h1>
        <p className="text-gray-600 mt-2">
          Please select a date when you would like to donate blood. We will show you available blood banks and hospitals near your location.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Donation Date
          </label>
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            minDate={tomorrow}
            className="w-full"
            required
            label="Select Date"
          />
          <p className="text-sm text-gray-500 mt-2">
            Please select a date at least one day in the future.
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={!selectedDate}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
} 