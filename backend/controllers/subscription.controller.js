/**
 * Subscription controller
 * Handles plan info, Razorpay order creation, payment verification,
 * invoice email, and time-window enforcement (10–11 AM IST).
 */

const crypto       = require('crypto');
const Razorpay     = require('razorpay');
const Subscription = require('../models/Subscription');
const { dispatchEmail } = require('../utils/sendEmail');

const PLANS = Subscription.PLANS;

/* ── IST time helper ── */
const getISTHour = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return { hour: ist.getUTCHours(), minute: ist.getUTCMinutes(), ist };
};

const getRazorpay = () => new Razorpay({
  key_id    : process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ── Get or create subscription ── */
const getOrCreateSub = async (userId) => {
  let sub = await Subscription.findOne({ userId });
  if (!sub) {
    sub = await Subscription.create({ userId, plan: 'free' });
  }
  await sub.resetIfNewMonth();
  return sub;
};

/* ── Get current plan info ── */
exports.getPlanInfo = async (req, res) => {
  try {
    const sub = await getOrCreateSub(req.user._id);
    const planDetails = PLANS[sub.plan];
    const limit = planDetails.appsPerMonth;

    return res.json({
      success: true,
      subscription: {
        plan         : sub.plan,
        planName     : planDetails.name,
        price        : planDetails.price,
        appsPerMonth : limit === Infinity ? -1 : limit,
        appsUsed     : sub.appsUsedThisMonth,
        appsRemaining: limit === Infinity ? -1 : Math.max(0, limit - sub.appsUsedThisMonth),
        status       : sub.status,
        expiresAt    : sub.expiresAt,
        usageResetAt : sub.usageResetAt,
      },
      plans: Object.entries(PLANS).map(([key, p]) => ({
        key,
        name        : p.name,
        price       : p.price,
        appsPerMonth: p.appsPerMonth === Infinity ? -1 : p.appsPerMonth,
        color       : p.color,
        isCurrent   : key === sub.plan,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Create Razorpay order ── */
exports.createPlanOrder = async (req, res) => {
  try {
    const { planKey } = req.body;

    if (!PLANS[planKey]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }
    if (planKey === 'free') {
      return res.status(400).json({ success: false, message: 'Free plan does not require payment.' });
    }

    /* ── Time window check: 10:00 AM – 11:00 AM IST ── */
    const { hour, minute, ist } = getISTHour();
    const totalMins = hour * 60 + minute;
    if (totalMins < 600 || totalMins >= 660) { // 600 = 10*60, 660 = 11*60
      const currentIST = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} IST`;
      return res.status(403).json({
        success    : false,
        blocked    : true,
        message    : `Payments are only allowed between 10:00 AM and 11:00 AM IST. Current time: ${currentIST}`,
        currentTime: currentIST,
        allowWindow: '10:00 AM – 11:00 AM IST',
      });
    }

    const plan   = PLANS[planKey];
    const amount = plan.price * 100; // paise

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt : `sub_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
      notes   : {
        userId  : req.user._id.toString(),
        plan    : planKey,
        purpose : 'subscription',
      },
    });

    return res.json({
      success : true,
      orderId : order.id,
      amount,
      currency: 'INR',
      keyId   : process.env.RAZORPAY_KEY_ID,
      plan    : planKey,
      planName: plan.name,
    });
  } catch (err) {
    console.error('createPlanOrder error:', err);
    const msg = err?.error?.description || err?.message || 'Failed to create order.';
    return res.status(500).json({ success: false, message: msg });
  }
};

/* ── Verify payment + activate plan ── */
exports.verifyPlanPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey } = req.body;

    /* Verify signature */
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    if (!PLANS[planKey]) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    /* Activate subscription */
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    const sub = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        plan         : planKey,
        status       : 'active',
        startDate    : new Date(),
        expiresAt,
        appsUsedThisMonth: 0,
        lastPaymentId: razorpay_payment_id,
        invoiceNumber,
      },
      { upsert: true, new: true }
    );

    /* Send invoice email */
    const plan = PLANS[planKey];
    const invoiceHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:26px;">CareerBridge</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;">Payment Invoice</p>
        </div>
        <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <h2 style="color:#111827;margin-top:0;">🎉 Subscription Activated!</h2>
          <p style="color:#6b7280;font-size:15px;">Your <strong>${plan.name} Plan</strong> is now active. Here are your invoice details:</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr style="background:#f3f4f6;">
              <td style="padding:10px;font-weight:600;color:#374151;">Invoice Number</td>
              <td style="padding:10px;color:#6b7280;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:600;color:#374151;">Plan</td>
              <td style="padding:10px;color:#6b7280;">${plan.name} Plan</td>
            </tr>
            <tr style="background:#f3f4f6;">
              <td style="padding:10px;font-weight:600;color:#374151;">Amount Paid</td>
              <td style="padding:10px;color:#6b7280;">₹${plan.price}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:600;color:#374151;">Applications/Month</td>
              <td style="padding:10px;color:#6b7280;">${plan.appsPerMonth === Infinity ? 'Unlimited' : plan.appsPerMonth}</td>
            </tr>
            <tr style="background:#f3f4f6;">
              <td style="padding:10px;font-weight:600;color:#374151;">Valid Until</td>
              <td style="padding:10px;color:#6b7280;">${expiresAt.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:600;color:#374151;">Payment ID</td>
              <td style="padding:10px;color:#6b7280;">${razorpay_payment_id}</td>
            </tr>
          </table>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="color:#16a34a;font-weight:600;margin:0;">✓ Payment Successful</p>
            <p style="color:#16a34a;margin:4px 0 0;font-size:13px;">You can now apply for ${plan.appsPerMonth === Infinity ? 'unlimited' : plan.appsPerMonth} internship${plan.appsPerMonth !== 1 ? 's' : ''} this month.</p>
          </div>
          <p style="color:#9ca3af;font-size:13px;">Thank you for subscribing to CareerBridge Premium!</p>
        </div>
      </div>
    `;

    await dispatchEmail(
      req.user.emailAddress,
      `Invoice: ${plan.name} Plan — CareerBridge`,
      invoiceHtml
    );

    return res.json({
      success     : true,
      message     : `${plan.name} Plan activated! Invoice sent to your email.`,
      plan        : planKey,
      planName    : plan.name,
      expiresAt,
      invoiceNumber,
      appsPerMonth: plan.appsPerMonth === Infinity ? -1 : plan.appsPerMonth,
    });
  } catch (err) {
    console.error('verifyPlanPayment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
