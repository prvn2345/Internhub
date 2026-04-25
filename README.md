# InternHub — MERN Internship & Job Portal

A full-stack internship and job portal similar to Internshala, built with the MERN stack.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |
| Email | Nodemailer |
| File Storage | Cloudinary |
| State Management | Zustand |
| i18n | react-i18next |

## Features

- **3 User Roles**: Student, Employer, Admin
- **6 Languages**: English, Spanish, Hindi, Portuguese, Chinese, French
- **French OTP Security**: Switching to French requires email OTP verification
- **Job/Internship Portal**: Post, search, filter, apply
- **Application Tracking**: Full status pipeline (pending → hired)
- **Resume Upload**: Via Cloudinary
- **Dark Mode**: System-wide toggle
- **Responsive UI**: Mobile + Desktop

## Project Structure

```
├── backend/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── utils/           # Helpers (email, cloudinary, token)
│   └── server.js
│
└── frontend/
    ├── public/
    └── src/
        ├── api/         # Axios instance
        ├── components/  # Reusable UI components
        ├── i18n/        # Translations (6 languages)
        ├── pages/       # Route pages
        └── store/       # Zustand stores
```

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account
- Gmail account (for Nodemailer)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### Environment Variables

**Backend `.env`:**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/internhub
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:3000
```

**Frontend `.env`:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (with filters) |
| GET | `/api/jobs/featured` | Featured jobs |
| GET | `/api/jobs/:id` | Job detail |
| POST | `/api/jobs` | Create job (employer) |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/applications/:jobId` | Apply for job |
| GET | `/api/applications/my-applications` | Student's applications |
| GET | `/api/applications/job/:jobId` | Job applicants (employer) |
| PUT | `/api/applications/:id/status` | Update status |

### OTP (French Language)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/otp/send` | Send OTP to email |
| POST | `/api/otp/verify` | Verify OTP + update language |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | All users |
| PUT | `/api/admin/users/:id/toggle-status` | Activate/deactivate |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/jobs` | All jobs |
| PUT | `/api/admin/jobs/:id/status` | Update job status |

## French Language OTP Flow

1. User selects French from language switcher
2. Must be logged in (otherwise shows error)
3. Backend sends 6-digit OTP to user's email via Nodemailer
4. OTP modal appears with 6 individual digit inputs
5. User enters OTP within 10 minutes
6. Backend verifies OTP, updates `languagePreference` in MongoDB
7. Frontend switches to French via i18next
8. If OTP is wrong → error shown, language NOT changed

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT authentication on protected routes
- OTP expires after 10 minutes (MongoDB TTL index)
- Input validation with express-validator
- Role-based access control (student/employer/admin)
- CORS configured for frontend origin only
