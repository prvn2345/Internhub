const express = require('express');
const router  = express.Router();
const {
  submitApplication,
  getCandidateApplications,
  getListingApplicants,
  updateReviewStage,
  getAllRecruiterApplications,
} = require('../controllers/application.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { cvUploader } = require('../utils/cloudinary');

router.use(requireAuth);

router.post('/:jobId',          requireRole('student'),           cvUploader.single('resume'), submitApplication);
router.get('/my-applications',  requireRole('student'),           getCandidateApplications);
router.get('/job/:jobId',       requireRole('employer', 'admin'), getListingApplicants);
router.get('/employer/all',     requireRole('employer', 'admin'), getAllRecruiterApplications);
router.put('/:id/status',       requireRole('employer', 'admin'), updateReviewStage);

module.exports = router;
