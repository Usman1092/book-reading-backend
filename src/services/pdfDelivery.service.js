// src/services/pdfDelivery.service.js
//
// For 'full' access we stream the stored PDF as-is. For 'preview' access
// we NEVER send the original file — instead we build a genuinely
// truncated PDF containing only the allowed pages (via pdf-lib), so a
// preview user's browser never even receives page 4 onward. The
// truncated preview is identical for every preview user of a given book,
// so it's cached on disk after first generation.


    // ******  1ST CODE***********

// const fs = require('fs');
// const path = require('path');
// const { PDFDocument } = require('pdf-lib');
// const storageService = require('./storage.service');

// const PREVIEWS_DIR = path.join(storageService.STORAGE_ROOT, 'previews');
// fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

// function previewCachePath(bookId, allowedPages) {
//   return path.join(PREVIEWS_DIR, `${bookId}-${allowedPages}.pdf`);
// }

// async function buildTruncatedPdf(sourceAbsolutePath, allowedPages) {
//   const bytes = await fs.promises.readFile(sourceAbsolutePath);
//   const srcDoc = await PDFDocument.load(bytes, { updateMetadata: false });
//   const outDoc = await PDFDocument.create();

//   const pageCount = srcDoc.getPageCount();
//   const indices = Array.from({ length: Math.min(allowedPages, pageCount) }, (_, i) => i);
//   const copiedPages = await outDoc.copyPages(srcDoc, indices);
//   copiedPages.forEach((p) => outDoc.addPage(p));

//   return outDoc.save();
// }

// // Returns an absolute path to a PDF file on disk that is SAFE to send to
// // this particular user for this access level (either the real file, for
// // full access, or a cached/generated truncated copy for preview access).
// async function resolveDeliverablePath(book, accessLevel) {
//   const sourcePath = storageService.bookAbsolutePath(book.pdf_path);

//   if (accessLevel === 'full') {
//     return sourcePath;
//   }

//   // preview
//   const allowedPages = Math.min(3, book.page_count);
//   const cachePath = previewCachePath(book.id, allowedPages);

//   try {
//     await fs.promises.access(cachePath, fs.constants.R_OK);
//     return cachePath; // already cached
//   } catch {
//     // not cached yet — build it
//   }

//   const truncatedBytes = await buildTruncatedPdf(sourcePath, allowedPages);
//   await fs.promises.writeFile(cachePath, truncatedBytes);
//   return cachePath;
// }

// // Call this whenever a book's underlying PDF changes or is deleted, so a
// // stale cached preview is never served for the new file.
// function invalidatePreviewCache(bookId) {
//   fs.promises
//     .readdir(PREVIEWS_DIR)
//     .then((files) => {
//       files
//         .filter((f) => f.startsWith(`${bookId}-`))
//         .forEach((f) => storageService.deleteIfExists(path.join(PREVIEWS_DIR, f)));
//     })
//     .catch(() => {});
// }

// module.exports = { resolveDeliverablePath, invalidatePreviewCache };




//2ND CODE IF IT NOT WORKS UN-COMMENT 1ST CODE

// const fs = require('fs');
// const path = require('path');
// const { PDFDocument } = require('pdf-lib');

// const storageService = require('./storage.service');

// const PREVIEWS_DIR = path.join(
//   storageService.STORAGE_ROOT,
//   'previews'
// );

// fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

// function previewCachePath(bookId, allowedPages) {
//   return path.join(
//     PREVIEWS_DIR,
//     `${bookId}-${allowedPages}.pdf`
//   );
// }

// async function buildTruncatedPdfFromBytes(sourceBytes, allowedPages) {
//   const srcDoc = await PDFDocument.load(sourceBytes, {
//     updateMetadata: false,
//   });

//   const outDoc = await PDFDocument.create();

//   const pageCount = srcDoc.getPageCount();

//   const indices = Array.from(
//     {
//       length: Math.min(allowedPages, pageCount),
//     },
//     (_, i) => i
//   );

//   const copiedPages = await outDoc.copyPages(
//     srcDoc,
//     indices
//   );

//   copiedPages.forEach((page) => {
//     outDoc.addPage(page);
//   });

//   return Buffer.from(await outDoc.save());
// }

