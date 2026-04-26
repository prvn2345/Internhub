/**
 * Subscription model — tracks user's active plan and application usage.
 */

const mongoose = require('mongoose');

const PLANS = {
  free  : { name: 'Free',   price: 0,    appsPerMonth: 1,         color: 'gray'   },
  bronze: { name: 'Bronze', price: 100,  appsPerMonth: 3,         color: 'amber'  },
  silver: { name: 'Silver', price: 300,  appsPerMonth: 5,         color: 'slate'  },
  gold  : { name: 'Gold',   price: 1000, appsPerMonth: Infinity,  color: 'yellow' },
};

const subscriptionSchema = new mongoose.Schema(
  {
    userId       : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan         : { type: String, enum: ['free', 'bronze', 'silver', 'gold'], default: 'free' },
    status       : { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    startDate    : { type: Date, default: Date.now },
    expiresAt    : { type: Date },                    // null = free plan (no expiry)
    appsUsedThisMonth: { type: Number, default: 0 },
    usageResetAt : { type: Date, default: () => {
      const d = new Date(); d.setDate(1); d.setHours(0,0,0,0);
      d.setMonth(d.getMonth() + 1); return d;         // first day of next month
    }},
    lastPaymentId: { type: String },
    invoiceNumber: { type: String },
  },
  { timestamps: true }
);

subscriptionSchema.statics.PLANS = PLANS;

/* Reset monthly usage if needed */
subscriptionSchema.methods.resetIfNewMonth = async function () {
  if (new Date() >= this.usageResetAt) {
    this.appsUsedThisMonth = 0;
    const next = new Date();
    next.setDate(1); next.setHours(0,0,0,0);
    next.setMonth(next.getMonth() + 1);
    this.usageResetAt = next;
    await this.save();
  }
};

/* Check if user can apply */
subscriptionSchema.methods.canApply = function () {
  const limit = PLANS[this.plan]?.appsPerMonth;
  if (limit === Infinity) return { allowed: true };
  if (this.appsUsedThisMonth >= limit) {
    return {
      allowed: false,
      message: `You've used all ${limit} application${limit > 1 ? 's' : ''} for this month on the ${PLANS[this.plan].name} plan. Upgrade to apply more.`,
      plan   : this.plan,
      limit,
      used   : this.appsUsedThisMonth,
    };
  }
  return { allowed: true, remaining: limit - this.appsUsedThisMonth };
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
