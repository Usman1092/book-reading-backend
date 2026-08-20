// src/routes/me.routes.js

const express = require('express');
const router = express.Router();

const controller = require('../controllers/me.controller');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/reading-progress', asyncHandler(controller.readingProgress));
router.get('/book-access', asyncHandler(controller.bookAccess));
router.get('/subscription', asyncHandler(controller.subscription));
router.get('/payments', asyncHandler(controller.payments));

module.exports = router;
