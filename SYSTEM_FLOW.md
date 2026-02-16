# Complete System Flow

Login
  -> Search Room
  -> Capacity Check
  -> Feature Check
  -> Time Conflict Check
  -> Priority Comparison
  -> Override / Reject / Approve
  -> Save Booking
  -> Send WhatsApp (or SMS fallback)

Notes:
- Conflict check only considers same room, same date, approved bookings.
- Priority order: student < club < department < admin.
- Overrides are audit-logged with metadata in booking records.
