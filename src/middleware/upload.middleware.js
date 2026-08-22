// src/middleware/upload.middleware.js
//
// Two separate multer instances because PDFs and cover images have
// different size limits and different MIME-type allowlists. Both write
// directly into the final storage location with a server-generated UUID
// filename — the client-supplied filename is used only to read the
// extension, never trusted for anything else (and even the extension is
// validated against the MIME type, not just copied verbatim).

const fs = require('fs');
const multer = require('multer');
// const upload = multer({ dest: 'temp/' }); 
const path = require('path');
const { BOOKS_DIR, COVERS_DIR, generateStoredName } = require('../services/storage.service');

const PDF_MAX_BYTES = 50 * 1024 * 1024; // 50MB
const COVER_MAX_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_COVER_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function pdfFileFilter(req, file, cb) {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Only PDF files are allowed for the book file.'));
  }
  cb(null, true);
}

function coverFileFilter(req, file, cb) {
  if (!ALLOWED_COVER_MIME.has(file.mimetype)) {
    return cb(new Error('Cover image must be JPEG, PNG, or WebP.'));
  }
  cb(null, true);
}

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BOOKS_DIR),
  filename: (req, file, cb) => cb(null, generateStoredName('.pdf')),
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COVERS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, generateStoredName(ext));
  },
});

const pdfUpload = multer({ storage: pdfStorage, limits: { fileSize: PDF_MAX_BYTES }, fileFilter: pdfFileFilter });
const coverUpload = multer({ storage: coverStorage, limits: { fileSize: COVER_MAX_BYTES }, fileFilter: coverFileFilter });

// Combined middleware for the "create/update book" endpoint, which accepts
// both a `pdf` field and an optional `cover` field in one multipart request.
console.log('UPLOAD MIDDLEWARE FILE LOADED');
const bookFilesUpload = multer({
  storage: multer.diskStorage({

    destination: (req, file, cb) => {

      const destination =
        file.fieldname === 'cover'
          ? COVERS_DIR
          : BOOKS_DIR;

      // IMPORTANT:
      // Make absolutely sure the directory exists
      // before Multer attempts to write the file.

      fs.mkdirSync(destination, {
        recursive: true,
      });

      console.log('MULTER DESTINATION');
      console.log('Field:', file.fieldname);
      console.log('Destination:', destination);
      console.log(
        'Directory exists:',
        fs.existsSync(destination)
      );

      cb(null, destination);
    },

    filename: (req, file, cb) => {

      console.log('MULTER FILENAME');
      console.log(
        'Original filename:',
        file.originalname
      );
      console.log(
        'MIME type:',
        file.mimetype
      );

      if (file.fieldname === 'cover') {

        const ext =
          path.extname(file.originalname)
            .toLowerCase() || '.jpg';

        const filename =
          generateStoredName(ext);

        console.log(
          'Generated cover filename:',
          filename
        );

        return cb(null, filename);
      }

      const filename =
        generateStoredName('.pdf');

      console.log(
        'Generated PDF filename:',
        filename
      );

      cb(null, filename);
    },
  }),

  limits: {
    fileSize: PDF_MAX_BYTES,
  },

  fileFilter: (req, file, cb) => {

    if (file.fieldname === 'pdf') {
      return pdfFileFilter(req, file, cb);
    }

    if (file.fieldname === 'cover') {
      return coverFileFilter(req, file, cb);
    }

    cb(new Error('Unexpected file field.'));
  },

}).fields([
  {
    name: 'pdf',
    maxCount: 1,
  },
  {
    name: 'cover',
    maxCount: 1,
  },
]);

module.exports = { pdfUpload, coverUpload, bookFilesUpload };
