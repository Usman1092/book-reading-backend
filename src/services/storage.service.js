// src/services/storage.service.js
//
// Storage layout under PDF_STORAGE_ROOT (an absolute path OUTSIDE any
// web-served directory):
//   <root>/books/<uuid>.pdf    — NEVER served statically, only through
//                                 the authenticated page-streaming endpoint
//   <root>/covers/<uuid>.<ext> — served read-only via express.static,
//                                 since cover art isn't sensitive
//
// Filenames are always server-generated UUIDs — the original uploaded
// filename is never trusted or reused, which avoids path traversal and
// filename-collision issues entirely.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_ROOT = process.env.PDF_STORAGE_ROOT || path.join(__dirname, '../../storage');
const BOOKS_DIR = path.join(STORAGE_ROOT, 'books');
const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');

function ensureDirs() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}
ensureDirs();

function generateStoredName(originalExt) {
  return `${crypto.randomUUID()}${originalExt}`;
}

function bookAbsolutePath(relativePath) {
  // relativePath is always "books/<name>" as stored in books.pdf_path
  const resolved = path.resolve(STORAGE_ROOT, relativePath);
  if (!resolved.startsWith(BOOKS_DIR)) {
    throw new Error('Resolved path escapes the books storage directory.');
  }
  return resolved;
}

function deleteIfExists(absolutePath) {
  fs.promises.unlink(absolutePath).catch(() => {
    // Already gone or never existed — not a failure condition here.
  });
}

module.exports = {
  STORAGE_ROOT,
  BOOKS_DIR,
  COVERS_DIR,
  generateStoredName,
  bookAbsolutePath,
  deleteIfExists,
};
