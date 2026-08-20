// src/routes/book.routes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const controller = require('../controllers/book.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { bookFilesUpload } = require('../middleware/upload.middleware');
const { validate } = require('../utils/validators');
const readingRoutes = require('./reading.routes');

const bookRules = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required.'),
  body('author').trim().isLength({ min: 1, max: 255 }).withMessage('Author is required.'),
];

// Public
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getOne));

// Reading: /:id/access, /:id/pdf, /:id/progress
router.use('/:id', readingRoutes);

// Admin only — multipart form with `pdf` (required on create) and optional `cover`
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  bookFilesUpload,
  bookRules,
  validate,
  asyncHandler(controller.create)
);
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  bookFilesUpload,
  asyncHandler(controller.update)
);
router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(controller.remove));

module.exports = router;
