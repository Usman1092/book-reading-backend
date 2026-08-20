// src/routes/payment.routes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const controller = require('../controllers/payment.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { proofUpload } = require('../middleware/paymentUpload.middleware');
const { validate } = require('../utils/validators');

const submitRules = [
  body('planId').isInt({ min: 1 }),
  body('method').isIn(['easypaisa', 'bank_transfer']),
  body('referenceNumber').trim().isLength({ min: 3, max: 150 }),
  body('amount').isFloat({ min: 0 }),
];

// User
router.post('/', requireAuth, proofUpload, submitRules, validate, asyncHandler(controller.submit));
router.get('/mine', requireAuth, asyncHandler(controller.listMine));

// Admin
router.get('/', requireAuth, requireRole('admin'), asyncHandler(controller.listAdmin));
router.get('/:id/proof', requireAuth, requireRole('admin'), asyncHandler(controller.getProof));
router.put('/:id/approve', requireAuth, requireRole('admin'), asyncHandler(controller.approve));
router.put(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
  asyncHandler(controller.reject)
);

module.exports = router;
