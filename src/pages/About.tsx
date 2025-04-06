import React from 'react';
import { Heart, Users, Globe, Award, Phone, Mail, MapPin } from 'lucide-react';

export function About() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Heart className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              About <span className="text-red-500">LifeLink</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're on a mission to make blood donation accessible to everyone, everywhere.
              Through technology and community, we're saving lives together.
            </p>
          </div>
        </div>
      </div>

      {/* Mission and Vision */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600">
              To create a seamless connection between blood donors and recipients, ensuring that
              no life is lost due to blood shortage. We leverage technology to make blood
              donation more accessible, efficient, and rewarding for everyone involved.
            </p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
            <p className="text-gray-600">
              A world where every person has immediate access to safe blood when needed. We
              envision a global community of donors ready to help save lives, supported by
              cutting-edge technology and a spirit of compassion.
            </p>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-gray-900 mb-2">50K+</div>
              <p className="text-gray-600">Lives Saved</p>
            </div>
            <div>
              <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-gray-900 mb-2">100K+</div>
              <p className="text-gray-600">Active Donors</p>
            </div>
            <div>
              <Globe className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-gray-900 mb-2">500+</div>
              <p className="text-gray-600">Cities Covered</p>
            </div>
            <div>
              <Award className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <div className="text-4xl font-bold text-gray-900 mb-2">10+</div>
              <p className="text-gray-600">Years of Service</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Our Team</h2>
          <p className="mt-4 text-lg text-gray-600">
            Meet the passionate individuals behind LifeLink
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: 'Dr. Sarah Johnson',
              role: 'Founder & CEO',
              image:
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
            },
            {
              name: 'Michael Chen',
              role: 'Chief Technology Officer',
              image:
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
            },
            {
              name: 'Dr. Emily Rodriguez',
              role: 'Medical Director',
              image:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
            },
          ].map((member, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-red-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                <p className="text-gray-600 mb-8">
                  Have questions or want to learn more about LifeLink? We'd love to hear from
                  you.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Phone className="h-6 w-6 text-red-500 mr-3" />
                    <span className="text-gray-600">+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-6 w-6 text-red-500 mr-3" />
                    <span className="text-gray-600">contact@lifelink.com</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-red-500 mr-3" />
                    <span className="text-gray-600">
                      123 Health Street, New York, NY 10001
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}