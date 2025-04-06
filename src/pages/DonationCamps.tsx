import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Phone,
  AlertCircle,
  CheckCircle,
  Building2,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { CampRegistrationForm } from '../components/CampRegistrationForm';
import { OrganizeCampForm } from '../components/OrganizeCampForm';

interface DonationCamp {
  id: string;
  name: string;
  description: string;
  location: string;
  camp_date: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  organizer_contact: string;
  max_participants: number;
  current_participants: number;
  status: string;
}

export function DonationCamps() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'participate' | 'organize'>('participate');
  const [camps, setCamps] = useState<DonationCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamp, setSelectedCamp] = useState<DonationCamp | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showOrganizeForm, setShowOrganizeForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const hasShownAuthToast = useRef(false);

  const fetchCamps = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('donation_camps')
        .select('*')
        .gte('camp_date', new Date().toISOString().split('T')[0])
        .order('camp_date', { ascending: true });

      if (error) throw error;
      setCamps(data || []);
    } catch (error) {
      console.error('Error fetching camps:', error);
      toast.error('Failed to load donation camps');
    } finally {
      setLoading(false);
    }
  };

  // First effect to check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        if (!hasShownAuthToast.current) {
          toast.error('Please sign in to access donation camps');
          hasShownAuthToast.current = true;
          navigate('/signin');
        }
        return;
      }

      setCurrentUser(session.user);
    };

    checkAuth();
  }, [navigate]);

  // Second effect to fetch camps only if user is authenticated
  useEffect(() => {
    fetchCamps();
  }, [currentUser]);

  const handleParticipate = (camp: DonationCamp) => {
    setSelectedCamp(camp);
    setShowRegistrationForm(true);
  };

  const handleRegistrationComplete = () => {
    setShowRegistrationForm(false);
    setSelectedCamp(null);
    fetchCamps();
    toast.success('Successfully registered for the camp!');
  };

  const handleOrganizeComplete = () => {
    setShowOrganizeForm(false);
    fetchCamps();
    toast.success('Blood donation camp created successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading donation camps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modal for Registration Form */}
        {showRegistrationForm && selectedCamp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <CampRegistrationForm
                camp={selectedCamp}
                onComplete={handleRegistrationComplete}
                onClose={() => setShowRegistrationForm(false)}
              />
            </div>
          </div>
        )}

        {/* Modal for Organize Form */}
        {showOrganizeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <OrganizeCampForm
                onComplete={handleOrganizeComplete}
                onClose={() => setShowOrganizeForm(false)}
              />
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('participate')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'participate'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-5 w-5 inline-block mr-2" />
              Participate in Camps
            </button>
            <button
              onClick={() => setActiveTab('organize')}
              className={`flex-1 py-4 px-6 text-center ${
                activeTab === 'organize'
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="h-5 w-5 inline-block mr-2" />
              Organize a Camp
            </button>
          </div>
        </div>

        {activeTab === 'participate' ? (
          <div className="space-y-6">
            {camps.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming donation camps</p>
              </div>
            ) : (
              camps.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {camp.name}
                      </h3>
                      <p className="text-gray-600 mb-4">{camp.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-5 w-5 mr-2" />
                          {format(new Date(camp.camp_date), 'PPP')}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-5 w-5 mr-2" />
                          {format(new Date(`2000-01-01T${camp.start_time}`), 'h:mm a')} -{' '}
                          {format(new Date(`2000-01-01T${camp.end_time}`), 'h:mm a')}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-5 w-5 mr-2" />
                          {camp.location}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="h-5 w-5 mr-2" />
                          {camp.current_participants} / {camp.max_participants} registered
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Building2 className="h-5 w-5 mr-2" />
                          {camp.organizer_name}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-5 w-5 mr-2" />
                          {camp.organizer_contact}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleParticipate(camp)}
                      disabled={camp.current_participants >= camp.max_participants}
                      className={`px-6 py-2 rounded-lg ${
                        camp.current_participants >= camp.max_participants
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      } transition`}
                    >
                      {camp.current_participants >= camp.max_participants
                        ? 'Camp Full'
                        : 'Participate'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Organize a Blood Donation Camp</h2>
              <p className="mt-2 text-gray-600">
                Help save lives by organizing a blood donation camp in your area
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setShowOrganizeForm(true)}
                className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Camp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}