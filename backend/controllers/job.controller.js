/**
 * Job listings controller
 * Public browsing, employer CRUD, featured listings for homepage.
 */

const Job         = require('../models/Job');
const Application = require('../models/Application');

/* ── Browse listings with filters ────────────────────── */
exports.browseListings = async (req, res) => {
  try {
    const {
      search, location, category, type,
      minStipend, maxStipend, duration, isRemote,
      page = 1, limit = 12, sort = '-createdAt',
    } = req.query;

    const criteria = { listingStatus: 'active' };

    if (search)    criteria.$text = { $search: search };
    if (location)  criteria.workLocation = { $regex: location, $options: 'i' };
    if (category)  criteria.domain = category;
    if (type)      criteria.listingKind = type;
    if (isRemote !== undefined) criteria.allowsRemote = isRemote === 'true';
    if (minStipend || maxStipend) {
      criteria.monthlyStipend = {};
      if (minStipend) criteria.monthlyStipend.$gte = Number(minStipend);
      if (maxStipend) criteria.monthlyStipend.$lte = Number(maxStipend);
    }
    if (duration) criteria.engagementPeriod = { $regex: duration, $options: 'i' };

    const offset = (Number(page) - 1) * Number(limit);
    const total  = await Job.countDocuments(criteria);

    const listings = await Job.find(criteria)
      .populate('postedBy', 'fullName organisationName companyLogoUrl')
      .sort(sort)
      .skip(offset)
      .limit(Number(limit));

    /* Normalise for frontend */
    const jobs = listings.map(normalise);

    return res.json({
      success: true,
      total,
      page : Number(page),
      pages: Math.ceil(total / Number(limit)),
      jobs,
    });
  } catch (err) {
    console.error('browseListings error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Single listing detail ────────────────────────────── */
exports.getListingDetail = async (req, res) => {
  try {
    const listing = await Job.findById(req.params.id).populate(
      'postedBy',
      'fullName emailAddress organisationName companyLogoUrl organisationSite organisationAbout sector headcount'
    );

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    listing.pageViews += 1;
    await listing.save();

    return res.json({ success: true, job: normalise(listing) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Create listing ───────────────────────────────────── */
exports.createListing = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      postedBy      : req.user._id,
      companyName   : req.user.organisationName || req.body.company,
      companyLogoUrl: req.user.organisationLogo,
    };

    const listing = await Job.create(payload);
    return res.status(201).json({ success: true, message: 'Listing published', job: normalise(listing) });
  } catch (err) {
    console.error('createListing error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Update listing ───────────────────────────────────── */
exports.updateListing = async (req, res) => {
  try {
    const listing = await Job.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (listing.postedBy.toString() !== req.user._id.toString() && req.user.accountRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new          : true,
      runValidators: true,
    });

    return res.json({ success: true, message: 'Listing updated', job: normalise(updated) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Remove listing ───────────────────────────────────── */
exports.removeListing = async (req, res) => {
  try {
    const listing = await Job.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (listing.postedBy.toString() !== req.user._id.toString() && req.user.accountRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    await listing.deleteOne();
    await Application.deleteMany({ listing: req.params.id });

    return res.json({ success: true, message: 'Listing removed' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Employer's own listings ──────────────────────────── */
exports.getMyListings = async (req, res) => {
  try {
    const listings = await Job.find({ postedBy: req.user._id }).sort('-createdAt');
    return res.json({ success: true, jobs: listings.map(normalise) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Featured listings for homepage ──────────────────── */
exports.getFeatured = async (req, res) => {
  try {
    const listings = await Job.find({ listingStatus: 'active' })
      .populate('postedBy', 'organisationName companyLogoUrl')
      .sort('-createdAt')
      .limit(8);

    return res.json({ success: true, jobs: listings.map(normalise) });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ── Field normaliser (maps DB names → frontend names) ── */
function normalise(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    title              : obj.positionTitle,
    company            : obj.companyName,
    companyLogo        : obj.companyLogoUrl,
    employer           : obj.postedBy,
    type               : obj.listingKind,
    category           : obj.domain,
    location           : obj.workLocation,
    isRemote           : obj.allowsRemote,
    description        : obj.roleDescription,
    responsibilities   : obj.keyResponsibilities,
    requirements       : obj.candidateRequirements,
    skills             : obj.requiredSkills,
    stipend            : obj.monthlyStipend,
    stipendType        : obj.compensationType,
    duration           : obj.engagementPeriod,
    openings           : obj.vacancies,
    applicationDeadline: obj.closingDate,
    status             : obj.listingStatus,
    applicationsCount  : obj.totalApplications,
    views              : obj.pageViews,
  };
}