// async function getSourcePdfBytes(book) {
//   // Production: retrieve PDF from private Backblaze B2.
//   if (storageService.USE_B2) {
//     return storageService.downloadFromB2(book.pdf_path);
//   }

//   // Local development: retrieve PDF from local filesystem.
//   const sourcePath = storageService.bookAbsolutePath(
//     book.pdf_path
//   );

//   return fs.promises.readFile(sourcePath);
// }

// async function resolveDeliverable(book, accessLevel) {
//   const sourceBytes = await getSourcePdfBytes(book);

//   // FULL ACCESS
//   if (accessLevel === 'full') {
//     return {
//       buffer: sourceBytes,
//       accessLevel: 'full',
//     };
//   }

//   // PREVIEW ACCESS
//   const allowedPages = Math.min(3, book.page_count);

//   const cachePath = previewCachePath(
//     book.id,
//     allowedPages
//   );

//   // Local preview cache
//   if (!storageService.USE_B2) {
//     try {
//       const cached = await fs.promises.readFile(cachePath);

//       return {
//         buffer: cached,
//         accessLevel: 'preview',
//       };
//     } catch {
//       // Cache doesn't exist; generate it below.
//     }
//   }

//   const truncatedBytes =
//     await buildTruncatedPdfFromBytes(
//       sourceBytes,
//       allowedPages
//     );

//   // Cache only during local development.
//   if (!storageService.USE_B2) {
//     await fs.promises.writeFile(
//       cachePath,
//       truncatedBytes
//     );
//   }

//   return {
//     buffer: truncatedBytes,
//     accessLevel: 'preview',
//   };
// }

// function invalidatePreviewCache(bookId) {
//   fs.promises
//     .readdir(PREVIEWS_DIR)
//     .then((files) => {
//       files
//         .filter((f) => f.startsWith(`${bookId}-`))
//         .forEach((f) =>
//           storageService.deleteIfExists(
//             path.join(PREVIEWS_DIR, f)
//           )
//         );
//     })
//     .catch(() => {});
// }

// module.exports = {
//   resolveDeliverable,
//   invalidatePreviewCache,
// };



// src/services/pdfDelivery.service.js
//3rd code if not works then try 2nd code above
// const fs = require('fs');
// const path = require('path');
// const { PDFDocument } = require('pdf-lib');

// const storageService = require('./storage.service');

// const PREVIEWS_DIR = path.join(
//   storageService.STORAGE_ROOT,
//   'previews'
// );

// fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

// function previewCachePath(bookId, allowedPages) {
//   return path.join(
//     PREVIEWS_DIR,
//     `${bookId}-${allowedPages}.pdf`
//   );
// }

// async function buildTruncatedPdfFromBytes(
//   sourceBytes,
//   allowedPages
// ) {
//   const srcDoc = await PDFDocument.load(sourceBytes, {
//     updateMetadata: false,
//   });

//   const outDoc = await PDFDocument.create();

//   const pageCount = srcDoc.getPageCount();

//   const indices = Array.from(
//     {
//       length: Math.min(allowedPages, pageCount),
//     },
//     (_, i) => i
//   );

//   const copiedPages = await outDoc.copyPages(
//     srcDoc,
//     indices
//   );

//   copiedPages.forEach((page) => {
//     outDoc.addPage(page);
//   });

//   return Buffer.from(await outDoc.save());
// }

// async function getSourcePdfBytes(book) {
//   // Production: PDF is stored privately in Backblaze B2.
//   if (storageService.USE_B2) {
//     return storageService.downloadFromB2(book.pdf_path);
//   }

//   // Local development fallback.
//   const sourcePath =
//     storageService.bookAbsolutePath(book.pdf_path);

//   return fs.promises.readFile(sourcePath);
// }

// async function resolveDeliverable(
//   book,
//   accessLevel
// ) {
//   const sourceBytes =
//     await getSourcePdfBytes(book);

//   // ==========================================
//   // FULL ACCESS
//   // ==========================================

//   if (accessLevel === 'full') {
//     return {
//       buffer: sourceBytes,
//       accessLevel: 'full',
//     };
//   }

//   // ==========================================
//   // PREVIEW ACCESS
//   // ==========================================

//   const allowedPages =
//     Math.min(3, book.page_count);

//   const cachePath =
//     previewCachePath(
//       book.id,
//       allowedPages
//     );

