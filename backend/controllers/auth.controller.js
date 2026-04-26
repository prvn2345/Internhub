/**
 * Authentication controller
 * Handles signup (with OTP gate), sign-in, profile fetch, and sign-out.
 */

const crypto           = require('crypto');
const { validationResult } = require('express-validator');
const User             = require('../models/User');
const OTP              = require('../models/OTP');
const issueAccessToken = require('../utils/generateToken');
const { sendSignupOTP, sendPasswordResetEmail } = require('../utils/sendEmail');

const makePasscode = () => crypto.randomInt(100000, 999999).toString();

/**
 * Generates a random password using only uppercase and lowercase letters.
 * No numbers or special characters — easy to read and type.
 * Length: 12 characters.
 */
const generateLettersOnlyPassword = () => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // removed I, O to avoid confusion
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';  // removed i, l, o to avoid confusion
  const charset   = uppercase + lowercase;
  let password    = '';

  // Ensure at least 4 uppercase and 4 lowercase
  for (let i = 0; i < 4; i++) {
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
  }
  // Fill remaining 4 characters randomly
  for (let i = 0; i < 4; i++) {
    password += charset[crypto.randomInt(0, charset.length)];
  }

  // Shuffle the password so it's not predictably structured
  return password.split('').sort(() => crypto.randomInt(0, 3) - 1).join('');
};

