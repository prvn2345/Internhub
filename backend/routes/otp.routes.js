const express = require('express');
const router  = express.Router();
const { dispatchPasscode, validatePasscode } = require('../controllers/otp.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.post('/send',   dispatchPasscode);
router.post('/verify', validatePasscode);

module.exports = router;
