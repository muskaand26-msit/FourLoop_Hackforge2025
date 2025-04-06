import { z } from 'zod';
import { isValid, parse, differenceInDays } from 'date-fns';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const GENDERS = ['male', 'female', 'other'] as const;
const REQUEST_STATUS = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
const URGENCY_LEVELS = ['normal', 'urgent', 'critical'] as const;
const DONOR_STATUS = ['active', 'inactive', 'blocked'] as const;

export const donorSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  date_of_birth: z.string().refine((date) => {
    if (!date) return false;
    const parsed = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) return false;
    const age = new Date().getFullYear() - parsed.getFullYear();
    return age >= 18;
  }, 'You must be at least 18 years old'),
  blood_type: z.enum(BLOOD_TYPES, {
    errorMap: () => ({ message: 'Please select a valid blood type' }),
  }),
  gender: z.enum(GENDERS, {
    errorMap: () => ({ message: 'Please select a valid gender' }),
  }),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  address: z.string().min(5, 'Please enter a valid address'),
  medical_conditions: z.array(z.string()).optional(),
  last_donation_date: z.string().nullable().optional(),
  is_available: z.boolean().default(true),
  status: z.enum(DONOR_STATUS).default('active'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  response_rate: z.number().min(0).max(100).default(100),
  blood_group_document_url: z.string().optional(),
  blood_group_document_path: z.string().optional(),
  is_blood_group_verified: z.boolean().default(false).optional(),
  blood_group_verified_at: z.string().nullable().optional(),
  is_blood_group_unknown: z.boolean().default(false).optional(),
});

export const emergencyRequestSchema = z.object({
  patient_name: z.string().min(2, 'Patient name must be at least 2 characters'),
  blood_type: z.enum(BLOOD_TYPES, {
    errorMap: () => ({ message: 'Please select a valid blood type' }),
  }),
  units_required: z.coerce.number().min(1, 'Must request at least 1 unit'),
  hospital_name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  hospital_address: z.string().min(5, 'Please enter a valid hospital address'),
  contact_person: z.string().min(2, 'Contact person name must be at least 2 characters'),
  contact_number: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  notes: z.string().optional(),
  urgency_level: z.enum(URGENCY_LEVELS).default('normal'),
  status: z.enum(REQUEST_STATUS).default('pending'),
});

export const contactDonorSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name must be at least 2 characters'),
  contact_number: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  hospital_name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  units_required: z.coerce.number().min(1, 'Must request at least 1 unit'),
  urgency_level: z.enum(URGENCY_LEVELS).default('normal'),
  message: z.string().optional(),
});

export const bloodBankSchema = z.object({
  name: z.string().min(2, 'Blood bank name must be at least 2 characters'),
  address: z.string().min(5, 'Please enter a valid address'),
  contact_number: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email address'),
  license_number: z.string().min(3, 'Please enter a valid license number'),
  license_document_url: z.string().optional(),
  license_document_path: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number').optional(),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  operating_hours: z.string().min(1, 'Please enter operating hours').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const inventoryUpdateSchema = z.object({
  'A+': z.coerce.number().min(0, 'Units cannot be negative'),
  'A-': z.coerce.number().min(0, 'Units cannot be negative'),
  'B+': z.coerce.number().min(0, 'Units cannot be negative'),
  'B-': z.coerce.number().min(0, 'Units cannot be negative'),
  'AB+': z.coerce.number().min(0, 'Units cannot be negative'),
  'AB-': z.coerce.number().min(0, 'Units cannot be negative'),
  'O+': z.coerce.number().min(0, 'Units cannot be negative'),
  'O-': z.coerce.number().min(0, 'Units cannot be negative'),
});

export const hospitalSchema = z.object({
  name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  address: z.string().min(5, 'Please enter a valid address'),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'),
  email: z.string().email('Please enter a valid email address'),
  registration_number: z.string().min(3, 'Please enter a valid registration number'),
  license_document_url: z.string().optional(),
  license_document_path: z.string().optional(),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  operating_hours: z.string().min(1, 'Please enter operating hours').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type DonorFormData = z.infer<typeof donorSchema>;
export type EmergencyRequestFormData = z.infer<typeof emergencyRequestSchema>;
export type ContactDonorFormData = z.infer<typeof contactDonorSchema>;
export type BloodBankFormData = z.infer<typeof bloodBankSchema>;
export type InventoryUpdateData = z.infer<typeof inventoryUpdateSchema>;
export type HospitalFormData = z.infer<typeof hospitalSchema>;

export const isEligibleDonor = (donor: DonorFormData): boolean => {
  if (!donor.last_donation_date) return true;
  
  const lastDonation = new Date(donor.last_donation_date);
  const daysSinceLastDonation = differenceInDays(new Date(), lastDonation);
  
  return (
    daysSinceLastDonation >= 90 &&
    donor.status === 'active' &&
    donor.is_available
  );
};

export const getCompatibleBloodTypes = (bloodType: string): string[] => {
  const compatibility: { [key: string]: string[] } = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'],
  };

  return compatibility[bloodType] || [];
};