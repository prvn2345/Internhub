const express = require('express');
const router  = express.Router();
const {
  checkConfig,
  sendResumeOTP,
  createResumeOrder,
  verifyPaymentAndGenerate,
  downloadResume,
} = require('../controllers/resume.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// Public — download resume (no auth, URL is user-specific)
router.get('/download/:userId', downloadResume);

// Protected — all other routes require student auth
router.use(requireAuth, requireRole('student'));

router.get('/config-check',     checkConfig);
router.post('/send-otp',        sendResumeOTP);
router.post('/create-order',    createResumeOrder);
router.post('/verify-payment',  verifyPaymentAndGenerate);

module.exports = router;
