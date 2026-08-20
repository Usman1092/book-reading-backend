// src/routes/category.routes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const controller = require('../controllers/category.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../utils/validators');

const nameRule = [body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters.')];

// Public
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));

// Admin only
router.post('/', requireAuth, requireRole('admin'), nameRule, validate, asyncHandler(controller.create));
router.put('/:id', requireAuth, requireRole('admin'), nameRule, validate, asyncHandler(controller.update));
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(controller.remove));

module.exports = router;
