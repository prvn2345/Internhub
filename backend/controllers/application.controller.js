/**
 * Application (submission) controller
 * Candidates submit; employers review and update stages.
 */

const Application = require('../models/Application');
const Job         = require('../models/Job');
const User        = require('../models/User');
const Subscription = require('../models/Subscription');

const VALID_STAGES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];

/* ── Submit application ───────────────────────────────── */
exports.submitApplication = async (req, res) => {
  try {
    const listing = await Job.findById(req.params.jobId);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (listing.listingStatus !== 'active') {
      return res.status(400).json({ success: false, message: 'This listing is no longer accepting applications' });
    }
    if (new Date(listing.closingDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed' });
    }

    /* ── Check subscription limit ── */
    let sub = await Subscription.findOne({ candidate: req.user._id });
    if (!sub) sub = await Subscription.create({ userId: req.user._id, plan: 'free' });
    await sub.resetIfNewMonth();

    const canApplyResult = sub.canApply();
    if (!canApplyResult.allowed) {
      return res.status(403).json({
        success         : false,
        subscriptionLimit: true,
        message         : canApplyResult.message,
        plan            : canApplyResult.plan,
        limit           : canApplyResult.limit,
        used            : canApplyResult.used,
      });
    }

    const alreadyApplied = await Application.findOne({
      listing  : req.params.jobId,
      candidate: req.user._id,
    });
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'You have already applied for this position' });
    }

    const submissionData = {
      listing         : req.params.jobId,
      candidate       : req.user._id,
      recruiter       : listing.postedBy,
      motivationLetter: req.body.coverLetter,
    };

    if (req.file) {
      submissionData.cvLink    = req.file.path;
      submissionData.cvAssetId = req.file.filename;
    } else {
      const candidate = await User.findById(req.user._id);
      submissionData.cvLink = candidate.cvFileUrl;
    }

    const submission = await Application.create(submissionData);

    /* Increment subscription usage */
    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { appsUsedThisMonth: 1 } }
    );

    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { totalApplications: 1 } });

    return res.status(201).json({
      success    : true,
      message    : 'Application submitted successfully',
      application: submission,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already applied for this position' });
    }
    console.error('submitApplication error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Candidate's own applications ────────────────────── */
exports.getCandidateApplications = async (req, res) => {
  try {
    const submissions = await Application.find({ candidate: req.user._id })
      .populate('listing', 'positionTitle companyName workLocation monthlyStipend listingKind engagementPeriod listingStatus companyLogoUrl')
      .sort('-submittedAt');

    const applications = submissions.map(normaliseSubmission);
    return res.json({ success: true, applications });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Applicants for a listing (employer) ─────────────── */
exports.getListingApplicants = async (req, res) => {
  try {
    const listing = await Job.findById(req.params.jobId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (listing.postedBy.toString() !== req.user._id.toString() && req.user.accountRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const submissions = await Application.find({ listing: req.params.jobId })
      .populate('candidate', 'fullName emailAddress contactNumber cityOrRegion skillSet cvFileUrl avatarUrl academicHistory')
      .sort('-submittedAt');

    const applications = submissions.map(normaliseSubmission);
    return res.json({ success: true, applications });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Update review stage (employer) ──────────────────── */
exports.updateReviewStage = async (req, res) => {
  try {
    const { status, employerNotes } = req.body;

    if (!VALID_STAGES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review stage' });
    }

    const submission = await Application.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (submission.recruiter.toString() !== req.user._id.toString() && req.user.accountRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    submission.reviewStage = status;
    if (employerNotes) submission.recruiterFeedback = employerNotes;
    await submission.save();

    return res.json({
      success    : true,
      message    : 'Review stage updated',
      application: normaliseSubmission(submission),
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── All employer applications ────────────────────────── */
exports.getAllRecruiterApplications = async (req, res) => {
  try {
    const submissions = await Application.find({ recruiter: req.user._id })
      .populate('listing',   'positionTitle companyName workLocation listingKind')
      .populate('candidate', 'fullName emailAddress avatarUrl skillSet')
      .sort('-submittedAt');

    return res.json({ success: true, applications: submissions.map(normaliseSubmission) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Normaliser ───────────────────────────────────────── */
function normaliseSubmission(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;

  /* Flatten candidate aliases */
  if (obj.candidate && typeof obj.candidate === 'object') {
    obj.candidate.name          = obj.candidate.fullName;
    obj.candidate.email         = obj.candidate.emailAddress;
    obj.candidate.phone         = obj.candidate.contactNumber;
    obj.candidate.location      = obj.candidate.cityOrRegion;
    obj.candidate.skills        = obj.candidate.skillSet;
    obj.candidate.resumeUrl     = obj.candidate.cvFileUrl;
    obj.candidate.profilePicture= obj.candidate.avatarUrl;
    obj.candidate.education     = obj.candidate.academicHistory;
  }

  return {
    ...obj,
    job          : obj.listing,
    applicant    : obj.candidate,
    employer     : obj.recruiter,
    coverLetter  : obj.motivationLetter,
    resumeUrl    : obj.cvLink,
    status       : obj.reviewStage,
    employerNotes: obj.recruiterFeedback,
    appliedAt    : obj.submittedAt,
  };
}
