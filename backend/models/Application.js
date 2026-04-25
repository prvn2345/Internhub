/**
 * Candidate application schema.
 * A compound unique index prevents duplicate submissions.
 */

const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    listing : {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Job',
      required: true,
    },
    candidate : {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    recruiter : {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      required: true,
    },
    motivationLetter : {
      type     : String,
      maxlength: 2000,
    },
    cvLink      : String,
    cvAssetId   : String,
    reviewStage : {
      type   : String,
      enum   : ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending',
    },
    recruiterFeedback: String,
    submittedAt : {
      type   : Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* One application per candidate per listing */
submissionSchema.index({ listing: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', submissionSchema);
