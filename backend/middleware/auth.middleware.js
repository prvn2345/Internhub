/**
 * Authentication & authorisation middleware.
 * `requireAuth`  — validates Bearer JWT and attaches user to req.
 * `requireRole`  — restricts access to specified account roles.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Validates the Bearer token in the Authorization header.
 * Attaches the resolved user document to req.user.
 */
exports.requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token missing' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await User.findById(decoded.id);
    if (!account) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }
    if (!account.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been suspended' });
    }

    req.user = account;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Restricts the route to one or more account roles.
 * Must be used after requireAuth.
 */
exports.requireRole = (...allowedRoles) =>
  (req, res, next) => {
    if (!allowedRoles.includes(req.user.accountRole)) {
      return res.status(403).json({
        success: false,
        message : `Access denied for role: ${req.user.accountRole}`,
      });
    }
    next();
  };
