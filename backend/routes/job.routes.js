const express = require('express');
const router  = express.Router();
const {
  browseListings,
  getListingDetail,
  createListing,
  updateListing,
  removeListing,
  getMyListings,
  getFeatured,
} = require('../controllers/job.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.get('/',                    browseListings);
router.get('/featured',            getFeatured);
router.get('/employer/my-jobs',    requireAuth, requireRole('employer', 'admin'), getMyListings);
router.get('/:id',                 getListingDetail);
router.post('/',                   requireAuth, requireRole('employer', 'admin'), createListing);
router.put('/:id',                 requireAuth, requireRole('employer', 'admin'), updateListing);
router.delete('/:id',              requireAuth, requireRole('employer', 'admin'), removeListing);

module.exports = router;
