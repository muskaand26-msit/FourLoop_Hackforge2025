import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DonorForm } from '../components/DonorForm';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}));

describe('DonorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<DonorForm />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/blood type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<DonorForm />);

    fireEvent.click(screen.getByText(/register as donor/i));

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(7);
    });
  });

  it('validates date of birth for minimum age', async () => {
    render(<DonorForm />);

    const dateInput = screen.getByLabelText(/date of birth/i);
    const today = new Date();
    const underageDate = new Date(
      today.getFullYear() - 17,
      today.getMonth(),
      today.getDate()
    ).toISOString().split('T')[0];

    await userEvent.type(dateInput, underageDate);
    fireEvent.click(screen.getByText(/register as donor/i));

    await waitFor(() => {
      expect(screen.getByText(/must be at least 18 years old/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockUser = { id: 'test-user-id' };
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    render(<DonorForm />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'John');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
    await userEvent.type(
      screen.getByLabelText(/date of birth/i),
      '1990-01-01'
    );
    await userEvent.selectOptions(screen.getByLabelText(/blood type/i), 'A+');
    await userEvent.selectOptions(screen.getByLabelText(/gender/i), 'male');
    await userEvent.type(screen.getByLabelText(/phone/i), '+1234567890');
    await userEvent.type(screen.getByLabelText(/address/i), '123 Main St');

    fireEvent.click(screen.getByText(/register as donor/i));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('donors');
    });
  });
});