/**
 * OTP controller — handles language-change passcode flow.
 * Sending is protected (requires auth); verifying updates the language preference.
 */

const crypto = require('crypto');
const OTP    = require('../models/OTP');
const User   = require('../models/User');
const { sendLanguageOTP } = require('../utils/sendEmail');

const makePasscode = () => crypto.randomInt(100000, 999999).toString();

/* ── Dispatch language-change OTP ────────────────────── */
exports.dispatchPasscode = async (req, res) => {
  const { purpose = 'language-change' } = req.body;
  const recipientEmail = req.user.emailAddress;

  try {
    /* Remove any existing unused code for this user + purpose */
    await OTP.deleteMany({ recipientEmail, useCase: purpose });

    const code = makePasscode();
    await OTP.create({
      recipientEmail,
      code,
      useCase  : purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendLanguageOTP(recipientEmail, code);

    return res.json({ success: true, message: `Verification code sent to ${recipientEmail}` });

  } catch (err) {
    console.error('dispatchPasscode error:', err);

    await OTP.deleteMany({ recipientEmail, useCase: purpose }).catch(() => {});

    const smtpMsg = (err?.response || '').toLowerCase();
    if (err?.responseCode === 550 || smtpMsg.includes('does not exist') || smtpMsg.includes('no such user')) {
      return res.status(400).json({
        success: false,
        message: 'The email on your account appears invalid. Please update it and try again.',
      });
    }

    return res.status(500).json({ success: false, message: 'Failed to send code. Please try again.' });
  }
};

/* ── Verify language-change OTP ──────────────────────── */
exports.validatePasscode = async (req, res) => {
  try {
    const { otp, language = 'fr', purpose = 'language-change' } = req.body;
    const recipientEmail = req.user.emailAddress;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const record = await OTP.findOne({
      recipientEmail,
      useCase : purpose,
      consumed: false,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Code not found or already used. Please request a new one.',
      });
    }
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'Code has expired. Please request a new one.',
      });
    }
    if (record.code !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    /* Mark consumed */
    record.consumed = true;
    await record.save();

    /* Apply language preference */
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { preferredLanguage: language },
      { new: true }
    );

    await record.deleteOne();

    return res.json({
      success           : true,
      message           : 'Language preference updated to French.',
      languagePreference: updated.preferredLanguage,
    });
  } catch (err) {
    console.error('validatePasscode error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
