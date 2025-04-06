import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { AIChatbot } from './components/AIChatbot';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { HowItWorks } from './pages/HowItWorks';
import { FindDonors } from './pages/FindDonors';
import { Emergency } from './pages/Emergency';
import { EmergencyRequests } from './pages/EmergencyRequests';
import { DonationCamps } from './pages/DonationCamps';
import { SignIn } from './pages/SignIn';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { BloodBankDashboard } from './pages/BloodBankDashboard';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { BloodBankList } from './pages/BloodBankList';
import { BloodBankRequest } from './pages/BloodBankRequest';
import { FAQs } from './pages/FAQs';
import { Blog } from './pages/Blog';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import ScheduleDonation from './pages/ScheduleDonation';
import { CommunityChat } from './pages/CommunityChat';
import { BecomeDonor } from './pages/BecomeDonor';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Layout component that includes Navigation
function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-red-50 to-white">
      <Navigation />
      <div className="flex-grow">
        <Outlet />
      </div>
      <Footer />
      <AIChatbot />
      <Toaster position="top-right" />
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorFallback error={new Error('Page not found')} />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'how-it-works', element: <HowItWorks /> },
      { path: 'find-donors', element: <FindDonors /> },
      { path: 'emergency', element: <Emergency /> },
      { path: 'emergency-requests', element: <EmergencyRequests /> },
      { path: 'donation-camps', element: <DonationCamps /> },
      { path: 'signin', element: <SignIn /> },
      { path: 'register', element: <Register /> },
      { path: 'become-donor', element: <BecomeDonor /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'blood-bank-dashboard', element: <BloodBankDashboard /> },
      { path: 'hospital-dashboard', element: <HospitalDashboard /> },
      { path: 'blood-banks', element: <BloodBankList /> },
      { path: 'blood-bank-list', element: <BloodBankList /> },
      { path: 'blood-bank-request', element: <BloodBankRequest /> },
      { path: 'faqs', element: <FAQs /> },
      { path: 'blog', element: <Blog /> },
      { path: 'privacy-policy', element: <PrivacyPolicy /> },
      { path: 'schedule-donation', element: <ScheduleDonation /> },
      { path: 'community-chat', element: <CommunityChat /> },
      { path: '*', element: <ErrorFallback error={new Error('Page not found')} /> },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;