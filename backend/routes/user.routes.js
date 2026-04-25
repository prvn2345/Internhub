const express = require('express');
const router  = express.Router();
const {
  getOwnProfile,
  updateOwnProfile,
  uploadCV,
  uploadAvatar,
  setLanguage,
  toggleBookmark,
  getBookmarks,
} = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { cvUploader, avatarUploader } = require('../utils/cloudinary');

router.use(requireAuth);

router.get('/profile',                    getOwnProfile);
router.put('/profile',                    updateOwnProfile);
router.post('/resume',  cvUploader.single('resume'),              uploadCV);
router.post('/profile-picture', avatarUploader.single('profilePicture'), uploadAvatar);
router.put('/language',                   setLanguage);
router.post('/saved-jobs/:jobId',         toggleBookmark);
router.get('/saved-jobs',                 getBookmarks);

module.exports = router;
