import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { EmergencyMapView } from './EmergencyMapView';

interface EmergencyRequestFormProps {
  onSuccess?: () => void;
}

export function EmergencyRequestForm({ onSuccess }: EmergencyRequestFormProps) {
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_type: '',
    units_required: '',
    hospital_name: '',
    hospital_address: '',
    contact_person: '',
    contact_number: '',
    urgency_level: 'urgent',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  const [emergencyRequestId, setEmergencyRequestId] = useState<string | null>(null);
  const hasShownAuthToast = useRef(false);
  const hasShownLocationToast = useRef(false);
  const { user } = useAuth();

  // Get initial location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
        },
        (error) => {
          console.error('Error getting initial location:', error);
          if (!hasShownLocationToast.current) {
            toast.error('Please enable location services to use this feature');
            hasShownLocationToast.current = true;
          }
        }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (!hasShownAuthToast.current) {
        toast.error('Please sign in to submit an emergency request', {
          id: 'auth-required-toast',
          duration: 3000
        });
        hasShownAuthToast.current = true;
      }
      return;
    }

    if (!location) {
      if (!hasShownLocationToast.current) {
        toast.error('Please enable location services to submit an emergency request', {
          id: 'location-required-toast',
          duration: 3000
        });
        hasShownLocationToast.current = true;
      }
      return;
    }

    setIsLoading(true);
    try {
      // Validate phone number format
      const phoneRegex = /^\+?[0-9\s-()]{8,20}$/;
      if (!phoneRegex.test(formData.contact_number)) {
        toast.error('Please enter a valid phone number', {
          id: 'invalid-phone-toast',
          duration: 3000
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('emergency_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          latitude: location.latitude,
          longitude: location.longitude,
          blood_type: formData.blood_type,
          patient_name: formData.patient_name,
          units_required: formData.units_required,
          hospital_name: formData.hospital_name,
          hospital_address: formData.hospital_address,
          contact_person: formData.contact_person,
          contact_number: formData.contact_number,
          urgency_level: formData.urgency_level,
          notes: formData.notes
        })
        .select('id')
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }

      setEmergencyRequestId(data.id);
      
      toast.success('Emergency request submitted successfully!', {
        id: 'request-submitted-toast',
        duration: 3000
      });
      
      // Show map view with nearby donors and blood banks
      setShowMapView(true);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting emergency request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit emergency request. Please try again.';
      toast.error(errorMessage, {
        id: 'request-error-toast',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectEntity = (entityId: string, name: string, phone: string) => {
    // Open phone dialer or copy phone number
    const confirmConnect = window.confirm(`Would you like to contact ${name} at ${phone}?`);
    if (confirmConnect) {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {!showMapView ? (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Emergency Blood Request</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={formData.patient_name}
                  onChange={(e) =>
                    setFormData({ ...formData, patient_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Type
                </label>
                <select
                  value={formData.blood_type}
                  onChange={(e) =>
                    setFormData({ ...formData, blood_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Units Required
                </label>
                <input
                  type="number"
                  value={formData.units_required}
                  onChange={(e) =>
                    setFormData({ ...formData, units_required: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name
                </label>
                <input
                  type="text"
                  value={formData.hospital_name}
                  onChange={(e) =>
                    setFormData({ ...formData, hospital_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Address
                </label>
                <input
                  type="text"
                  value={formData.hospital_address}
                  onChange={(e) =>
                    setFormData({ ...formData, hospital_address: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_number: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <select
                  value={formData.urgency_level}
                  onChange={(e) =>
                    setFormData({ ...formData, urgency_level: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {location ? (
                  <span>Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                ) : (
                  <span>Getting location...</span>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !location}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-green-100 border-l-4 border-green-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Your emergency request has been submitted successfully! Finding nearby donors and blood banks...
                </p>
              </div>
            </div>
          </div>
          
          {emergencyRequestId && (
            <EmergencyMapView
              emergencyRequestId={emergencyRequestId}
              hospitalAddress={formData.hospital_address}
              bloodType={formData.blood_type}
              onConnect={handleConnectEntity}
            />
          )}
          
          <div className="flex justify-end p-4">
            <button
              onClick={() => window.location.href = '/emergency-requests'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              View All Emergency Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
