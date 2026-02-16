**SmartSpace**
Priority-Based Intelligent Room Booking System

SmartSpace is a role-based room booking platform designed for educational institutions to efficiently manage classrooms, laboratories, and seminar halls.

The system introduces a structured priority hierarchy model, allowing higher authorities to override bookings made by lower-priority users when necessary. This ensures fair usage while maintaining administrative control.

Overview

In many institutions, room booking conflicts arise due to overlapping requests from students, clubs, and departments. Traditional systems lack structured conflict resolution and authority-based control.

SmartSpace addresses this by implementing:

Role-Based Access Control (RBAC)

Priority-Based Conflict Resolution

Override Mechanism for Higher Authorities

Real-Time Booking Status Management

Optional WhatsApp Notification Integration

Role Hierarchy

The system operates on the following priority order:

Student < Club < Department < Admin

Higher roles can override bookings made by lower roles.

Key Features
1. Priority-Based Booking

Prevents double-booking conflicts.

Automatically checks slot availability.

Enforces role hierarchy during conflicts.

2. Override Mechanism

Departments and Admins can override existing lower-priority bookings.

The overridden booking is automatically marked as "Cancelled" or "Overridden".

The affected user receives a notification.

3. Booking Lifecycle Management

Each booking progresses through structured states:

Requested → Confirmed → Overridden / Cancelled → Archived
4. Role-Based Dashboards

Student dashboard (View & manage own bookings)

Club dashboard (Manage club bookings)

Department dashboard (Override capability)

Admin dashboard (Full control)

5. Notification System (Optional)

Booking confirmation alerts

Override notifications

Cancellation updates

Integrated using Twilio API

Tech Stack
Frontend

React

Tailwind CSS

Axios

React Router

Backend

Node.js

Express.js

MongoDB Atlas

Mongoose

Additional Integration

Twilio API (WhatsApp Notifications)

JWT Authentication

System Architecture
Client (React Frontend)
        ↓
Express API Server
        ↓
MongoDB Database
        ↓
Notification Service (Twilio)
Database Design
User Model

Name

Email

Password (Hashed)

Role (student | club | department | admin)

Room Model

Room Name

Capacity

Room Type (Classroom | Lab | Seminar Hall)

Booking Model

Room Reference

User Reference

Date

Start Time

End Time

Status (confirmed | cancelled | overridden)

Conflict Resolution Logic

When a booking request is made:

Check if the time slot is available.

If unavailable:

Compare the role priority of the requester with the existing booking.

If higher → Override existing booking.

If lower → Reject request.

Save booking with updated status.

Trigger notification (if enabled).

Installation & Setup
Clone Repository
git clone https://github.com/your-username/smartspace.git
cd smartspace
Backend Setup
cd backend
npm install

Create .env file:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TWILIO_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

Start server:

node index.js
Frontend Setup
cd frontend
npm install
npm run dev
Scalability Considerations

Modular backend structure

Clean separation of routes, controllers, and models

Stateless JWT authentication

Easily extendable role hierarchy

Ready for cloud deployment (Netlify + Render / Railway)

Future Enhancements

Google Calendar integration

Email notifications

Booking approval workflow

Analytics dashboard

QR-based check-in system

Use Case

SmartSpace can be implemented in:

Engineering Colleges

Universities

Training Institutes

Corporate Meeting Room Management Systems

Author

Surya Vikas && Nagamani
Full Stack Developer's
