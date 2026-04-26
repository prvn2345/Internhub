/**
 * LoginHistory — stores every login attempt with device/browser/IP details.
 * Auto-purges records older than 90 days via TTL index.
 */

const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId     : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipAddress  : { type: String, default: 'Unknown' },
  browser    : { type: String, default: 'Unknown' },
  browserVersion: { type: String, default: '' },
  os         : { type: String, default: 'Unknown' },
  deviceType : { type: String, enum: ['desktop', 'laptop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  userAgent  : { type: String, default: '' },
  status     : { type: String, enum: ['success', 'blocked_time', 'pending_otp', 'otp_verified'], default: 'success' },
  loginAt    : { type: Date, default: Date.now },
  expiresAt  : { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
});

loginHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
loginHistorySchema.index({ userId: 1, loginAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
