import React from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Bell,
  MessageSquare,
  Heart,
  Award,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export function HowItWorks() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              How LifeLink <span className="text-red-500">Works</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              LifeLink connects blood donors with those in need through a simple, secure, and
              efficient platform. Here's how you can be part of saving lives.
            </p>
          </div>
        </div>
      </div>

      {/* Process Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">1. Register</h3>
            <p className="text-gray-600">
              Sign up as a donor or recipient. Provide your details and blood type information.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">2. Find Match</h3>
            <p className="text-gray-600">
              Our system matches blood requests with compatible donors in the nearby area.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">3. Get Notified</h3>
            <p className="text-gray-600">
              Receive instant notifications when there's a match or urgent blood requirement.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3">4. Save Lives</h3>
            <p className="text-gray-600">
              Coordinate with the recipient or donor and complete the blood donation process.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Features</h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need for a seamless blood donation experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <MessageSquare className="h-10 w-10 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Communication</h3>
              <p className="text-gray-600">
                Built-in messaging system for seamless coordination between donors and recipients.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <Award className="h-10 w-10 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Reward System</h3>
              <p className="text-gray-600">
                Earn points and recognition for your contributions to the community.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <CheckCircle className="h-10 w-10 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verified Profiles</h3>
              <p className="text-gray-600">
                All users are verified to ensure safety and reliability of the platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-red-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-red-100 mb-8">
            Join our community and be part of something meaningful.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-red-500 px-8 py-3 rounded-lg hover:bg-red-50 transition inline-flex items-center justify-center"
            >
              Register as Donor
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/emergency"
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition inline-flex items-center justify-center"
            >
              Request Blood
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}