/* ── Send registration OTP ────────────────────────────── */
exports.sendSignupPasscode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const taken = await User.findOne({ emailAddress: email.toLowerCase() });
    if (taken) {
      return res.status(400).json({ success: false, message: 'This email is already registered' });
    }

    /* Clear any stale OTPs for this address */
    await OTP.deleteMany({ recipientEmail: email.toLowerCase(), useCase: 'email-verify' });

    const code = makePasscode();
    await OTP.create({
      recipientEmail: email.toLowerCase(),
      code,
      useCase  : 'email-verify',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendSignupOTP(email, code);
    return res.json({ success: true, message: `Verification code sent to ${email}` });

  } catch (err) {
    console.error('sendSignupPasscode error:', err);

    /* Clean up the OTP we just created since delivery failed */
    await OTP.deleteMany({
      recipientEmail: req.body?.email?.toLowerCase(),
      useCase       : 'email-verify',
    }).catch(() => {});

    const smtpMsg  = (err?.response || '').toLowerCase();
    const smtpCode = err?.responseCode;

    if (smtpCode === 550 || smtpMsg.includes('does not exist') || smtpMsg.includes('no such user')) {
      return res.status(400).json({
        success: false,
        message: `The email address "${req.body?.email}" does not exist. Please check for typos and try again.`,
      });
    }
    if (smtpCode === 535 || smtpMsg.includes('invalid login') || smtpMsg.includes('bad credentials')) {
      return res.status(500).json({
        success: false,
        message: 'Email service is misconfigured. Please contact support.',
      });
    }
    if (smtpMsg.includes('spam') || smtpMsg.includes('blocked')) {
      return res.status(400).json({
        success: false,
        message: 'Email delivery was blocked. Try a different email address.',
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: `Failed to send code: ${err.message || 'Unknown error'}. Check Render logs.`
    });
  }
};

/* ── Verify registration OTP ──────────────────────────── */
exports.confirmSignupPasscode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const record = await OTP.findOne({
      recipientEmail: email.toLowerCase(),
      useCase       : 'email-verify',
      consumed      : false,
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Code not found. Please request a new one.' });
    }
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }
    if (record.code !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    record.consumed = true;
    await record.save();

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('confirmSignupPasscode error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Register account ─────────────────────────────────── */
exports.createAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, companyName } = req.body;

    const duplicate = await User.findOne({ emailAddress: email });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    /* Require prior OTP verification */
    const verified = await OTP.findOne({
      recipientEmail: email.toLowerCase(),
      useCase       : 'email-verify',
      consumed      : true,
    });
    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please complete OTP verification first.',
      });
    }

    const payload = {
      fullName      : name,
      emailAddress  : email,
      hashedPassword: password,
      accountRole   : role || 'student',
    };
    if (role === 'employer' && companyName) {
      payload.organisationName = companyName;
    }

    const newUser = await User.create(payload);
    await verified.deleteOne(); // clean up

    const token = issueAccessToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id             : newUser._id,
        name            : newUser.fullName,
        email           : newUser.emailAddress,
        role            : newUser.accountRole,
        languagePreference: newUser.preferredLanguage,
        companyName     : newUser.organisationName,
      },
    });
  } catch (err) {
    console.error('createAccount error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Sign in ──────────────────────────────────────────── */
exports.signIn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const account = await User.findOne({ emailAddress: email }).select('+hashedPassword');
    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!account.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been suspended' });
    }

    const passwordMatch = await account.verifyPassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = issueAccessToken(account._id);

    return res.json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        _id             : account._id,
        name            : account.fullName,
        email           : account.emailAddress,
        role            : account.accountRole,
        languagePreference: account.preferredLanguage,
        companyName     : account.organisationName,
        profilePicture  : account.avatarUrl,
      },
    });
  } catch (err) {
    console.error('signIn error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Fetch current user ───────────────────────────────── */
exports.fetchCurrentUser = async (req, res) => {
  try {
    const account = await User.findById(req.user._id)
      .populate('bookmarkedJobs', 'positionTitle companyName workLocation monthlyStipend');

    /* Normalise field names for the frontend */
    const user = account.toObject();
    user.name            = user.fullName;
    user.email           = user.emailAddress;
    user.role            = user.accountRole;
    user.languagePreference = user.preferredLanguage;
    user.companyName     = user.organisationName;
    user.profilePicture  = user.avatarUrl;
    user.skills          = user.skillSet;
    user.resumeUrl       = user.cvFileUrl;
    user.savedJobs       = user.bookmarkedJobs;
    user.bio             = user.aboutMe;
    user.location        = user.cityOrRegion;
    user.phone           = user.contactNumber;
    user.education       = user.academicHistory;
    user.experience      = user.workExperience;

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Sign out ─────────────────────────────────────────── */
exports.signOut = (_req, res) =>
  res.json({ success: true, message: 'Signed out successfully' });

/* ── Forgot password ──────────────────────────────────── */
exports.forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address or phone number.',
      });
    }

    const query = identifier.includes('@')
      ? { emailAddress: identifier.toLowerCase().trim() }
      : { contactNumber: identifier.trim() };

    const account = await User.findOne(query);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address or phone number.',
      });
    }

    if (!account.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact support.',
      });
    }

    /* ── Once-per-day rate limit ── */
    if (account.passwordResetUsedAt) {
      const lastReset = new Date(account.passwordResetUsedAt);
      const now       = new Date();
      const msSince   = now - lastReset;
      const msIn24h   = 24 * 60 * 60 * 1000;

      if (msSince < msIn24h) {
        const nextAllowed = new Date(lastReset.getTime() + msIn24h);
        const hoursLeft   = Math.ceil((nextAllowed - now) / (60 * 60 * 1000));
        return res.status(429).json({
          success    : false,
          rateLimited: true,
          message    : `You can use this option only once per day. Please try again in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`,
        });
      }
    }

    /* ── Auto-generate letters-only password ── */
    const freshPassword = generateLettersOnlyPassword();

    account.hashedPassword      = freshPassword;
    account.passwordResetUsedAt = new Date();
    await account.save();

    /* ── Email the new password ── */
    await sendPasswordResetEmail(account.emailAddress, freshPassword);

    return res.json({
      success: true,
      message: `A new password has been sent to ${account.emailAddress}.`,
    });

  } catch (err) {
    console.error('forgotPassword error:', err);
    const smtpMsg = (err?.response || '').toLowerCase();
    if (smtpMsg.includes('does not exist') || smtpMsg.includes('no such user')) {
      return res.status(400).json({
        success: false,
        message: 'The email address on your account appears invalid. Please contact support.',
      });
    }
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
