import React from 'react';
import { Heart, Calendar, User, ArrowRight, BookOpen } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  imageUrl: string;
}

const FEATURED_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'The Importance of Regular Blood Donation',
    excerpt:
      'Discover why regular blood donation is crucial for maintaining a healthy and sustainable blood supply in our healthcare system.',
    author: 'Dr. Sarah Johnson',
    date: 'March 15, 2024',
    readTime: '5 min read',
    imageUrl:
      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 2,
    title: 'Understanding Blood Types and Compatibility',
    excerpt:
      'Learn about different blood types and why matching blood types is essential for safe transfusions.',
    author: 'Dr. Michael Chen',
    date: 'March 10, 2024',
    readTime: '7 min read',
    imageUrl:
      'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 3,
    title: 'Tips for First-Time Blood Donors',
    excerpt:
      'Everything you need to know before your first blood donation, from preparation to recovery.',
    author: 'Emma Williams',
    date: 'March 5, 2024',
    readTime: '6 min read',
    imageUrl:
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800',
  },
];

export function Blog() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-red-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              LifeLink <span className="text-red-500">Blog</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed about blood donation, health tips, and inspiring
              stories from our community.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Featured Articles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURED_POSTS.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <User className="h-4 w-4 mr-1" />
                  <span className="mr-4">{post.author}</span>
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="mr-4">{post.date}</span>
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>{post.readTime}</span>
                </div>
                <button className="text-red-500 hover:text-red-600 font-medium flex items-center">
                  Read More
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-red-50 p-6 rounded-lg">
              <Heart className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Donation Guides
              </h3>
              <p className="text-gray-600">
                Step-by-step guides and tips for blood donation
              </p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg">
              <User className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Donor Stories
              </h3>
              <p className="text-gray-600">
                Inspiring stories from our donor community
              </p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg">
              <BookOpen className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Health & Wellness
              </h3>
              <p className="text-gray-600">
                Tips for maintaining good health as a donor
              </p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg">
              <Calendar className="h-8 w-8 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Events & News
              </h3>
              <p className="text-gray-600">
                Updates on blood drives and community events
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-500 rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-red-100 mb-6">
            Get the latest articles, news, and updates delivered straight to
            your inbox.
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button className="bg-white text-red-500 px-6 py-2 rounded-lg hover:bg-red-50 transition">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
