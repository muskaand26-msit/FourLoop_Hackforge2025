import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
}

export function FormField({
  label,
  name,
  register,
  error,
  type = 'text',
  required = false,
  icon,
  placeholder
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            id={name}
            {...register(name)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm ${
              icon ? 'pl-10' : ''
            }`}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            id={name}
            {...register(name)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm ${
              icon ? 'pl-10' : ''
            }`}
            placeholder={placeholder}
          />
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}