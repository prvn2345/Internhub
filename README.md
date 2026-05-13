# CareerBridge (Internhub)

CareerBridge is a full-stack MERN (MongoDB, Express.js, React, Node.js) platform designed to seamlessly connect students with potential employers. It provides a secure, centralized hub for job discovery, applicant tracking, and professional resume generation.

## 🚀 Key Features

- **Student Portal**: Create detailed profiles, automatically generate ATS-friendly PDF resumes, discover internships/jobs, and track application statuses in real-time.
- **Employer Portal**: Post new job opportunities, manage active listings, and review incoming candidate applications with built-in status tracking (Shortlisted, Hired, Rejected).
- **Admin Dashboard**: Oversee platform telemetry, manage user accounts (students and employers), and monitor all active job listings across the platform.
- **Secure Authentication**: Role-based access control (Student, Employer, Admin) with JWT authentication and secure OTP-based email verification.

## 💻 Technology Stack

- **Frontend**: React.js, Tailwind CSS, Zustand (State Management)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Atlas) & Mongoose
- **Integrations**: Razorpay (Payments), Brevo (Email APIs), Cloudinary (Image Hosting)

## 🛠️ Getting Started

### Prerequisites
- Node.js installed on your machine
- A MongoDB Atlas Account

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/prvn2345/Internhub.git
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Variables:**
   Create a `.env` file inside the `backend` directory and configure your essential keys:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - `BREVO_API_KEY`

5. **Run the Application:**
   Open two terminals:
   - **Terminal 1 (Backend):** `cd backend && npm run dev`
   - **Terminal 2 (Frontend):** `cd frontend && npm run dev`
