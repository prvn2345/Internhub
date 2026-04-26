/**
 * One-time passcode schema.
 * MongoDB TTL index auto-removes expired records.
 */

const mongoose = require('mongoose');

const passcodeSchema = new mongoose.Schema({
  recipientEmail : {
    type     : String,
    required : true,
    lowercase: true,
  },
  code : {
    type    : String,
    required: true,
  },
  useCase : {
    type   : String,
    enum   : ['language-change', 'email-verify', 'password-reset', 'resume-payment'],
    default: 'language-change',
  },
  expiresAt : {
    type    : Date,
    required: true,
    default : () => new Date(Date.now() + 10 * 60 * 1000), // 10 min window
  },
  consumed : {
    type   : Boolean,
    default: false,
  },
});

/* Auto-purge expired documents */
passcodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', passcodeSchema);
