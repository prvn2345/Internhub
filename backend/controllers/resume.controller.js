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
const generateResumePDF = require('../utils/generateResumePDF');
const { dispatchEmail } = require('../utils/sendEmail');
const { cloudinary }  = require('../utils/cloudinary');

const razorpay = new Razorpay({
  key_id    : process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const RESUME_FEE_PAISE = parseInt(process.env.RESUME_FEE_PAISE || '5000', 10); // ₹50

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
    const email = req.user.emailAddress;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    // Validate OTP
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

    // Mark OTP consumed
    record.consumed = true;
    await record.save();

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount  : RESUME_FEE_PAISE,
      currency: 'INR',
      receipt : `resume_${req.user._id}_${Date.now()}`,
      notes   : {
        userId    : req.user._id.toString(),
        userEmail : email,
        purpose   : 'premium-resume',
      },
    });

    // Store resume data temporarily in OTP notes (reuse record)
    await OTP.create({
      recipientEmail: email,
      code          : order.id, // store order ID as "code"
      useCase       : 'resume-payment',
      consumed      : false,
      expiresAt     : new Date(Date.now() + 30 * 60 * 1000), // 30 min to complete payment
    });

    // Also store resume data on the user document temporarily
    await User.findByIdAndUpdate(req.user._id, {
      $set: { pendingResumeData: JSON.stringify(resumeData) },
    });

    return res.json({
      success : true,
      orderId : order.id,
      amount  : RESUME_FEE_PAISE,
      currency: 'INR',
      keyId   : process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('createResumeOrder error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
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

    // Fetch user and their pending resume data
    const account = await User.findById(req.user._id);
    if (!account.pendingResumeData) {
      return res.status(400).json({ success: false, message: 'Resume data not found. Please start over.' });
    }

    const resumeData = JSON.parse(account.pendingResumeData);

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeData);

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder       : 'careerbridge/resumes',
          resource_type: 'raw',
          public_id    : `resume_${req.user._id}_${Date.now()}`,
          format       : 'pdf',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(pdfBuffer);
    });

    // Attach resume URL to user profile + clear pending data
    await User.findByIdAndUpdate(req.user._id, {
      $set  : { cvFileUrl: uploadResult.secure_url, cvPublicId: uploadResult.public_id },
      $unset: { pendingResumeData: '' },
    });

    // Clean up OTP record
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
      resumeUrl: uploadResult.secure_url,
    });
  } catch (err) {
    console.error('verifyPaymentAndGenerate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate resume. Please contact support.' });
  }
};
