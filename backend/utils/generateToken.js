/**
 * Produces a signed JWT for the given user ID.
 * Expiry is read from env (default 7 days).
 */

const jwt = require('jsonwebtoken');

const issueAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

module.exports = issueAccessToken;
