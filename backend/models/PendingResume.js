/**
 * Temporary storage for resume data during payment flow.
 * Auto-deleted after 1 hour via TTL index.
 */

const mongoose = require('mongoose');

const pendingResumeSchema = new mongoose.Schema({
  userId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId   : { type: String },
  resumeData: { type: mongoose.Schema.Types.Mixed, required: true },
  generatedPDF: { type: String }, // base64 encoded PDF
  createdAt : { type: Date, default: Date.now },
  expiresAt : { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
});

pendingResumeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
pendingResumeSchema.index({ userId: 1 });

module.exports = mongoose.model('PendingResume', pendingResumeSchema);
