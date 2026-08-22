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


    // 1st CODE
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');

// const STORAGE_ROOT = process.env.PDF_STORAGE_ROOT || path.join(__dirname, '../../storage');
// const BOOKS_DIR = path.join(STORAGE_ROOT, 'books');
// const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');

// function ensureDirs() {
//   fs.mkdirSync(BOOKS_DIR, { recursive: true });
//   fs.mkdirSync(COVERS_DIR, { recursive: true });
// }
// ensureDirs();

// function generateStoredName(originalExt) {
//   return `${crypto.randomUUID()}${originalExt}`;
// }

// function bookAbsolutePath(relativePath) {
//   // relativePath is always "books/<name>" as stored in books.pdf_path
//   const resolved = path.resolve(STORAGE_ROOT, relativePath);
//   if (!resolved.startsWith(BOOKS_DIR)) {
//     throw new Error('Resolved path escapes the books storage directory.');
//   }
//   return resolved;
// }

// function deleteIfExists(absolutePath) {
//   fs.promises.unlink(absolutePath).catch(() => {
//     // Already gone or never existed — not a failure condition here.
//   });
// }

// module.exports = {
//   STORAGE_ROOT,
//   BOOKS_DIR,
//   COVERS_DIR,
//   generateStoredName,
//   bookAbsolutePath,
//   deleteIfExists,
// };





//2ND CODE IF IT NOT WORKS UN-COMMENT 1ST CODE
// const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');


// const USE_B2 = Boolean(
//   process.env.B2_ENDPOINT &&
//   process.env.B2_REGION &&
//   process.env.B2_BUCKET_NAME &&
//   process.env.B2_KEY_ID &&
//   process.env.B2_APPLICATION_KEY
// );

// const b2Client = USE_B2
//   ? new S3Client({
//       endpoint: process.env.B2_ENDPOINT,
//       region: process.env.B2_REGION,
//       credentials: {
//         accessKeyId: process.env.B2_KEY_ID,
//         secretAccessKey: process.env.B2_APPLICATION_KEY,
//       },
//     })
//   : null;

// const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;


// const STORAGE_ROOT = process.env.PDF_STORAGE_ROOT || path.join(__dirname, '../../storage');
// const BOOKS_DIR = path.join(STORAGE_ROOT, 'books');
// const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');

// function ensureDirs() {
//   fs.mkdirSync(BOOKS_DIR, { recursive: true });
//   fs.mkdirSync(COVERS_DIR, { recursive: true });
// }
// ensureDirs();

// function generateStoredName(originalExt) {
//   return `${crypto.randomUUID()}${originalExt}`;
// }

// function bookAbsolutePath(relativePath) {
//   // relativePath is always "books/<name>" as stored in books.pdf_path
//   const resolved = path.resolve(STORAGE_ROOT, relativePath);
//   if (!resolved.startsWith(BOOKS_DIR)) {
//     throw new Error('Resolved path escapes the books storage directory.');
//   }
//   return resolved;
// }

// function deleteIfExists(absolutePath) {
//   fs.promises.unlink(absolutePath).catch(() => {
//     // Already gone or never existed — not a failure condition here.
//   });
// }


// async function uploadToB2(key, body, contentType = 'application/pdf') {
//   if (!b2Client) {
//     throw new Error('Backblaze B2 is not configured.');
//   }

//   await b2Client.send(
//     new PutObjectCommand({
//       Bucket: B2_BUCKET_NAME,
//       Key: key,
//       Body: body,
//       ContentType: contentType,
//     })
//   );
// }

// async function downloadFromB2(key) {
//   if (!b2Client) {
//     throw new Error('Backblaze B2 is not configured.');
//   }

//   const response = await b2Client.send(
//     new GetObjectCommand({
//       Bucket: B2_BUCKET_NAME,
//       Key: key,
//     })
//   );

//   const chunks = [];

//   for await (const chunk of response.Body) {
//     chunks.push(chunk);
//   }

//   return Buffer.concat(chunks);
// }

// async function deleteFromB2(key) {
//   if (!b2Client) {
//     throw new Error('Backblaze B2 is not configured.');
//   }

//   await b2Client.send(
//     new DeleteObjectCommand({
//       Bucket: B2_BUCKET_NAME,
//       Key: key,
//     })
//   );
// }



// module.exports = {
//   STORAGE_ROOT,
//   BOOKS_DIR,
//   COVERS_DIR,
//   generateStoredName,
//   bookAbsolutePath,
//   deleteIfExists,

//   uploadToB2,
//   downloadFromB2,
//   deleteFromB2,
//   USE_B2,
// };


//3RD CODE IF NOT WORK THEN 2ND CODE THEN 1ST CODE

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');


const STORAGE_ROOT = process.env.PDF_STORAGE_ROOT || path.join(__dirname, '../../storage');
const BOOKS_DIR = path.join(STORAGE_ROOT, 'books');
const COVERS_DIR = path.join(STORAGE_ROOT, 'covers');


const USE_B2 = Boolean(
  process.env.B2_ENDPOINT &&
  process.env.B2_REGION &&
  process.env.B2_BUCKET_NAME &&
  process.env.B2_KEY_ID &&
  process.env.B2_APPLICATION_KEY
);

const b2Client = USE_B2
  ? new S3Client({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
      },
    })
  : null;

const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

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


async function uploadToB2(key, body, contentType = 'application/pdf') {
  if (!b2Client) {
    throw new Error('Backblaze B2 is not configured.');
  }

  await b2Client.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

async function downloadFromB2(key) {
  if (!b2Client) {
    throw new Error('Backblaze B2 is not configured.');
  }

  const response = await b2Client.send(
    new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
    })
  );

  const chunks = [];

  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function deleteFromB2(key) {
  if (!b2Client) {
    throw new Error('Backblaze B2 is not configured.');
  }

  await b2Client.send(
    new DeleteObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
    })
  );
}



module.exports = {
  STORAGE_ROOT,
  BOOKS_DIR,
  COVERS_DIR, 
  uploadToB2,
  downloadFromB2,
  deleteFromB2,
  generateStoredName,
  bookAbsolutePath,
  deleteIfExists,
  USE_B2,
 
};

