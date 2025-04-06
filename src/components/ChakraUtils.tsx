/**
 * This file provides compatibility utilities for ChakraUI components
 * in case they are missing or have issues with import.
 */

import React from 'react';

// Simplified modal wrappers
export const Modal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {children}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const ModalHeader = ({ children }: any) => (
  <h2 className="text-xl font-semibold mb-4">{children}</h2>
);

export const ModalBody = ({ children }: any) => (
  <div className="mb-6">{children}</div>
);

export const ModalFooter = ({ children }: any) => (
  <div className="flex justify-end space-x-3">{children}</div>
);

export const ModalOverlay = () => null;
export const ModalContent = ({ children }: any) => <>{children}</>;
export const ModalCloseButton = () => null;

export const Button = ({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'solid',
  colorScheme = 'blue',
  isLoading = false,
  mr
}: any) => {
  const getClasses = () => {
    if (variant === 'ghost') return 'bg-transparent text-gray-700 hover:bg-gray-100';
    if (colorScheme === 'blue') return 'bg-blue-500 text-white hover:bg-blue-600';
    return 'bg-gray-500 text-white hover:bg-gray-600';
  };
  
  const marginClass = mr ? `mr-${mr}` : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`px-4 py-2 rounded ${getClasses()} ${marginClass} transition`}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export const FormControl = ({ children, isRequired }: any) => (
  <div className="mb-4">
    {isRequired && <span className="text-red-500 mr-1">*</span>}
    {children}
  </div>
);

export const FormLabel = ({ children }: any) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
);

export const Input = ({ type, value, onChange, min }: any) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    min={min}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
);

export const VStack = ({ spacing, children }: any) => {
  const spacingClass = spacing ? `space-y-${spacing}` : 'space-y-4';
  return <div className={spacingClass}>{children}</div>;
};

// Toast utility
let toastIdCounter = 0;
const toasts: any[] = [];

export const useToast = () => {
  return (props: any) => {
    const { title, description, status, duration = 3000, isClosable = true } = props;
    
    // In a real implementation, this would show a toast UI
    console.log(`TOAST (${status}): ${title} - ${description}`);
    
    // For real implementation, you'd want to return an ID to allow closing
    const id = toastIdCounter++;
    toasts.push({ id, ...props });
    
    // Auto-remove after duration
    if (duration) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id);
        if (index !== -1) {
          toasts.splice(index, 1);
        }
      }, duration);
    }
    
    return id;
  };
}; 