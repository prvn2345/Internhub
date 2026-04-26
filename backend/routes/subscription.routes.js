const express = require('express');
const router  = express.Router();
const {
  getPlanInfo,
  createPlanOrder,
  verifyPlanPayment,
} = require('../controllers/subscription.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth, requireRole('student'));

router.get('/plan',           getPlanInfo);
router.post('/create-order',  createPlanOrder);
router.post('/verify-payment', verifyPlanPayment);

module.exports = router;
