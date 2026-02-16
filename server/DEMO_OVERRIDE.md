# SmartSpace Hackathon Demo - Override Simulation

## One-time prep
1. Start API server:
   - `cd smartspace/server`
   - `npm run dev`
2. In a second terminal, seed demo users and room:
   - `npm run seed:demo`

## Live demo run (scripted)
- `npm run demo:override`

This executes:
1. Student login -> books `10:00-12:00`
2. Department login -> books same slot
3. Prints final DB state proving:
   - student booking is `cancelled`
   - department booking is `approved`
   - override reason is stored

If Twilio env vars are configured, WhatsApp notifications are triggered for approval/cancellation/override.

## Manual UI demo flow
1. Login as `student.demo@smartspace.dev` with `Demo@123`
2. Search room/date and book `10:00-12:00`
3. Logout and login as `department.demo@smartspace.dev` with `Demo@123`
4. Book same room and slot
5. Show booking statuses and override trail

## Judge explanation (talk track)
- **Priority engine:** Every conflict checks overlap + role priority before finalizing booking.
- **Fair scheduling:** Higher-priority roles can override lower-priority slots only when rules allow.
- **Automated conflict resolution:** The system auto-cancels impacted bookings, stores override metadata, and sends WhatsApp notifications.
