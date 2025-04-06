import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Phone, Mail, FileText, Globe, Clock, MapPin } from 'lucide-react';
import { bloodBankSchema, type BloodBankFormData } from '../lib/validation';
import { FormField } from './FormField';
import { FileUpload } from './FileUpload';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getCurrentLocation } from '../lib/geolocation';

interface BloodBankFormProps {
  onComplete?: () => void;
  userId: string;
}

export function BloodBankForm({ onComplete, userId }: BloodBankFormProps) {
  const [licenseDocUrl, setLicenseDocUrl] = useState<string>('');
  const [licenseDocPath, setLicenseDocPath] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BloodBankFormData>({
    resolver: zodResolver(bloodBankSchema),
  });

  useEffect(() => {
    // Get user's current location
    setIsLocationLoading(true);
    getCurrentLocation()
      .then((position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
        setIsLocationLoading(false);
      })
      .catch((error) => {
        console.error('Error getting location:', error);
        setIsLocationLoading(false);
        toast.error('Unable to get your location. Please enter it manually.');
      });
  }, [setValue]);

  const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
    setLicenseDocPath(filePath);
    setLicenseDocUrl(fileUrl);
    setValue('license_document_path', filePath);
    setValue('license_document_url', fileUrl);
    setFileUploadError(null);
  };

  const handleFileUploadError = (error: string) => {
    setFileUploadError(error);
    toast.error(error);
  };

  const onSubmit = async (data: BloodBankFormData) => {
    try {
      // Validate license document is uploaded
      if (!licenseDocUrl) {
        toast.error('Please upload your license document');
        return;
      }

      // Create blood bank profile
      const { error: bloodBankError, data: bloodBank } = await supabase
        .from('blood_banks')
        .insert({
          user_id: userId,
          name: data.name,
          address: data.address,
          contact_number: data.contact_number,
          email: data.email,
          license_number: data.license_number,
          license_document_url: licenseDocUrl,
          license_document_path: licenseDocPath,
          is_license_verified: false,
          phone: data.phone,
          website: data.website,
          operating_hours: data.operating_hours,
          latitude: data.latitude,
          longitude: data.longitude
        })
        .select()
        .single();

      if (bloodBankError) {
        if (bloodBankError.code === '23505') {
          toast.error('This blood bank is already registered');
        } else {
          throw bloodBankError;
        }
        return;
      }

      // Initialize inventory for all blood types
      const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const inventoryData = bloodTypes.map(type => ({
        blood_bank_id: bloodBank.id,
        blood_type: type,
        units_available: 0
      }));

      const { error: inventoryError } = await supabase
        .from('blood_inventory')
        .insert(inventoryData);

      if (inventoryError) throw inventoryError;

      toast.success('Blood bank registered successfully!');
      reset();
      onComplete?.();
    } catch (error) {
      console.error('Error registering blood bank:', error);
      toast.error('Failed to register blood bank. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Blood Bank Name"
          name="name"
          register={register}
          error={errors.name}
          required
        />
        <FormField
          label="License Number"
          name="license_number"
          register={register}
          error={errors.license_number}
          required
        />
        <FormField
          label="Contact Number"
          name="contact_number"
          register={register}
          error={errors.contact_number}
          type="tel"
          required
        />
        <FormField
          label="Phone"
          name="phone"
          register={register}
          error={errors.phone}
          type="tel"
          icon={<Phone className="h-5 w-5 text-gray-400" />}
        />
        <FormField
          label="Email"
          name="email"
          register={register}
          error={errors.email}
          type="email"
          required
        />
        <FormField
          label="Website"
          name="website"
          register={register}
          error={errors.website}
          type="url"
          icon={<Globe className="h-5 w-5 text-gray-400" />}
        />
        <FormField
          label="Operating Hours"
          name="operating_hours"
          register={register}
          error={errors.operating_hours}
          icon={<Clock className="h-5 w-5 text-gray-400" />}
          placeholder="e.g., Mon-Fri: 9AM-5PM, Sat: 9AM-1PM"
        />
        <div className="md:col-span-2">
          <FormField
            label="Address"
            name="address"
            register={register}
            error={errors.address}
            type="textarea"
            required
          />
        </div>
        
        {/* License Document Upload */}
        <div className="md:col-span-2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
            <h3 className="text-md font-medium text-gray-800 mb-2 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-red-500" />
              Upload License Document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please upload a copy of your blood bank's official license registered with government authorities.
              This helps us verify your blood bank and improves trust with donors.
            </p>
            <FileUpload
              label="License Document"
              onUploadComplete={handleFileUploadComplete}
              onError={handleFileUploadError}
              acceptedFileTypes="application/pdf,image/jpeg,image/png"
              bucketName="blood-bank-documents"
              storagePath="license-documents"
              existingFileUrl={licenseDocUrl}
              required={true}
              maxSizeMB={10}
            />
          </div>
        </div>

        {/* Location Status */}
        <div className="md:col-span-2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-md font-medium text-gray-800 mb-2 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-red-500" />
              Location
            </h3>
            {isLocationLoading ? (
              <p className="text-sm text-gray-600">Getting your location...</p>
            ) : (
              <p className="text-sm text-gray-600">
                Your location has been automatically captured. This helps donors find your blood bank easily.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Registering...' : 'Register Blood Bank'}
          <Building2 className="ml-2 h-5 w-5" />
        </button>
      </div>
    </form>
  );
}