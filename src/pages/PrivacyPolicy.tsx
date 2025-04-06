import React from 'react';
import { Shield, Lock, Eye, Database, Bell, UserCheck } from 'lucide-react';

interface PolicySection {
  id: number;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 1,
    title: 'Information We Collect',
    content:
      'We collect personal information that you voluntarily provide to us when you register on LifeLink, including but not limited to your name, email address, phone number, blood type, and date of birth. We also collect information about your blood donation history and medical eligibility status.',
    icon: <Database className="h-8 w-8 text-red-500" />,
  },
  {
    id: 2,
    title: 'How We Use Your Information',
    content:
      'Your information is used to match you with blood donation requests, send notifications about donation opportunities, maintain your donor profile, and ensure the safety of the blood donation process. We also use aggregated data to improve our services and understand donation patterns.',
    icon: <Eye className="h-8 w-8 text-red-500" />,
  },
  {
    id: 3,
    title: 'Information Sharing',
    content:
      'We share your information only with authorized healthcare facilities and blood banks when you agree to donate. Your personal information is never sold to third parties or used for marketing purposes without your explicit consent.',
    icon: <UserCheck className="h-8 w-8 text-red-500" />,
  },
  {
    id: 4,
    title: 'Notifications and Communications',
    content:
      'We send notifications about donation requests, appointment reminders, and important updates about our service. You can customize your notification preferences in your account settings at any time.',
    icon: <Bell className="h-8 w-8 text-red-500" />,
  },
  {
    id: 5,
    title: 'Data Security',
    content:
      'We implement robust security measures to protect your personal information from unauthorized access, alteration, or disclosure. This includes encryption, secure servers, and regular security audits.',
    icon: <Lock className="h-8 w-8 text-red-500" />,
  },
];

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Privacy <span className="text-red-500">Policy</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We are committed to protecting your privacy and ensuring the
              security of your personal information.
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">
            Last Updated: March 16, 2024
          </p>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {POLICY_SECTIONS.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-start">
                <div className="bg-red-50 p-3 rounded-lg mr-6">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                  <p className="text-gray-600">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Information */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-red-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Rights and Choices
          </h2>
          <div className="space-y-4 text-gray-600">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and receive a copy of your personal information</li>
              <li>Update or correct inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to the processing of your personal information</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-6">
              To exercise these rights or if you have any questions about our
              privacy practices, please contact our Privacy Officer at
              privacy@lifelink.com
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Questions About Privacy?
          </h2>
          <p className="text-gray-600 mb-6">
            If you have any questions or concerns about our Privacy Policy,
            please don't hesitate to contact us.
          </p>
          <button className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition">
            Contact Privacy Officer
          </button>
        </div>
      </div>
    </div>
  );
}
