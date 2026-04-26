/**
 * User profile controller
 * Profile CRUD, CV upload, avatar upload, language preference, bookmarks.
 */

const User = require('../models/User');
const { removeCloudinaryAsset } = require('../utils/cloudinary');

const SUPPORTED_LANGUAGES = ['en', 'es', 'hi', 'pt', 'zh', 'fr'];

/* ── Fetch own profile ────────────────────────────────── */
exports.getOwnProfile = async (req, res) => {
  try {
    const account = await User.findById(req.user._id)
      .populate('bookmarkedJobs', 'positionTitle companyName workLocation monthlyStipend listingKind listingStatus');

    const user = account.toObject();
    /* Alias fields for frontend compatibility */
    user.name          = user.fullName;
    user.email         = user.emailAddress;
    user.role          = user.accountRole;
    user.languagePreference = user.preferredLanguage;
    user.companyName   = user.organisationName;
    user.profilePicture= user.avatarUrl;
    user.skills        = user.skillSet;
    user.resumeUrl     = user.cvFileUrl;
    user.savedJobs     = user.bookmarkedJobs;
    user.bio           = user.aboutMe;
    user.location      = user.cityOrRegion;
    user.phone         = user.contactNumber;
    user.education     = user.academicHistory;
    user.experience    = user.workExperience;

    return res.json({ success: true, user });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Update own profile ───────────────────────────────── */
exports.updateOwnProfile = async (req, res) => {
  try {
    const fieldMap = {
      name           : 'fullName',
      phone          : 'contactNumber',
      location       : 'cityOrRegion',
      bio            : 'aboutMe',
      skills         : 'skillSet',
      education      : 'academicHistory',
      experience     : 'workExperience',
      companyName    : 'organisationName',
      companyWebsite : 'organisationSite',
      companyDescription: 'organisationAbout',
      industry       : 'sector',
      companySize    : 'headcount',
    };

    const updates = {};
    Object.entries(fieldMap).forEach(([frontKey, dbKey]) => {
      if (req.body[frontKey] !== undefined) updates[dbKey] = req.body[frontKey];
    });

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new           : true,
      runValidators : true,
    });

    return res.json({ success: true, message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('updateOwnProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Upload CV ────────────────────────────────────────── */
exports.uploadCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }

    const account = await User.findById(req.user._id);
    if (account.cvPublicId) {
      await removeCloudinaryAsset(account.cvPublicId, 'raw');
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { cvFileUrl: req.file.path, cvPublicId: req.file.filename },
      { new: true }
    );

    return res.json({
      success  : true,
      message  : 'CV uploaded successfully',
      resumeUrl: updated.cvFileUrl,
    });
  } catch (err) {
    console.error('uploadCV error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Upload avatar ────────────────────────────────────── */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl: req.file.path },
      { new: true }
    );

    return res.json({
      success       : true,
      message       : 'Profile picture updated',
      profilePicture: updated.avatarUrl,
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Update language preference ───────────────────────── */
exports.setLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: 'Unsupported language code' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { preferredLanguage: language },
      { new: true }
    );

    return res.json({
      success           : true,
      message           : 'Language preference saved',
      languagePreference: updated.preferredLanguage,
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Toggle bookmark ──────────────────────────────────── */
exports.toggleBookmark = async (req, res) => {
  try {
    const account  = await User.findById(req.user._id);
    const listingId = req.params.jobId;
    const idx      = account.bookmarkedJobs.indexOf(listingId);
    let   feedback;

    if (idx === -1) {
      account.bookmarkedJobs.push(listingId);
      feedback = 'Job bookmarked';
    } else {
      account.bookmarkedJobs.splice(idx, 1);
      feedback = 'Bookmark removed';
    }

    await account.save();
    return res.json({ success: true, message: feedback, savedJobs: account.bookmarkedJobs });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Get bookmarked jobs ──────────────────────────────── */
exports.getBookmarks = async (req, res) => {
  try {
    const account = await User.findById(req.user._id).populate({
      path : 'bookmarkedJobs',
      match: { listingStatus: 'active' },
    });
    return res.json({ success: true, savedJobs: account.bookmarkedJobs });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Change password (from profile) ──────────────────── */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
    }

    const account = await User.findById(req.user._id).select('+hashedPassword');

    const isMatch = await account.verifyPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    account.hashedPassword = newPassword; // pre-save hook hashes it
    await account.save();

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
