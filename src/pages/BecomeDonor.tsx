import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, AlertCircle } from 'lucide-react';
import { DonorForm } from '../components/DonorForm';
import { supabase } from '../lib/supabase';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  full_name: string;
  blood_group: string;
  date_of_birth: string;
  contact_number: string;
}

export function BecomeDonor() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session) {
          toast.error('Please sign in to become a donor');
          navigate('/signin');
          return;
        }

        // Check if user is already a donor
        const { data: donorData, error: donorError } = await supabase
          .from('donors')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (donorError && donorError.code !== 'PGRST116') {
          throw donorError;
        }

        if (donorData) {
          toast.error('You are already registered as a donor');
          navigate('/dashboard');
          return;
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setUserProfile(profileData);
      } catch (error) {
        console.error('Error checking auth and profile:', error);
        toast.error('Failed to load user profile');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Become a Donor</h1>
          <p className="mt-2 text-lg text-gray-600">
            Fill out your donor profile to start saving lives
          </p>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Important Information
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside">
                  <li>
                    You must be at least 18 years old to register as a donor
                  </li>
                  <li>
                    Please ensure all medical information provided is accurate
                  </li>
                  <li>
                    Your contact information will only be shared with verified
                    recipients
                  </li>
                  <li>You can update your availability status at any time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <DonorForm userProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}
