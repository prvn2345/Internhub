const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const {
  sendSignupPasscode,
  confirmSignupPasscode,
  createAccount,
  signIn,
  fetchCurrentUser,
  signOut,
  forgotPassword,
  verifyChromeOTP,
  getLoginHistory,
} = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/* Public — registration OTP */
router.post('/send-register-otp',   sendSignupPasscode);
router.post('/verify-register-otp', confirmSignupPasscode);

/* Public — register */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['student', 'employer']).withMessage('Invalid role'),
  ],
  createAccount
);

/* Public — sign in */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  signIn
);

/* Protected */
router.get('/me',     requireAuth, fetchCurrentUser);
router.post('/logout', requireAuth, signOut);

/* Public — forgot password (once per day) */
router.post('/forgot-password', forgotPassword);

/* Public — Chrome OTP verification */
router.post('/verify-chrome-otp', verifyChromeOTP);

/* Protected — login history */
router.get('/login-history', requireAuth, getLoginHistory);

module.exports = router;
