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
