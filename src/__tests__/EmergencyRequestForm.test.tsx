import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EmergencyRequestForm } from '../components/EmergencyRequestForm';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn() }) }),
      select: vi.fn(),
    })),
  },
}));

describe('EmergencyRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<EmergencyRequestForm />);

    expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/blood type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/units required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hospital name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hospital address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact person/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<EmergencyRequestForm />);

    fireEvent.click(screen.getByText(/submit emergency request/i));

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(7);
    });
  });

  it('validates units required to be at least 1', async () => {
    render(<EmergencyRequestForm />);

    const unitsInput = screen.getByLabelText(/units required/i);
    await userEvent.type(unitsInput, '0');
    fireEvent.click(screen.getByText(/submit emergency request/i));

    await waitFor(() => {
      expect(screen.getByText(/must request at least 1 unit/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockRequest = {
      id: 'test-request-id',
      patient_name: 'John Doe',
      blood_type: 'A+',
      units_required: 2,
      hospital_name: 'General Hospital',
      hospital_address: '123 Hospital St',
      contact_person: 'Dr. Smith',
      contact_number: '+1234567890',
      notes: 'Urgent requirement',
    };

    vi.mocked(supabase.from).mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
      }),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'donor-1' }], error: null }),
    }));

    render(<EmergencyRequestForm />);

    await userEvent.type(screen.getByLabelText(/patient name/i), mockRequest.patient_name);
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), mockRequest.blood_type);
    await userEvent.type(
      screen.getByLabelText(/units required/i),
      mockRequest.units_required.toString()
    );
    await userEvent.type(screen.getByLabelText(/hospital name/i), mockRequest.hospital_name);
    await userEvent.type(
      screen.getByLabelText(/hospital address/i),
      mockRequest.hospital_address
    );
    await userEvent.type(screen.getByLabelText(/contact person/i), mockRequest.contact_person);
    await userEvent.type(screen.getByLabelText(/contact number/i), mockRequest.contact_number);
    await userEvent.type(screen.getByLabelText(/additional notes/i), mockRequest.notes);

    fireEvent.click(screen.getByText(/submit emergency request/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('emergency_requests');
    });
  });
});