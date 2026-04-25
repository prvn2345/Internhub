/**
 * Admin controller
 * Platform statistics, user moderation, job moderation.
 */

const User        = require('../models/User');
const Job         = require('../models/Job');
const Application = require('../models/Application');

/* ── Dashboard statistics ─────────────────────────────── */
exports.getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, totalListings, totalSubmissions, activeListings] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      Job.countDocuments({ listingStatus: 'active' }),
    ]);

    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$accountRole', count: { $sum: 1 } } },
    ]);

    const latestUsers = await User.find()
      .select('fullName emailAddress accountRole createdAt isActive')
      .sort('-createdAt')
      .limit(5);

    const latestJobs = await Job.find()
      .populate('postedBy', 'fullName organisationName')
      .sort('-createdAt')
      .limit(5);

    return res.json({
      success: true,
      stats  : { totalUsers, totalJobs: totalListings, totalApplications: totalSubmissions, activeJobs: activeListings, roleBreakdown },
      recentUsers: latestUsers.map(u => ({
        _id      : u._id,
        name     : u.fullName,
        email    : u.emailAddress,
        role     : u.accountRole,
        createdAt: u.createdAt,
        isActive : u.isActive,
      })),
      recentJobs: latestJobs.map(j => ({
        _id    : j._id,
        title  : j.positionTitle,
        company: j.companyName,
        status : j.listingStatus,
        employer: { name: j.postedBy?.fullName },
      })),
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── List all users ───────────────────────────────────── */
exports.listAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const criteria = {};

    if (role)   criteria.accountRole = role;
    if (search) {
      criteria.$or = [
        { fullName    : { $regex: search, $options: 'i' } },
        { emailAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const total  = await User.countDocuments(criteria);

    const accounts = await User.find(criteria)
      .select('-hashedPassword')
      .sort('-createdAt')
      .skip(offset)
      .limit(Number(limit));

    const users = accounts.map(u => ({
      _id              : u._id,
      name             : u.fullName,
      email            : u.emailAddress,
      role             : u.accountRole,
      languagePreference: u.preferredLanguage,
      profilePicture   : u.avatarUrl,
      isActive         : u.isActive,
      createdAt        : u.createdAt,
    }));

    return res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), users });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Toggle user active status ────────────────────────── */
exports.toggleAccountStatus = async (req, res) => {
  try {
    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (account.accountRole === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be suspended' });
    }

    account.isActive = !account.isActive;
    await account.save();

    return res.json({
      success : true,
      message : `Account ${account.isActive ? 'activated' : 'suspended'}`,
      isActive: account.isActive,
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Delete user ──────────────────────────────────────── */
exports.removeUser = async (req, res) => {
  try {
    const account = await User.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (account.accountRole === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }

    await account.deleteOne();
    await Job.deleteMany({ postedBy: req.params.id });
    await Application.deleteMany({ candidate: req.params.id });

    return res.json({ success: true, message: 'User removed' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── List all jobs ────────────────────────────────────── */
exports.listAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const criteria = {};

    if (status) criteria.listingStatus = status;
    if (search) {
      criteria.$or = [
        { positionTitle: { $regex: search, $options: 'i' } },
        { companyName  : { $regex: search, $options: 'i' } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const total  = await Job.countDocuments(criteria);

    const listings = await Job.find(criteria)
      .populate('postedBy', 'fullName emailAddress organisationName')
      .sort('-createdAt')
      .skip(offset)
      .limit(Number(limit));

    const jobs = listings.map(j => ({
      _id              : j._id,
      title            : j.positionTitle,
      company          : j.companyName,
      location         : j.workLocation,
      type             : j.listingKind,
      status           : j.listingStatus,
      applicationsCount: j.totalApplications,
      employer         : {
        name       : j.postedBy?.fullName,
        email      : j.postedBy?.emailAddress,
        companyName: j.postedBy?.organisationName,
      },
    }));

    return res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), jobs });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Update job status ────────────────────────────────── */
exports.setJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await Job.findByIdAndUpdate(
      req.params.id,
      { listingStatus: status },
      { new: true }
    );

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    return res.json({ success: true, message: 'Listing status updated', job: { _id: listing._id, status: listing.listingStatus } });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
