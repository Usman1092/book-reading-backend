// src/routes/admin.routes.js
// Every route here requires an authenticated admin — enforced once at
// the router level rather than repeated on each route.

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const controller = require('../controllers/admin.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../utils/validators');

router.use(requireAuth, requireRole('admin'));

// Dashboard
router.get('/dashboard', asyncHandler(controller.dashboard));

// Users
router.get('/users', asyncHandler(controller.listUsers));
router.get('/users/:id', asyncHandler(controller.getUser));
router.put(
  '/users/:id/active',
  body('isActive').isBoolean(),
  validate,
  asyncHandler(controller.setUserActive)
);

// Book assignment (20-day access grants)
router.get('/book-access', asyncHandler(controller.listBookAccess));
router.post(
  '/book-access',
  body('userId').isInt({ min: 1 }),
  body('bookId').isInt({ min: 1 }),
  body('durationDays').optional().isInt({ min: 1, max: 365 }),
  validate,
  asyncHandler(controller.grantBookAccess)
);
router.put('/book-access/:id/revoke', asyncHandler(controller.revokeBookAccess));
router.put(
  '/book-access/:id/renew',
  body('durationDays').optional().isInt({ min: 1, max: 365 }),
  validate,
  asyncHandler(controller.renewBookAccess)
);

module.exports = router;
