/**
 * CareerBridge API Server
 * Entry point — wires up Express, MongoDB, and all route modules.
 */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');

dotenv.config();

const app = express();

/* ── Cross-origin & body parsing ─────────────────────── */
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(u => u.trim());
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowed.includes(origin) || allowed.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Route mounting ───────────────────────────────────── */
app.use('/api/auth',         require('./routes/auth.routes'));
app.use('/api/users',        require('./routes/user.routes'));
app.use('/api/jobs',         require('./routes/job.routes'));
app.use('/api/applications', require('./routes/application.routes'));
app.use('/api/otp',          require('./routes/otp.routes'));
app.use('/api/admin',        require('./routes/admin.routes'));

/* ── Health probe ─────────────────────────────────────── */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'UP', timestamp: new Date().toISOString() })
);

/* ── 404 handler ──────────────────────────────────────── */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

/* ── Database + server bootstrap ─────────────────────── */
const startServer = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB Atlas connected');
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () =>
        console.log(`🚀 CareerBridge API running on port ${PORT}`)
      );
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`   Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('   All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
    }
  }
};

startServer();
