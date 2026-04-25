# CareerBridge — Career Opportunities Platform

A full-stack career portal for internships and jobs, built from scratch using the MERN stack. Designed to connect students and professionals with employers across multiple industries.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18 + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose ODM |
| Authentication | JWT (JSON Web Tokens) + bcryptjs |
| Email Delivery | Nodemailer (Gmail SMTP) |
| File Storage | Cloudinary |
| State Management | Zustand (with persistence) |
| Internationalisation | react-i18next (6 languages) |

## Core Features

- **Three account roles** — Candidate, Recruiter, Platform Admin
- **Six interface languages** — English, Spanish, Hindi, Portuguese, Chinese, French
- **French language security gate** — switching to French triggers email OTP verification
- **Opportunity listings** — post, search, filter, and apply for jobs and internships
- **Application pipeline** — full status tracking from submission to hire
- **Document uploads** — CV and profile photo via Cloudinary
- **Dark / light mode** — persisted per user
- **Fully responsive** — works on mobile and desktop

## Repository Layout

```
careerbridge/
├── backend/
│   ├── controllers/     # Business logic handlers
│   ├── middleware/       # JWT auth + role guards
│   ├── models/           # Mongoose data schemas
│   ├── routes/           # Express route definitions
│   ├── utils/            # Email, Cloudinary, token helpers
│   └── server.js         # App entry point
│
└── frontend/
    ├── public/
    └── src/
        ├── api/          # Axios HTTP client
        ├── components/   # Shared UI components
        ├── i18n/         # Translation files (6 locales)
        ├── pages/        # Route-level page components
        └── store/        # Zustand state stores
```

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier)
- Gmail account with App Password enabled

### Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### Required environment variables

**`backend/.env`**
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/careerbridge
JWT_SECRET=your_strong_secret_here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_16char_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
```

**`frontend/.env`**
```
REACT_APP_API_URL=http://localhost:5000/api
```

## REST API Reference

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/send-register-otp` | Public | Send signup verification code |
| POST | `/api/auth/verify-register-otp` | Public | Confirm signup code |
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | Auth | Fetch current user |
| POST | `/api/auth/logout` | Auth | Sign out |

### Listings (Jobs / Internships)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/jobs` | Public | Browse with filters |
| GET | `/api/jobs/featured` | Public | Homepage highlights |
| GET | `/api/jobs/:id` | Public | Listing detail |
| POST | `/api/jobs` | Recruiter | Create listing |
| PUT | `/api/jobs/:id` | Recruiter | Update listing |
| DELETE | `/api/jobs/:id` | Recruiter | Remove listing |

### Applications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/applications/:jobId` | Candidate | Submit application |
| GET | `/api/applications/my-applications` | Candidate | Own applications |
| GET | `/api/applications/job/:jobId` | Recruiter | Applicants for listing |
| PUT | `/api/applications/:id/status` | Recruiter | Update review stage |

### OTP (Language Verification)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/otp/send` | Auth | Dispatch verification code |
| POST | `/api/otp/verify` | Auth | Validate code + apply language |

### Admin
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/stats` | Admin | Platform statistics |
| GET | `/api/admin/users` | Admin | All accounts |
| PUT | `/api/admin/users/:id/toggle-status` | Admin | Suspend / activate |
| DELETE | `/api/admin/users/:id` | Admin | Remove account |
| GET | `/api/admin/jobs` | Admin | All listings |
| PUT | `/api/admin/jobs/:id/status` | Admin | Moderate listing |

## French Language OTP Flow

1. Logged-in user selects **Français** from the language switcher
2. Backend generates a 6-digit code and emails it via Nodemailer
3. A verification modal appears with individual digit inputs
4. User enters the code within the 10-minute window
5. Backend validates the code and updates `preferredLanguage` in MongoDB
6. Frontend applies French translations via i18next
7. Wrong code → error displayed, language unchanged
8. Three failed attempts → input locked, resend required

## Security Measures

- Passwords hashed with bcrypt (12 salt rounds)
- Stateless JWT authentication on all protected routes
- OTP records auto-expire via MongoDB TTL index (10 minutes)
- Input sanitisation and validation via express-validator
- Role-based access control across all API routes
- CORS restricted to the configured frontend origin

## Deployment

- **Backend** — Render.com (Node.js Web Service)
- **Frontend** — Vercel (Static Site)
- **Database** — MongoDB Atlas (M0 Free Tier)

## License

MIT — built as an original portfolio project.
