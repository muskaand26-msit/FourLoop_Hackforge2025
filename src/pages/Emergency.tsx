import React from 'react';
import { AlertCircle, CheckCircle, Heart } from 'lucide-react';
import { EmergencyRequestForm } from '../components/EmergencyRequestForm';
import { Toaster } from 'react-hot-toast';

export function Emergency() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-500 text-white p-6 rounded-lg mb-8 flex items-start">
          <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Emergency Blood Request</h2>
            <p>
              This form is for emergency blood requests only. Our system will immediately notify
              matching donors in your area and show nearby blood banks. For non-emergency requests, please use our standard
              blood request form.
            </p>
          </div>
        </div>

        <div className="mb-8">
          <EmergencyRequestForm />
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 p-6 rounded-lg flex items-start">
          <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">How LifeLink works in emergencies</h3>
            <ul className="list-disc list-inside space-y-2 text-green-700">
              <li>Submit your emergency request with the patient and hospital details</li>
              <li>Our system shows you real-time locations of nearby matching donors</li>
              <li>We calculate the estimated time of arrival for each potential donor</li>
              <li>You can directly connect with donors who are closest to the hospital</li>
              <li>Our platform also shows nearby blood banks for additional support</li>
              <li>You'll receive updates as donors respond to your request</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Your request can save lives</h4>
          <p className="text-gray-600 max-w-md mx-auto">
            Every emergency blood request you submit helps connect patients with life-saving donors in your community.
          </p>
        </div>
      </div>
    </div>
  );
}