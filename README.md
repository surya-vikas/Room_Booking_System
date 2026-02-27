# 🚀 SmartSpace
## 🏢 Priority-Based Intelligent Room Booking System

A full-stack role-based room booking platform designed for educational institutions with a structured priority hierarchy and intelligent conflict resolution mechanism.

---

## 📌 Overview

SmartSpace eliminates room booking conflicts in colleges and universities using a Priority-Based Access Model.

Higher-authority roles can override lower-priority bookings when necessary.

### 🎯 This ensures:
- Fair room allocation
- Administrative control
- Transparent conflict handling
- Structured booking lifecycle
- Scalable architecture

---

## 🧠 Role Hierarchy

```
Student  <  Club  <  Department  <  Admin
```

---

## 🔹 Role Capabilities

| Role        | Book | Cancel Own | Override Lower | View All |
|------------|------|------------|----------------|----------|
| Student    | ✅   | ✅         | ❌             | ❌       |
| Club       | ✅   | ✅         | ❌             | Limited  |
| Department | ✅   | ✅         | ✅             | ✅       |
| Admin      | ✅   | ✅         | ✅             | ✅       |

---

## ⚙️ Core Features

### ✅ Priority-Based Conflict Resolution
- Prevents double bookings
- Compares user roles before confirming reservation
- Enforces structured authority

### ✅ Override Mechanism
- Higher-priority users can override lower bookings
- Automatically updates booking status
- Maintains audit trail

### ✅ Structured Booking Lifecycle

```
Requested → Confirmed → Overridden / Cancelled → Archived
```

### ✅ Role-Based Dashboards
- Personalized UI per role
- Booking management tools
- Status tracking

### ✅ Secure Authentication
- JWT-based authentication
- Role-based route protection
- Password hashing using secure standards

### ✅ Optional Notification System
- Booking confirmations
- Override alerts
- Cancellation updates
- WhatsApp integration via Twilio API

---

## 🛠️ Tech Stack

### 🌐 Frontend
- React
- Tailwind CSS
- Axios
- React Router

### 🔙 Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose

### 🔐 Security
- JWT Authentication
- Role-Based Access Control (RBAC)

---

## 🏗️ System Architecture

```
React Frontend
        ↓
Express API Server
        ↓
MongoDB Database
        ↓
Notification Service (Optional)
```

The architecture follows a clean separation of concerns, making it scalable and production-ready.

---

## 🗂️ Project Structure

```
smartspace/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── index.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── pages/
│
└── README.md
```

---

## 🔄 Conflict Resolution Logic

When a booking request is made:

1. Check slot availability.
2. If conflict exists:
   - Compare role priority.
   - If requester has higher authority → Override existing booking.
   - If lower authority → Reject request.
3. Update booking status accordingly.
4. Trigger notification (if enabled).

This ensures a deterministic and rule-based conflict handling system.

---

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/smartspace.git
cd smartspace
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
TWILIO_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

Start the server:

```bash
node index.js
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📈 Why This Project Stands Out

- Real-world problem solving
- Authority-based system design
- Role-Based Access Control implementation
- Conflict resolution algorithm
- Scalable backend structure
- Hackathon-ready full-stack implementation

---

## 🔮 Future Enhancements

- Google Calendar Integration
- Email Notification System
- Booking Approval Workflow
- Analytics Dashboard
- QR-Based Room Check-In
- Cloud Deployment Optimization
