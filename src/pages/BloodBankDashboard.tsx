import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Clock, AlertCircle, Bell, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BloodInventoryManager } from '../components/BloodInventoryManager';
import { BloodBankRequestList } from '../components/BloodBankRequestList';
import BloodBankSlots from '../components/BloodBankSlots';
import toast from 'react-hot-toast';

interface BloodBank {
  id: string;
  name: string;
  address: string;
  contact_number: string;
  email: string;
  is_verified: boolean;
  status: string;
}

interface Notification {
  id: string;
  status: string;
  created_at: string;
  request: {
    patient_name: string;
    blood_type: string;
    units_required: number;
  };
}

export function BloodBankDashboard() {
  const navigate = useNavigate();
  const [bloodBank, setBloodBank] = useState<BloodBank | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'slots'>('inventory');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBloodBankProfile = async () => {
      try {
        console.log('Fetching blood bank profile...');
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (authError || !session) {
          console.error('Auth error:', authError);
          toast.error('Please sign in to view your dashboard');
          navigate('/signin');
          return;
        }

        console.log('User session:', session);
        console.log('User type:', session.user.user_metadata?.user_type);

        // Check if user is a blood bank
        if (session.user.user_metadata?.user_type !== 'blood_bank') {
          toast.error('Access denied. This dashboard is for blood banks only.');
          navigate('/');
          return;
        }

        // Fetch blood bank profile
        const { data: bloodBankData, error: profileError } = await supabase
          .from('blood_banks')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          if (profileError.code === 'PGRST116') {
            toast.error('Please complete your blood bank registration');
            navigate('/register');
          } else {
            throw profileError;
          }
          return;
        }

        console.log('Blood bank data fetched:', bloodBankData);

        // Fetch notifications
        const { data: notifData, error: notifError } = await supabase
          .from('blood_bank_notifications')
          .select(
            `
            id,
            status,
            created_at,
            blood_bank_requests (
              patient_name,
              blood_type,
              units_required
            )
          `
          )
          .eq('blood_bank_id', bloodBankData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (notifError) {
          console.error('Notification error:', notifError);
          throw notifError;
        }

        console.log('Notifications fetched:', notifData);

        setBloodBank(bloodBankData);
        setNotifications(notifData || []);
        setLoading(false);
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('Failed to load dashboard');
        setLoading(false);
      }
    };

    fetchBloodBankProfile();
  }, [navigate]);

  if (loading || !bloodBank) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <Building2 className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {bloodBank.name}
                </h1>
                <p className="text-gray-600">{bloodBank.address}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div
                className={`text-lg font-semibold ${
                  bloodBank.status === 'active'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {bloodBank.status.charAt(0).toUpperCase() +
                  bloodBank.status.slice(1)}
              </div>
            </div>
          </div>

          {!bloodBank.is_verified && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center text-yellow-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>
                  Your blood bank is pending verification. Some features may be
                  limited until verification is complete.
                </span>
              </div>
            </div>
          )}

          {notifications.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-700">
                <Bell className="h-5 w-5 mr-2" />
                <span>
                  You have {notifications.length} new blood request
                  {notifications.length !== 1 && 's'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'inventory'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-5 w-5 inline-block mr-2" />
              Inventory Management
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'requests'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              Blood Requests
              {notifications.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'slots'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-5 w-5 inline-block mr-2" />
              Donation Slots
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'inventory' ? (
              <BloodInventoryManager bloodBankId={bloodBank.id} />
            ) : activeTab === 'requests' ? (
              <BloodBankRequestList bloodBankId={bloodBank.id} />
            ) : (
              <BloodBankSlots />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
