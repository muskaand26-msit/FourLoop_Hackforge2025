/**
 * Donation Slot Booking Test
 * 
 * This test verifies that the donation slot booking functionality works correctly.
 * It tests the following:
 * 1. Creating a donation slot
 * 2. Booking a donation slot
 * 3. Verifying that the booking count is incremented
 * 4. Cancelling a donation and verifying that the booking count is decremented
 * 5. Ensuring that booking beyond capacity is prevented
 */

// Test steps:
// 1. Hospital creates a donation slot with capacity 3
// 2. Donor books a slot -> booked_count should be 1
// 3. Another donor books a slot -> booked_count should be 2
// 4. Another donor books a slot -> booked_count should be 3
// 5. Try to book a 4th slot -> should receive capacity error
// 6. Hospital cancels one donation -> booked_count should be 2
// 7. Donor can now book again -> booked_count should be 3

// Database queries to check:
// - SELECT * FROM hospital_donation_slots WHERE id = [slot_id]
// - SELECT COUNT(*) FROM hospital_donations WHERE slot_id = [slot_id] AND status = 'scheduled'

// The above counts should match during each step of the process.

// Testing booked count calculation:
// 1. Run hospital dashboard
// 2. Create a slot with capacity 5
// 3. Book 3 donations
// 4. Verify the dashboard shows 3/5 (60%) booked
// 5. Cancel 1 donation
// 6. Verify the dashboard shows 2/5 (40%) booked

// This ensures the booking process is correctly integrated across:
// - Frontend UI
// - Backend database
// - Triggers and functions
// - Capacity management

/**
 * Manual test procedure:
 * 
 * 1. Login as a hospital user
 * 2. Go to the Hospital Dashboard
 * 3. Select the "Donation Slots" tab
 * 4. Create a new slot with capacity 5
 * 5. Note the slot ID from the database
 * 6. Login as a donor user
 * 7. Schedule a donation for that slot
 * 8. Check the database to see if booked_count is incremented
 * 9. Repeat with additional donors until capacity is reached
 * 10. Try booking one more and verify the error message
 * 11. As hospital, verify or cancel some donations
 * 12. Check if booked_count is decremented accordingly
 */ 