// src/routes/reading.routes.js
// Mounted at /api/books/:id/... in app.js (mergeParams so :id is visible).

const express = require('express');
const router = express.Router({ mergeParams: true });
const { body } = require('express-validator');

const controller = require('../controllers/reading.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../utils/validators');

// Access check and the PDF itself are available to anonymous visitors too
// (they resolve to 'preview' access) — see access.service.js.
router.get('/access', optionalAuth, asyncHandler(controller.getAccess));
router.get('/pdf', optionalAuth, asyncHandler(controller.getPdf));

// Progress requires a logged-in user — there's nothing to persist for an
// anonymous visitor.
router.get('/progress', requireAuth, asyncHandler(controller.getProgress));
router.post(
  '/progress',
  requireAuth,
  body('page').isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  validate,
  asyncHandler(controller.postProgress)
);

module.exports = router;
