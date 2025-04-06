import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    id: 1,
    category: 'General',
    question: 'What is LifeLink?',
    answer:
      'LifeLink is a platform that connects blood donors with those in need of blood transfusions. We use technology to make the blood donation process more efficient and accessible, helping save lives in our community.',
  },
  {
    id: 2,
    category: 'Donation',
    question: 'Who can donate blood?',
    answer:
      'Generally, anyone aged 18-65, weighing at least 50kg, and in good health can donate blood. However, certain medical conditions or recent activities may affect eligibility. Our system will help determine your eligibility during registration.',
  },
  {
    id: 3,
    category: 'Donation',
    question: 'How often can I donate blood?',
    answer:
      'Whole blood donors must wait at least 8 weeks (56 days) between donations. This waiting period allows your body to replenish the red blood cells lost during donation. Different intervals apply for other types of donations.',
  },
  {
    id: 4,
    category: 'Process',
    question: 'What happens during a blood donation?',
    answer:
      'The donation process takes about 10-15 minutes. After registration and a brief health check, a sterile needle is used to draw blood. The entire visit, including registration and recovery time, typically takes about an hour.',
  },
  {
    id: 5,
    category: 'Safety',
    question: 'Is it safe to donate blood?',
    answer:
      'Yes, blood donation is very safe. All equipment used is sterile and disposed of after a single use. Our partner facilities follow strict safety protocols, and trained healthcare professionals oversee the donation process.',
  },
  {
    id: 6,
    category: 'Process',
    question: 'How should I prepare for blood donation?',
    answer:
      "Get a good night's sleep, eat a healthy meal, drink plenty of fluids, and avoid fatty foods before donating. Wear comfortable clothing with sleeves that can be easily rolled up.",
  },
  {
    id: 7,
    category: 'General',
    question: 'What blood types are most needed?',
    answer:
      'All blood types are needed, but O-negative blood (universal donor) and AB-positive plasma (universal plasma donor) are in especially high demand. However, we encourage donations of all blood types.',
  },
  {
    id: 8,
    category: 'Safety',
    question: 'What are the side effects of donating blood?',
    answer:
      'Most donors feel fine after donating blood. Some may experience mild fatigue, slight bruising at the needle site, or light-headedness. These symptoms typically resolve quickly with rest and hydration.',
  },
];

export function FAQs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(FAQS.map((faq) => faq.category))];

  const filteredFAQs = FAQS.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <HelpCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked <span className="text-red-500">Questions</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about blood donation and using
              LifeLink.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative mb-6">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                  selectedCategory === category
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">
                  {faq.question}
                </span>
                {openId === faq.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {openId === faq.id && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-red-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still Have Questions?
          </h2>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Our support team is here to
            help.
          </p>
          <button className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
