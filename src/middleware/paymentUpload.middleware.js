// src/middleware/paymentUpload.middleware.js
// Payment proof screenshots/receipts — small image or PDF, 5MB cap.

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { STORAGE_ROOT } = require('../services/storage.service');

const PROOFS_DIR = path.join(STORAGE_ROOT, 'payment-proofs');
fs.mkdirSync(PROOFS_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PROOFS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Payment proof must be an image (JPEG/PNG/WebP) or PDF.'));
    }
    cb(null, true);
  },
}).single('proof');

module.exports = { proofUpload, PROOFS_DIR };
