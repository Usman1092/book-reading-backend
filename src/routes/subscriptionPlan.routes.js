// src/routes/subscriptionPlan.routes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const controller = require('../controllers/subscriptionPlan.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../utils/validators');

const planRules = [
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('price').isFloat({ min: 0 }),
  body('durationDays').isInt({ min: 1 }),
];

router.get('/', asyncHandler(controller.listPublic));
router.get('/admin', requireAuth, requireRole('admin'), asyncHandler(controller.listAdmin));
router.post('/', requireAuth, requireRole('admin'), planRules, validate, asyncHandler(controller.create));
router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(controller.update));

module.exports = router;
