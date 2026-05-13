/**
 * Email delivery via Resend API.
 * Works reliably on Render free tier — no SMTP port issues.
 */

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'CareerBridge <onboarding@resend.dev>';

/* ── Core send function ── */
const dispatchEmail = async (recipient, subject, htmlBody) => {
  if (!resend) {
    console.warn('RESEND_API_KEY is missing. Email skipped.');
    throw new Error('Resend API key missing');
  }
  const { error } = await resend.emails.send({
    from   : FROM_EMAIL,
    to     : [recipient],
    subject,
    html   : htmlBody,
  });
  if (error) throw new Error(error.message || 'Resend email failed');
};

/* ── Shared OTP template ── */
const buildPasscodeEmail = (passcode, heading, tagline, bodyText) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;">CareerBridge</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">${tagline}</p>
    </div>
    <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
      <h2 style="color:#111827;margin-top:0;">${heading}</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;">${bodyText}</p>
      <div style="background:#fff;border:2px dashed #4f46e5;border-radius:10px;
                  padding:22px;text-align:center;margin:24px 0;">
        <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:#4f46e5;">
          ${passcode}
        </span>
      </div>
      <p style="color:#9ca3af;font-size:13px;">⏰ This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#9ca3af;font-size:13px;">Didn't request this? You can safely ignore this message.</p>
    </div>
  </div>
`;

/* ── Language-change OTP ── */
const sendLanguageOTP = async (recipient, passcode) => {
  const html = buildPasscodeEmail(passcode, 'Your Verification Code', 'Language Change Security Check',
    'You requested to switch your interface language to <strong>French</strong>. Enter the code below:');
  await dispatchEmail(recipient, 'Language Change OTP — CareerBridge', html);
};

/* ── Registration OTP ── */
const sendSignupOTP = async (recipient, passcode) => {
  const html = buildPasscodeEmail(passcode, 'Confirm Your Email Address', 'Account Registration',
    'Welcome to CareerBridge! Use the code below to verify your email and complete your account setup:');
  await dispatchEmail(recipient, 'Verify Your Email — CareerBridge', html);
};

/* ── Password reset email ── */
const sendPasswordResetEmail = async (recipient, newPassword) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:26px;">CareerBridge</h1>
        <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;">Password Reset</p>
      </div>
      <div style="background:#fafafa;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
        <h2 style="color:#111827;margin-top:0;">Your New Password</h2>
        <p style="color:#6b7280;font-size:15px;">Your password has been reset. Use the password below to sign in.</p>
        <div style="background:#fff;border:2px dashed #4f46e5;border-radius:10px;padding:22px;text-align:center;margin:24px 0;">
          <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:#4f46e5;font-family:'Courier New',monospace;">${newPassword}</span>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="color:#1d4ed8;font-size:14px;font-weight:600;margin:0 0 6px;">💡 Want to set your own password?</p>
          <p style="color:#3b82f6;font-size:13px;margin:0;">Go to your <strong>Profile page</strong> → <strong>Change Password</strong> section.</p>
        </div>
        <p style="color:#ef4444;font-size:13px;font-weight:600;">⚠️ If you did not request this, contact support immediately.</p>
      </div>
    </div>
  `;
  await dispatchEmail(recipient, 'Your New Password — CareerBridge', html);
};

console.log('✅ Email service ready (Resend)');

module.exports = { dispatchEmail, sendLanguageOTP, sendSignupOTP, sendPasswordResetEmail };
