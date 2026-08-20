// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  validate,
} = require('../utils/validators');

router.post('/register', authLimiter, registerRules, validate, asyncHandler(controller.register));
router.post('/login', authLimiter, loginRules, validate, asyncHandler(controller.login));
router.post('/refresh', asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordRules,
  validate,
  asyncHandler(controller.forgotPassword)
);
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordRules,
  validate,
  asyncHandler(controller.resetPassword)
);
router.get('/me', requireAuth, asyncHandler(controller.me));

module.exports = router;
