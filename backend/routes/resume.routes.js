const express = require('express');
const router  = express.Router();
const {
  sendResumeOTP,
  createResumeOrder,
  verifyPaymentAndGenerate,
} = require('../controllers/resume.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

// All resume builder routes require authentication + student role
router.use(requireAuth, requireRole('student'));

router.post('/send-otp',        sendResumeOTP);
router.post('/create-order',    createResumeOrder);
router.post('/verify-payment',  verifyPaymentAndGenerate);

module.exports = router;
