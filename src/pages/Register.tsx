import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Building2, Stethoscope } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { BloodBankForm } from '../components/BloodBankForm';
import { HospitalForm } from '../components/HospitalForm';

const BLOOD_GROUPS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

// Base schema for common fields
const baseSchema = {
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^a-zA-Z0-9]/,
      'Password must contain at least one special character'
    ),
  confirmPassword: z.string(),
};

// Regular user schema with additional fields
const userSchema = z
  .object({
    ...baseSchema,
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    date_of_birth: z.string().refine((date) => {
      if (!date) return false;
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18;
    }, 'You must be at least 18 years old'),
    blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
      errorMap: () => ({ message: 'Please select a valid blood group' }),
    }),
    contact_number: z
      .string()
      .regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Blood bank schema with only base fields
const bloodBankSchema = z
  .object({
    ...baseSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Add hospital schema with only base fields
const hospitalSchema = z
  .object({
    ...baseSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type UserFormData = z.infer<typeof userSchema>;
type BloodBankFormData = z.infer<typeof bloodBankSchema>;
type HospitalFormData = z.infer<typeof hospitalSchema>;

function UserRegistrationForm({
  onSubmit,
}: {
  onSubmit: (data: UserFormData) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-gray-700"
        >
          Full Name
        </label>
        <input
          {...register('full_name')}
          type="text"
          className={`mt-1 block w-full rounded-md ${
            errors.full_name ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.full_name?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.full_name.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="date_of_birth"
          className="block text-sm font-medium text-gray-700"
        >
          Date of Birth
        </label>
        <input
          {...register('date_of_birth')}
          type="date"
          className={`mt-1 block w-full rounded-md ${
            errors.date_of_birth ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.date_of_birth?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.date_of_birth.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="blood_group"
          className="block text-sm font-medium text-gray-700"
        >
          Blood Group
        </label>
        <select
          {...register('blood_group')}
          className={`mt-1 block w-full rounded-md ${
            errors.blood_group ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        >
          <option value="">Select Blood Group</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group.value} value={group.value}>
              {group.label}
            </option>
          ))}
        </select>
        {errors.blood_group?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.blood_group.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact_number"
          className="block text-sm font-medium text-gray-700"
        >
          Contact Number
        </label>
        <input
          {...register('contact_number')}
          type="tel"
          className={`mt-1 block w-full rounded-md ${
            errors.contact_number ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.contact_number?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.contact_number.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          {...register('email')}
          type="email"
          className={`mt-1 block w-full rounded-md ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.email?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.email.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.password?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.password.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.confirmPassword?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.confirmPassword.message)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating account...' : 'Continue'}
      </button>
    </form>
  );
}

function BloodBankRegistrationForm({
  onSubmit,
}: {
  onSubmit: (data: BloodBankFormData) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BloodBankFormData>({
    resolver: zodResolver(bloodBankSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          {...register('email')}
          type="email"
          className={`mt-1 block w-full rounded-md ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.email?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.email.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.password?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.password.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.confirmPassword?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.confirmPassword.message)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating account...' : 'Continue'}
      </button>
    </form>
  );
}

// Hospital registration form component
function HospitalRegistrationForm({
  onSubmit,
}: {
  onSubmit: (data: HospitalFormData) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          {...register('email')}
          type="email"
          className={`mt-1 block w-full rounded-md ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.email?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.email.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.password?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.password.message)}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          className={`mt-1 block w-full rounded-md ${
            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
          } shadow-sm focus:border-red-500 focus:ring-red-500`}
        />
        {errors.confirmPassword?.message && (
          <p className="mt-1 text-sm text-red-500">
            {String(errors.confirmPassword.message)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating account...' : 'Continue'}
      </button>
    </form>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [registrationType, setRegistrationType] = useState<
    'user' | 'blood_bank' | 'hospital'
  >('user');
  const [showBloodBankForm, setShowBloodBankForm] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleSubmit = async (data: UserFormData | BloodBankFormData | HospitalFormData) => {
    try {
      // Step 1: Create the auth user with minimal data
      const signUpData = {
        email: data.email,
        password: data.password,
        options: {
          data: {
            user_type: registrationType,
          },
        },
      };

      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        signUpData
      );

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user returned');
      }

      // Step 2: For regular users, create their profile
      if (registrationType === 'user') {
        const userData = data as UserFormData;

        try {
          // First try using the secure function
          const { data: profileData, error: fnError } = await supabase.rpc(
            'create_user_profile',
            {
              p_user_id: authData.user.id,
              p_full_name: userData.full_name,
              p_blood_group: userData.blood_group,
              p_date_of_birth: userData.date_of_birth,
              p_contact_number: userData.contact_number
            }
          );

          if (fnError) {
            console.error('Profile creation function error:', fnError);
            
            // Fall back to direct insert if the function fails
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: authData.user.id,
                full_name: userData.full_name,
                blood_group: userData.blood_group,
                date_of_birth: userData.date_of_birth,
                contact_number: userData.contact_number,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              // If profile creation fails, we should clean up the auth user
              await supabase.auth.signOut();
              throw profileError;
            }
          }
        } catch (profileError) {
          console.error('Profile creation error:', profileError);
          // If profile creation fails, we should clean up the auth user
          await supabase.auth.signOut();
          throw profileError;
        }
      }

      setUserId(authData.user.id);

      if (registrationType === 'blood_bank') {
        setShowBloodBankForm(true);
      } else if (registrationType === 'hospital') {
        setShowHospitalForm(true);
      } else {
        toast.success(
          'Registration successful! Please check your email to verify your account.'
        );
        navigate('/signin');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register. Please try again.');
    }
  };

  const onBloodBankFormComplete = () => {
    navigate('/blood-bank-dashboard');
  };

  const onHospitalFormComplete = () => {
    navigate('/hospital-dashboard');
  };

  if (showBloodBankForm && userId) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Building2 className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">
              Complete Blood Bank Registration
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Please provide your blood bank facility details
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8">
            <BloodBankForm
              onComplete={onBloodBankFormComplete}
              userId={userId}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showHospitalForm && userId) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Stethoscope className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">
              Complete Hospital Registration
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Please provide your hospital facility details
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8">
            <HospitalForm
              onComplete={onHospitalFormComplete}
              userId={userId}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Toaster position="top-right" />
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            Create Your Account
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Join our community of life-savers
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRegistrationType('user')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                registrationType === 'user'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className="h-5 w-5 mx-auto mb-2" />
              Regular User
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType('hospital')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                registrationType === 'hospital'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Stethoscope className="h-5 w-5 mx-auto mb-2" />
              Hospital
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType('blood_bank')}
              className={`flex-1 py-2 px-3 rounded-lg ${
                registrationType === 'blood_bank'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Building2 className="h-5 w-5 mx-auto mb-2" />
              Blood Bank
            </button>
          </div>

          {registrationType === 'user' ? (
            <UserRegistrationForm onSubmit={handleSubmit} />
          ) : registrationType === 'hospital' ? (
            <HospitalRegistrationForm onSubmit={handleSubmit} />
          ) : (
            <BloodBankRegistrationForm onSubmit={handleSubmit} />
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              By registering, you agree to our{' '}
              <Link to="/terms" className="text-red-500 hover:text-red-600">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-red-500 hover:text-red-600">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/signin" className="text-red-500 hover:text-red-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
