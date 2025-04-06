import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { donorSchema, type DonorFormData } from '../lib/validation';
import { supabase } from '../lib/supabase';
import { FormField } from './FormField';
import { DatePicker } from './DatePicker';
import { getCurrentLocation } from '../lib/geolocation';
import { FileUpload } from './FileUpload';

const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const MEDICAL_CONDITIONS = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'heart_disease', label: 'Heart Disease' },
  { value: 'asthma', label: 'Asthma' },
  { value: 'none', label: 'None' },
];

interface DonorFormProps {
  userProfile: {
    id: string;
    full_name: string;
    blood_group: string;
    date_of_birth: string;
    contact_number: string;
  } | null;
}

export function DonorForm({ userProfile }: DonorFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DonorFormData>({
    resolver: zodResolver(donorSchema),
    defaultValues: userProfile
      ? {
          first_name: userProfile.full_name.split(' ')[0],
          last_name: userProfile.full_name.split(' ').slice(1).join(' '),
          date_of_birth: userProfile.date_of_birth,
          blood_type: userProfile.blood_group as DonorFormData['blood_type'],
          phone: userProfile.contact_number,
          gender: 'male', // Default value, user can change
          status: 'active',
          medical_conditions: [],
          address: '',
        }
      : undefined,
  });

  const [dateOfBirth, setDateOfBirth] = useState<string | null>(
    userProfile?.date_of_birth || null
  );
  const [lastDonationDate, setLastDonationDate] = useState<string | null>(null);

  // Add loading state for geolocation
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [hasLocationError, setHasLocationError] = useState(false);

  const [isBloodGroupUnknown, setIsBloodGroupUnknown] = useState(false);
  const [bloodGroupDocUrl, setBloodGroupDocUrl] = useState<string>('');
  const [bloodGroupDocPath, setBloodGroupDocPath] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  useEffect(() => {
    // Get user's current location
    setIsLocationLoading(true);
    setHasLocationError(false);
    
    getCurrentLocation()
      .then((position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
        setIsLocationLoading(false);
      })
      .catch((error) => {
        console.error('Error getting location:', error);
        setIsLocationLoading(false);
        setHasLocationError(true);
        toast.error('Unable to get your location. Your approximate location will be used.');
        
        // Set default values to prevent null errors (these will be overridden by IP geolocation on the server)
        setValue('latitude', 0);
        setValue('longitude', 0);
      });
  }, [setValue]);

  const onSubmit = async (data: DonorFormData) => {
    try {
      const { data: sessionData, error: authError } =
        await supabase.auth.getSession();

      if (authError || !sessionData.session?.user) {
        toast.error('Please sign in to register as a donor');
        return;
      }

      // Filter out 'none' from medical conditions
      const medicalConditions =
        data.medical_conditions?.filter((condition) => condition !== 'none') ||
        [];

      // Show a loading toast
      const loadingToast = toast.loading('Registering as a donor...');
      
      // Validate location data
      if (!data.latitude || !data.longitude) {
        data.latitude = 0;
        data.longitude = 0;
      }

      // Set blood group verification data
      data.is_blood_group_unknown = isBloodGroupUnknown;
      data.blood_group_document_url = bloodGroupDocUrl;
      data.blood_group_document_path = bloodGroupDocPath;

      // If blood group is unknown, mark it with a special value
      if (isBloodGroupUnknown) {
        data.is_blood_group_verified = false;
      }

      const { data: donorData, error: donorError } = await supabase.from('donors').insert({
        ...data,
        user_id: sessionData.session.user.id,
        medical_conditions: medicalConditions,
        status: 'active',
        is_available: true,
        response_rate: 100,
      }).select('id');

      // Dismiss the loading toast
      toast.dismiss(loadingToast);

      if (donorError) {
        console.error('Error registering donor:', donorError);
        toast.error('Failed to register as a donor. Please try again.');
        return;
      }

      toast.success('Successfully registered as a donor!');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error registering donor:', error);
      toast.error('Failed to register as a donor. Please try again.');
    }
  };

  const handleDateChange = (
    date: Date | null,
    field: 'date_of_birth' | 'last_donation_date'
  ) => {
    if (field === 'date_of_birth') {
      setDateOfBirth(date ? format(date, 'yyyy-MM-dd') : null);
    } else {
      setLastDonationDate(date ? format(date, 'yyyy-MM-dd') : null);
    }
    setValue(field, date ? format(date, 'yyyy-MM-dd') : null);
  };

  const handleFileUploadComplete = (filePath: string, fileUrl: string) => {
    setBloodGroupDocPath(filePath);
    setBloodGroupDocUrl(fileUrl);
    setValue('blood_group_document_path', filePath);
    setValue('blood_group_document_url', fileUrl);
    setFileUploadError(null);
  };

  const handleFileUploadError = (error: string) => {
    setFileUploadError(error);
    toast.error(error);
  };

  const toggleBloodGroupUnknown = () => {
    setIsBloodGroupUnknown(!isBloodGroupUnknown);
    if (!isBloodGroupUnknown) {
      // If user is now marking blood group as unknown, clear any uploaded document
      setBloodGroupDocPath('');
      setBloodGroupDocUrl('');
      setValue('blood_group_document_path', '');
      setValue('blood_group_document_url', '');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          name="first_name"
          register={register}
          error={errors.first_name}
          required
        />
        <FormField
          label="Last Name"
          name="last_name"
          register={register}
          error={errors.last_name}
          required
        />
        <DatePicker
          label="Date of Birth"
          value={dateOfBirth ? new Date(dateOfBirth) : null}
          onChange={(date) => handleDateChange(date, 'date_of_birth')}
          error={errors.date_of_birth?.message}
        />
        <div>
          <FormField
            label="Blood Type"
            name="blood_type"
            register={register}
            error={errors.blood_type}
            type="select"
            options={BLOOD_TYPES}
            required
          />

          {/* Blood group verification options */}
          <div className="mt-3 border-t pt-3 space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="unknown-blood-group"
                checked={isBloodGroupUnknown}
                onChange={toggleBloodGroupUnknown}
                className="rounded border-gray-300 text-red-500 focus:ring-red-500 mr-2"
              />
              <label htmlFor="unknown-blood-group" className="text-sm text-gray-700">
                I'm not sure about my blood type
              </label>
            </div>

            {!isBloodGroupUnknown && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700 mb-2">
                  Please upload your blood group certificate or test report for verification
                </p>
                <FileUpload
                  label="Blood Group Document"
                  onUploadComplete={handleFileUploadComplete}
                  onError={handleFileUploadError}
                  acceptedFileTypes="application/pdf,image/jpeg,image/png"
                  bucketName="documents"
                  storagePath="blood-group-documents"
                  existingFileUrl={bloodGroupDocUrl}
                />
              </div>
            )}
          </div>
        </div>
        <FormField
          label="Gender"
          name="gender"
          register={register}
          error={errors.gender}
          type="select"
          options={GENDERS}
          required
        />
        <FormField
          label="Phone Number"
          name="phone"
          register={register}
          error={errors.phone}
          type="tel"
          required
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Conditions
          </label>
          <div className="grid grid-cols-2 gap-4">
            {MEDICAL_CONDITIONS.map((condition) => (
              <label
                key={condition.value}
                className="flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  value={condition.value}
                  {...register('medical_conditions')}
                  className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-700">{condition.label}</span>
              </label>
            ))}
          </div>
        </div>
        <DatePicker
          label="Last Donation Date"
          value={lastDonationDate ? new Date(lastDonationDate) : null}
          onChange={(date) => handleDateChange(date, 'last_donation_date')}
          error={errors.last_donation_date?.message}
        />
      </div>

      {/* Location status indicator */}
      {isLocationLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700">
          <p className="text-sm">Getting your location...</p>
        </div>
      )}
      
      {hasLocationError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700">
          <p className="text-sm">Unable to get your precise location. Your approximate location will be used.</p>
        </div>
      )}

      {/* Hidden fields for location */}
      <input type="hidden" {...register('latitude')} />
      <input type="hidden" {...register('longitude')} />

      {/* Additional information about blood group verification */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
        <h4 className="font-medium mb-1">About Blood Group Verification:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Your blood group will be verified by our team using your uploaded document.</li>
          <li>If you're not sure about your blood type, select the checkbox above and we'll help you determine it.</li>
          <li>Verified blood groups ensure faster matching with patients in need.</li>
        </ul>
      </div>

      <div className="flex items-center space-x-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Registering...' : 'Register as Donor'}
          <Heart className="ml-2 h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
        >
          Reset Form
        </button>
      </div>
    </form>
  );
}
