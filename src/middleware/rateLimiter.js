// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Tight limit on login/register/forgot-password to slow down brute-force
// and account-enumeration attempts, without blocking normal usage.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter };
