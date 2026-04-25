/**
 * Job / Internship listing schema.
 * Text index on title + company + description enables full-text search.
 */

const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    positionTitle : {
      type    : String,
      required: [true, 'Position title is required'],
      trim    : true,
    },
    companyName : {
      type    : String,
      required: [true, 'Company name is required'],
      trim    : true,
    },
    companyLogoUrl : String,
    postedBy : {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    listingKind : {
      type   : String,
      enum   : ['internship', 'job'],
      default: 'internship',
    },
    domain : {
      type    : String,
      required: [true, 'Domain / category is required'],
    },
    workLocation : {
      type    : String,
      required: [true, 'Work location is required'],
    },
    allowsRemote : {
      type   : Boolean,
      default: false,
    },
    roleDescription : {
      type    : String,
      required: [true, 'Role description is required'],
    },
    keyResponsibilities: [String],
    candidateRequirements: [String],
    requiredSkills: [String],
    monthlyStipend : {
      type   : Number,
      default: 0,
    },
    compensationType : {
      type   : String,
      enum   : ['fixed', 'performance-based', 'unpaid'],
      default: 'fixed',
    },
    engagementPeriod : {
      type    : String,
      required: [true, 'Engagement period is required'],
    },
    vacancies : {
      type   : Number,
      default: 1,
    },
    closingDate : {
      type    : Date,
      required: [true, 'Application closing date is required'],
    },
    listingStatus : {
      type   : String,
      enum   : ['active', 'closed', 'draft'],
      default: 'active',
    },
    totalApplications : { type: Number, default: 0 },
    pageViews         : { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* Full-text search index */
listingSchema.index(
  { positionTitle: 'text', companyName: 'text', roleDescription: 'text' }
);
/* Compound index for common filter queries */
listingSchema.index({ workLocation: 1, domain: 1, listingKind: 1, listingStatus: 1 });

module.exports = mongoose.model('Job', listingSchema);
