import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function Navigation() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userType, setUserType] = useState<'user' | 'blood_bank' | 'hospital' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setUserType(user.user_metadata?.user_type || 'user');
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
      navigate('/');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Get dashboard link based on user type
  const getDashboardLink = () => {
    switch (userType) {
      case 'blood_bank':
        return '/blood-bank-dashboard';
      case 'hospital':
        return '/hospital-dashboard';
      default:
        return '/dashboard';
    }
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [navigate]);

  return (
    <nav className="bg-white shadow-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <Heart className="h-6 w-6 text-red-500" />
            <span className="text-lg font-bold text-gray-900 ml-2">LifeLink</span>
          </Link>

          {/* All Navigation Items - Desktop */}
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
            <div className="flex space-x-6">
              <Link to="/how-it-works" className="text-sm font-medium text-gray-700 hover:text-red-500">
                How it Works
              </Link>
              <Link to="/emergency-requests" className="text-sm font-medium text-gray-700 hover:text-red-500">
                Emergency Requests
              </Link>
              <Link to="/find-donors" className="text-sm font-medium text-gray-700 hover:text-red-500">
                Find Donors
              </Link>
              <Link to="/donation-camps" className="text-sm font-medium text-gray-700 hover:text-red-500">
                Blood Donation Camps
              </Link>
              <Link to="/community-chat" className="text-sm font-medium text-gray-700 hover:text-red-500">
                Community Chat
              </Link>
              <Link to="/about" className="text-sm font-medium text-gray-700 hover:text-red-500">
                About Us
              </Link>
              {user && (
                <>
                  {userType === 'user' && (
                    <Link to="/schedule-donation" className="text-sm font-medium text-gray-700 hover:text-red-500">
                      Schedule Donation
                    </Link>
                  )}
                  <Link to={getDashboardLink()} className="text-sm font-medium text-gray-700 hover:text-red-500">
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Auth Section - Desktop */}
          <div className="hidden lg:flex lg:items-center">
            {user ? (
              <button
                onClick={handleSignOut}
                className="ml-6 px-4 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/register" className="text-sm font-medium text-red-500 hover:text-red-600">
                  Register
                </Link>
                <Link
                  to="/signin"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-red-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/how-it-works"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              How it Works
            </Link>
            <Link
              to="/emergency-requests"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              Emergency Requests
            </Link>
            <Link
              to="/find-donors"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              Find Donors
            </Link>
            <Link
              to="/donation-camps"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              Blood Donation Camps
            </Link>
            <Link
              to="/community-chat"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              Community Chat
            </Link>
            <Link
              to="/about"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
            >
              About Us
            </Link>
            {user ? (
              <>
                {userType === 'user' && (
                  <Link
                    to="/schedule-donation"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
                  >
                    Schedule Donation
                  </Link>
                )}
                <Link
                  to={getDashboardLink()}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
                >
                  Register
                </Link>
                <Link
                  to="/signin"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}