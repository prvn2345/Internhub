/**
 * Resume Builder Controller
 * Flow:
 *  1. POST /resume/send-otp       — send OTP to student's email
 *  2. POST /resume/create-order   — verify OTP + create Razorpay order (₹50)
 *  3. POST /resume/verify-payment — verify Razorpay signature + generate PDF + attach to profile
 */

const crypto          = require('crypto');
const Razorpay        = require('razorpay');
const OTP             = require('../models/OTP');
const User            = require('../models/User');
const PendingResume   = require('../models/PendingResume');
const generateResumePDF = require('../utils/generateResumePDF');
const { dispatchEmail } = require('../utils/sendEmail');
const { cloudinary }  = require('../utils/cloudinary');

const RESUME_FEE_PAISE = parseInt(process.env.RESUME_FEE_PAISE || '5000', 10);

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured.');
  }
  return new Razorpay({
    key_id    : process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/* ── 0. Health check for Razorpay config ─────────────── */
exports.checkConfig = (_req, res) => {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return res.json({
    success       : !!(keyId && keySecret),
    keyIdSet      : !!keyId,
    keySecretSet  : !!keySecret,
    keyIdPreview  : keyId ? keyId.slice(0, 12) + '...' : 'NOT SET',
    feePaise      : RESUME_FEE_PAISE,
  });
};

/* ── 1. Send OTP before payment ──────────────────────── */
exports.sendResumeOTP = async (req, res) => {
  try {
    const email = req.user.emailAddress;

    // Remove any existing resume-payment OTP for this user
    await OTP.deleteMany({ recipientEmail: email, useCase: 'resume-payment' });

    const code = crypto.randomInt(100000, 999999).toString();
    await OTP.create({
      recipientEmail: email,
      code,
      useCase  : 'resume-payment',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                    padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">CareerBridge</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Premium Resume Builder</p>
        </div>
        <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;margin-top:0;">Verify Your Payment</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">
            You are about to purchase a <strong>Premium Resume</strong> for <strong>₹50</strong>.
            Please use the code below to verify your identity before completing the payment.
          </p>
          <div style="background:#fff;border:2px dashed #4f46e5;border-radius:10px;
                      padding:22px;text-align:center;margin:24px 0;">
            <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:#4f46e5;">
              ${code}
            </span>
          </div>
          <p style="color:#9ca3af;font-size:13px;">⏰ This code expires in <strong>10 minutes</strong>.</p>
          <p style="color:#9ca3af;font-size:13px;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `;

    await dispatchEmail(email, 'Payment Verification OTP — CareerBridge Premium', html);

    return res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('sendResumeOTP error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

/* ── 2. Verify OTP + create Razorpay order ───────────── */
exports.createResumeOrder = async (req, res) => {
  try {
    const { otp, resumeData } = req.body;
    const email  = req.user.emailAddress;
    const userId = req.user._id;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    // ── Validate OTP ──
    const record = await OTP.findOne({
      recipientEmail: email,
      useCase       : 'resume-payment',
      consumed      : false,
    });

    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    }
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    record.consumed = true;
    await record.save();

    // ── Create Razorpay order ──
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount  : RESUME_FEE_PAISE,
      currency: 'INR',
      receipt : `res_${userId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes   : { userId: userId.toString(), userEmail: email, purpose: 'premium-resume' },
    });

    // ── Store resume data in dedicated collection ──
    await PendingResume.findOneAndUpdate(
      { userId },
      { userId, orderId: order.id, resumeData, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      { upsert: true, new: true }
    );

    return res.json({
      success : true,
      orderId : order.id,
      amount  : RESUME_FEE_PAISE,
      currency: 'INR',
      keyId   : process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('createResumeOrder error:', err);
    // Return the actual Razorpay error description if available
    const msg = err?.error?.description || err?.message || 'Failed to create payment order.';
    return res.status(500).json({ success: false, message: msg });
  }
};

/* ── 3. Verify payment + generate PDF + attach ───────── */
exports.verifyPaymentAndGenerate = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Fetch pending resume data from dedicated collection
    const pending = await PendingResume.findOne({ userId: req.user._id });
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Resume data not found. Please start over.' });
    }

    const resumeData = pending.resumeData;

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeData);

    // Store resume data for re-download + save PDF buffer reference
    // We'll use the download endpoint to stream the PDF
    const base64PDF = pdfBuffer.toString('base64');

    // Save resume data back to PendingResume with the generated PDF
    await PendingResume.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId    : req.user._id,
        resumeData,
        generatedPDF: base64PDF,
        expiresAt : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );

    // Attach resume download URL to user profile
    const downloadUrl = `https://careerbridge-api-zevz.onrender.com/api/resume/download/${req.user._id}`;

    await User.findByIdAndUpdate(req.user._id, { cvFileUrl: downloadUrl });

    // Clean up OTP records (keep PendingResume for download)
    await OTP.deleteMany({ recipientEmail: req.user.emailAddress, useCase: 'resume-payment' });

    // Send confirmation email
    const confirmHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                    padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">CareerBridge</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;">Premium Resume Ready!</p>
        </div>
        <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;margin-top:0;">🎉 Your Resume Has Been Generated</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;">
            Your professional resume has been created and automatically attached to your profile.
            It will be used for all future internship applications on CareerBridge.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="color:#16a34a;font-weight:600;margin:0;">✓ Payment of ₹50 received</p>
            <p style="color:#16a34a;margin:4px 0 0;font-size:13px;">Payment ID: ${razorpay_payment_id}</p>
          </div>
          <p style="color:#9ca3af;font-size:13px;">
            You can view and download your resume from your Profile page at any time.
          </p>
        </div>
      </div>
    `;
    await dispatchEmail(
      req.user.emailAddress,
      'Your Premium Resume is Ready — CareerBridge',
      confirmHtml
    );

    return res.json({
      success  : true,
      message  : 'Payment verified. Your resume has been generated and attached to your profile.',
      resumeUrl: downloadUrl,
    });
  } catch (err) {
    console.error('verifyPaymentAndGenerate error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to generate resume. Please contact support.' });
  }
};

/* ── 4. Download resume PDF ───────────────────────────── */
exports.downloadResume = async (req, res) => {
  try {
    const { userId } = req.params;

    const pending = await PendingResume.findOne({ userId });

    // If we have a stored PDF, stream it
    if (pending && pending.generatedPDF) {
      const pdfBuffer = Buffer.from(pending.generatedPDF, 'base64');
      res.set({
        'Content-Type'       : 'application/pdf',
        'Content-Disposition': 'attachment; filename="CareerBridge_Resume.pdf"',
        'Content-Length'     : pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    // If we have resume data but no PDF yet, regenerate it
    if (pending && pending.resumeData) {
      const pdfBuffer = await generateResumePDF(pending.resumeData);
      const base64PDF = pdfBuffer.toString('base64');

      // Save for future downloads
      await PendingResume.findOneAndUpdate(
        { userId },
        { generatedPDF: base64PDF },
        { new: true }
      );

      res.set({
        'Content-Type'       : 'application/pdf',
        'Content-Disposition': 'attachment; filename="CareerBridge_Resume.pdf"',
        'Content-Length'     : pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    return res.status(404).send('Resume not found. Please generate a new one from the Resume Builder.');
  } catch (err) {
    console.error('downloadResume error:', err);
    return res.status(500).send('Failed to download resume.');
  }
};
