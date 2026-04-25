/**
 * One-time seed route — creates an admin account directly (no OTP needed).
 * REMOVE THIS FILE after first use in production.
 */

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const issueAccessToken = require('../utils/generateToken');

router.post('/create-admin', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Simple secret to prevent abuse
    if (secretKey !== process.env.JWT_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existing = await User.findOne({ emailAddress: email.toLowerCase() });
    if (existing) {
      // Update password if exists
      existing.hashedPassword = password;
      await existing.save();
      const token = issueAccessToken(existing._id);
      return res.json({ success: true, message: 'Password updated', token, role: existing.accountRole });
    }

    const user = await User.create({
      fullName      : name,
      emailAddress  : email,
      hashedPassword: password,
      accountRole   : 'admin',
    });

    const token = issueAccessToken(user._id);
    return res.json({ success: true, message: 'Admin created', token, role: user.accountRole });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
