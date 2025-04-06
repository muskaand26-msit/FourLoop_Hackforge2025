# LifeLink - Blood Donation Management System

LifeLink is a comprehensive blood donation management system that connects donors, hospitals, and blood banks to facilitate blood donation and improve the efficiency of the blood supply chain.

## Application Architecture

### Technologies Used
- **Frontend**: React, TypeScript, TailwindCSS, Chakra UI, Framer Motion
- **Backend**: Supabase (PostgreSQL, Functions, RLS Policies)
- **Maps/Location**: OLA Maps API
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vite build system

### Key Features
- User registration and authentication (Donors, Blood Banks, Hospitals)
- Real-time location tracking for finding nearby donors
- Blood donation scheduling system
- Blood bank inventory management
- Emergency blood requests and notifications
- Hospital donation verification
- Donor reward system and achievements
- Community chat for donors and recipients
- Dashboard for each user type

### Database Schema
The application uses a PostgreSQL database with the following main tables:
- `auth.users` - Core user information
- `donors` - Donor profiles and details
- `blood_banks` - Blood bank information
- `hospitals` - Hospital information
- `blood_inventory` - Blood bank inventory tracking
- `realtime_locations` - Real-time location data
- `emergency_requests` - Emergency blood requests
- `donor_responses` - Responses to emergency requests
- `scheduled_donations` - Scheduled donation appointments
- `hospital_donations` - Donations made at hospitals
- `notifications` - System notifications
- `hospital_donation_slots` - Available slots for donations at hospitals
- `blood_bank_slots` - Available slots for donations at blood banks
- `community_chat` - Community messaging system

## Fixes Implemented

### Database Schema Fixes
1. **Foreign Key Relationships**: Added proper foreign key relationships between auth.users and profile tables (donors, blood_banks, hospitals)
2. **Slot Booking**: Fixed the slot booking system to work correctly across blood banks and hospitals
3. **Scheduled Donations**: Unified the donation scheduling system with a composite_id for unique identification
4. **Day of Week Handling**: Standardized the day_of_week column for consistent slot scheduling
5. **RLS Policies**: Fixed Row Level Security policies to ensure proper data access

### Component Fixes
1. **DonationSlotSelector**: Updated to handle the improved database schema with proper slot selection
2. **DonationFacilityList**: Optimized facility searching with direct day_of_week querying
3. **Slot Availability**: Improved the algorithm to detect and display available slots

## Recent Fixes

### Donation Scheduling Issues
- **Missing `scheduled_time` Column Issue**: Added the `scheduled_time` column to both `hospital_donations` and `scheduled_donations` tables to store the exact time of scheduled donations.
- **Scheduler Error Handling**: Improved error handling in the `schedule_donation` function to provide more user-friendly messages when a donor tries to schedule multiple donations at the same time.
- **Dashboard Time Display**: Fixed the time display in the donor dashboard to correctly show the scheduled time instead of defaulting to 5:30 AM for all appointments.
- **Data Type Consistency**: Made types consistent across the application and ensured compatibility with the database schema.
- **Rescheduling Functionality**: Enhanced the donation rescheduling process to properly cancel the old appointment before creating a new one.

### Hospital Dashboard Issues
- **Blood Group Verification Workflow**: Fixed UI issues related to blood test workflows on the hospital dashboard, including hiding the "Add Blood Test" button after verification and properly tracking blood test status in the database.

### Database Migration Issues
- **Foreign Key Constraints**: Fixed issues with slot deletion by properly handling foreign key constraints and creating a safe deletion function.
- **Added `needs_blood_test` Column**: Added a flag to indicate when a donor needs a blood test as part of the donation verification process.
- **Composite ID Handling**: Improved handling of composite IDs in the database to prevent errors and ensure uniqueness.

### Emergency Request Issues
- **Missing `recipient_type` Column**: Added the column to the notifications table and implemented fallback handling in relevant components.
- **UI Issues**: Resolved errors related to donation offers and improved user feedback with loading states and UI updates.

### Scheduling and Emergency Request Fixes

1. **Missing `recipient_type` Column Issue**
   - Created a migration file (`supabase/migrations/20250510000000_fix_scheduler_column_issue.sql`) to add the missing `recipient_type` column to the `notifications` table
   - Added fallback handling in both `SchedulerForm.tsx` and `DonationSchedulerModal.tsx` to work even if the column doesn't exist
   - The migration also includes a trigger to automatically create notifications when new donation schedules are created

2. **Emergency Request UI Issues**
   - Fixed the "request no longer available" error when accepting a donation offer by properly checking the request status
   - Updated the `handleDecline` function in `DonationOfferModal.tsx` to properly update the UI when declining an offer
   - Added loading states to both Accept and Decline buttons to provide better user feedback
   - Added a small delay before page reload to ensure database operations complete and UI updates correctly

3. **Hospital Donation Verification Fix**
   - Fixed the "column reference achievements is ambiguous" error that occurred when verifying donations
   - Created a migration file (`supabase/migrations/20250525000000_fix_verify_hospital_donation_function.sql`) that completely rewrites the `verify_hospital_donation` function
   - The new function uses proper variable scoping and explicit table aliases to avoid any column ambiguity issues
   - Also ensured the function parameters match exactly what the frontend expects to prevent parameter mismatch errors

4. **Blood Group Verification Workflow Improvements**
   - Fixed UI issue where "Add Blood Test" button was still showing after verification
   - Enhanced the Blood Group Verification tab to properly display donors who need blood group verification
   - Added database support for tracking whether a donor needs blood group verification with new `needs_blood_test` columns
   - Created a migration file (`supabase/migrations/20250530000000_add_needs_blood_test_column.sql`) to add and manage these columns
   - Added a database trigger to automatically flag donors who are unsure of their blood type during registration
   - Implemented a dedicated blood test verification workflow in the hospital dashboard

5. **Hospital Dashboard Verification Issue Fix**
   - Fixed the issue where the "Add Blood Test" button was incorrectly appearing after verifying a donation
   - Updated the `verifyDonation` function to properly set the `needs_blood_test` flag based on the donor's blood type
   - Created a new migration file (`supabase/migrations/20250531000000_update_hospital_functions.sql`) to update the `get_hospital_scheduled_donations` function
   - The function now returns the `needs_blood_test` field and properly calculates its value for completed donations
   - Added conditional rendering in the UI to only show the "Add Blood Test" button when a donation truly needs it

6. **Donation Slot Booking and Capacity Management Fix**
   - Fixed the issue where the donation slot booking count was not being updated correctly
   - Added database triggers to automatically update the `booked_count` when donations are scheduled or cancelled
   - Added capacity checks to prevent booking beyond a slot's capacity limit
   - Updated the hospital dashboard to display available slots and a progress bar visualization
   - Created a migration file (`supabase/migrations/20250602000000_fix_donation_slot_booking.sql`) to implement these improvements
   - Added a data cleanup routine that recalculates all slot booking counts based on actual scheduled donations

7. **Donation Scheduling and Slot Selection Fix**
   - Fixed the parameter ordering in the `get_available_slots` function to correctly accept `(p_date, p_facility_id, p_facility_type)`
   - Created a new `schedule_donation` function that correctly handles slot booking and capacity checks
   - Added the missing `composite_id` column to the `scheduled_donations` table
   - Created a new `SchedulerConfirmation` component that simplifies the confirmation flow
   - Fixed the fallback slot fetching logic to work correctly with hospital and blood bank slots
   - Created a migration file (`supabase/migrations/20250605000000_fix_slot_booking_functions.sql`) to implement these improvements
   - Added a new `get_slots_for_date`