//   // Use local preview cache only during
//   // local development.
//   if (!storageService.USE_B2) {
//     try {
//       const cached =
//         await fs.promises.readFile(cachePath);

//       return {
//         buffer: cached,
//         accessLevel: 'preview',
//       };
//     } catch {
//       // Cache doesn't exist.
//     }
//   }

//   // IMPORTANT:
//   // We create the truncated PDF from the
//   // downloaded source bytes.
//   //
//   // A preview user receives ONLY these pages.
//   const truncatedBytes =
//     await buildTruncatedPdfFromBytes(
//       sourceBytes,
//       allowedPages
//     );

//   if (!storageService.USE_B2) {
//     await fs.promises.writeFile(
//       cachePath,
//       truncatedBytes
//     );
//   }

//   return {
//     buffer: truncatedBytes,
//     accessLevel: 'preview',
//   };
// }

// function invalidatePreviewCache(bookId) {
//   fs.promises
//     .readdir(PREVIEWS_DIR)
//     .then((files) => {
//       files
//         .filter((file) =>
//           file.startsWith(`${bookId}-`)
//         )
//         .forEach((file) => {
//           storageService.deleteIfExists(
//             path.join(
//               PREVIEWS_DIR,
//               file
//             )
//           );
//         });
//     })
//     .catch(() => {});
// }

// module.exports = {
//   resolveDeliverable,
//   invalidatePreviewCache,
// };





// src/services/pdfDelivery.service.js

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const storageService = require('./storage.service');

const PREVIEWS_DIR = path.join(
  storageService.STORAGE_ROOT,
  'previews'
);

fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

function previewCachePath(bookId, allowedPages) {
  return path.join(
    PREVIEWS_DIR,
    `${bookId}-${allowedPages}.pdf`
  );
}

async function buildTruncatedPdf(sourceBytes, allowedPages) {
  const srcDoc = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });

  const outDoc = await PDFDocument.create();

  const pageCount = srcDoc.getPageCount();

  const indices = Array.from(
    {
      length: Math.min(allowedPages, pageCount),
    },
    (_, i) => i
  );

  const copiedPages = await outDoc.copyPages(
    srcDoc,
    indices
  );

  copiedPages.forEach((page) => {
    outDoc.addPage(page);
  });

  return outDoc.save();
}

/**
 * Returns a Buffer containing the PDF that the user is
 * actually allowed to receive.
 *
 * Full access:
 *   Downloads the complete PDF from B2.
 *
 * Preview access:
 *   Downloads the PDF from B2, creates a truncated
 *   3-page PDF, and returns only those pages.
 */
async function getDeliverableBuffer(book, accessLevel) {
  if (!storageService.USE_B2) {
    throw new Error('Backblaze B2 storage is not configured.');
  }

  if (!book.pdf_path) {
    throw new Error('Book does not have a PDF path.');
  }

  // Full access
  if (accessLevel === 'full') {
    return await storageService.downloadFromB2(
      book.pdf_path
    );
  }

  // Preview access
  const allowedPages = Math.min(3, book.page_count);

  const cachePath = previewCachePath(
    book.id,
    allowedPages
  );

  // Use local preview cache if it exists.
  try {
    await fs.promises.access(
      cachePath,
      fs.constants.R_OK
    );

    return await fs.promises.readFile(cachePath);
  } catch {
    // Preview does not exist yet.
  }

  // Download original PDF from B2.
  const sourceBytes =
    await storageService.downloadFromB2(
      book.pdf_path
    );

  // Create a genuinely truncated PDF.
  const truncatedBytes =
    await buildTruncatedPdf(
      sourceBytes,
      allowedPages
    );

  // Cache preview locally.
  await fs.promises.writeFile(
    cachePath,
    truncatedBytes
  );

  return truncatedBytes;
}

function invalidatePreviewCache(bookId) {
  fs.promises
    .readdir(PREVIEWS_DIR)
    .then((files) => {
      files
        .filter((file) =>
          file.startsWith(`${bookId}-`)
        )
        .forEach((file) =>
          storageService.deleteIfExists(
            path.join(PREVIEWS_DIR, file)
          )
        );
    })
    .catch(() => {});
}

module.exports = {
  getDeliverableBuffer,
  invalidatePreviewCache,
};