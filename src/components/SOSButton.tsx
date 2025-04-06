import React, { useState, useRef } from 'react';
import { AlertTriangle, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function SOSButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const hasShownAuthToast = useRef(false);

  const handleSOS = async () => {
    if (!user) {
      if (!hasShownAuthToast.current) {
        toast.error('Please sign in to use the emergency feature');
        hasShownAuthToast.current = true;
      }
      return;
    }

    const confirmed = window.confirm(
      'This will send an emergency notification to all nearby blood banks and donors. Continue?'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Create emergency request
      const { data: emergency, error: emergencyError } = await supabase
        .from('emergency_requests')
        .insert({
          user_id: user.id,
          patient_name: user.user_metadata?.full_name || 'Anonymous',
          blood_type: user.user_metadata?.blood_type || 'unknown',
          units_required: 1,
          hospital_name: 'Nearest Hospital',
          hospital_address: 'To be updated',
          contact_person: user.user_metadata?.full_name || 'Anonymous',
          contact_number: user.user_metadata?.phone || '',
          notes: 'Emergency blood requirement - Immediate assistance needed',
          status: 'urgent',
          urgency_level: 'critical',
          is_panic: true
        })
        .select()
        .single();

      if (emergencyError) throw emergencyError;

      toast.success('Emergency alert sent successfully! Blood banks and donors have been notified.');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      toast.error('Failed to send emergency alert');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSOS}
      disabled={isLoading}
      className="flex items-center justify-center bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
      title="Click in case of emergency blood requirement"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      ) : (
        <>
          <AlertTriangle className="h-5 w-5" />
          <Heart className="h-5 w-5 ml-2" />
        </>
      )}
      <span className="font-medium ml-2">
        {isLoading ? 'Sending SOS...' : 'Panic'}
      </span>
    </button>
  );
} 