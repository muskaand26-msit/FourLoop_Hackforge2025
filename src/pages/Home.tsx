import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Droplet, Users, Clock, ArrowRight, Award, Shield, Map } from 'lucide-react';
import { BloodInventoryDisplay } from '../components/BloodInventoryDisplay';
import { SOSButton } from '../components/SOSButton';

const BLOOD_COMPATIBILITY = [
  { type: 'A+', canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], canDonateTo: ['A+', 'AB+'] },
  { type: 'A-', canReceiveFrom: ['A-', 'O-'], canDonateTo: ['A+', 'A-', 'AB+', 'AB-'] },
  { type: 'B+', canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], canDonateTo: ['B+', 'AB+'] },
  { type: 'B-', canReceiveFrom: ['B-', 'O-'], canDonateTo: ['B+', 'B-', 'AB+', 'AB-'] },
  { type: 'AB+', canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], canDonateTo: ['AB+'] },
  { type: 'AB-', canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'], canDonateTo: ['AB+', 'AB-'] },
  { type: 'O+', canReceiveFrom: ['O+', 'O-'], canDonateTo: ['A+', 'B+', 'AB+', 'O+'] },
  { type: 'O-', canReceiveFrom: ['O-'], canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
];

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-white pt-24 pb-16 sm:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Connecting Lives Through
                <span className="text-red-500"> Blood Donation</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Join our network of life-savers. Find blood donors near you or register to donate
                and help save lives in your community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Link
                  to="/emergency"
                  className="w-full sm:w-auto flex items-center justify-center bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
                >
                  Emergency Request
                  <Clock className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/become-donor"
                  className="w-full sm:w-auto flex items-center justify-center bg-white text-red-500 border-2 border-red-500 px-6 py-3 rounded-lg hover:bg-red-50 transition"
                >
                  Become a Donor
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <div className="w-full sm:w-auto">
                  <SOSButton />
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&q=80&w=800"
                alt="Blood Donation"
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Blood Inventory Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BloodInventoryDisplay />
          <div className="mt-8 text-center">
            <Link
              to="/blood-bank-request"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
            >
              Request Blood from Blood Bank
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-red-50 p-6 rounded-lg text-center">
              <Droplet className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">5,000+</h3>
              <p className="text-gray-600">Units Donated</p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg text-center">
              <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">2,500+</h3>
              <p className="text-gray-600">Active Donors</p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg text-center">
              <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-gray-900 mb-2">1,000+</h3>
              <p className="text-gray-600">Lives Saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose LifeLink?</h2>
            <p className="mt-4 text-lg text-gray-600">
              We make blood donation simple, secure, and rewarding
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Map className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Location Matching</h3>
              <p className="text-gray-600">
                Find donors near you instantly with our intelligent location-based matching system.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Shield className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade security and encryption.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Award className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Donor Rewards</h3>
              <p className="text-gray-600">
                Earn points and rewards for your life-saving donations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blood Type Compatibility Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Blood Type Compatibility</h2>
            <p className="mt-4 text-lg text-gray-600">
              Understanding blood type compatibility is crucial for successful transfusions
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BLOOD_COMPATIBILITY.map((blood) => (
              <div key={blood.type} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
                  <span className="text-xl font-bold text-red-500">{blood.type}</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Can Receive From:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blood.canReceiveFrom.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Can Donate To:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blood.canDonateTo.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Universal Donors and Recipients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Universal Donor (O-)</h4>
                <p className="text-gray-600">
                  O negative blood can be given to patients of all blood types. Only 7% of the
                  population has O negative blood, making it one of the most in-demand blood types.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Universal Recipient (AB+)</h4>
                <p className="text-gray-600">
                  AB positive patients can receive red blood cells from all blood types. This makes
                  them universal recipients, though they can only donate to other AB types.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">What Our Users Say</h2>
            <p className="mt-4 text-lg text-gray-600">
              Real stories from our community of donors and recipients
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Johnson',
                role: 'Regular Donor',
                image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
                quote:
                  'LifeLink makes it incredibly easy to donate blood. The rewards program is a great bonus!',
              },
              {
                name: 'Michael Chen',
                role: 'Recipient',
                image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
                quote:
                  'When I needed blood urgently, LifeLink connected me with donors within minutes.',
              },
              {
                name: 'Emily Rodriguez',
                role: 'Hospital Partner',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
                quote:
                  'The platform has revolutionized how we manage blood donations at our hospital.',
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">&ldquo;{testimonial.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-red-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Save Lives?</h2>
          <p className="text-xl text-red-100 mb-8">
            Join our community of donors and make a difference today.
          </p>
          <Link
            to="/register"
            className="bg-white text-red-500 px-8 py-3 rounded-lg hover:bg-red-50 transition inline-flex items-center"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}