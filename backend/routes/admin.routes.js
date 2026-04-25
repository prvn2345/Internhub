const express = require('express');
const router  = express.Router();
const {
  getPlatformStats,
  listAllUsers,
  toggleAccountStatus,
  removeUser,
  listAllJobs,
  setJobStatus,
} = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth, requireRole('admin'));

router.get('/stats',                    getPlatformStats);
router.get('/users',                    listAllUsers);
router.put('/users/:id/toggle-status',  toggleAccountStatus);
router.delete('/users/:id',             removeUser);
router.get('/jobs',                     listAllJobs);
router.put('/jobs/:id/status',          setJobStatus);

module.exports = router;
