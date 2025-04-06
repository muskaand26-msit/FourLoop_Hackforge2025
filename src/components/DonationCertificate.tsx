import React from 'react';
import { Award, Download } from 'lucide-react';
import { format } from 'date-fns';

interface DonationCertificateProps {
  certificateNumber: string;
  donorName: string;
  bloodType: string;
  donationDate: string;
  hospitalName: string;
  unitsConfirmed: number;
}

export function DonationCertificate({
  certificateNumber,
  donorName,
  bloodType,
  donationDate,
  hospitalName,
  unitsConfirmed,
}: DonationCertificateProps) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-red-200">
      <div className="text-center mb-8">
        <Award className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900">Certificate of Blood Donation</h2>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">This certifies that</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{donorName}</p>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-600">
            has donated {unitsConfirmed} unit(s) of {bloodType} blood on
          </p>
          <p className="text-xl font-semibold text-gray-900 mt-2">
            {format(new Date(donationDate), 'PPPP')}
          </p>
          <p className="text-lg text-gray-600 mt-2">at</p>
          <p className="text-xl font-semibold text-gray-900 mt-2">{hospitalName}</p>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Certificate No: {certificateNumber}</span>
            <button className="flex items-center text-red-500 hover:text-red-600">
              <Download className="h-4 w-4 mr-1" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}