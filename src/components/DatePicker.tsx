import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
  label: string;
  minDate?: Date;
  required?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, error, label, minDate, required, className }: DatePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <ReactDatePicker
          selected={value}
          onChange={onChange}
          minDate={minDate}
          required={required}
          dateFormat="yyyy-MM-dd"
          className={`w-full px-4 py-2 border ${
            error ? 'border-red-500' : 'border-gray-300'
          } rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${className || ''}`}
          wrapperClassName="w-full"
          showYearDropdown
          scrollableYearDropdown
          yearDropdownItemNumber={100}
        />
        <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}