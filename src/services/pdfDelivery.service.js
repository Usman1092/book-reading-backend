// src/services/pdfDelivery.service.js
//
// For 'full' access we stream the stored PDF as-is. For 'preview' access
// we NEVER send the original file — instead we build a genuinely
// truncated PDF containing only the allowed pages (via pdf-lib), so a
// preview user's browser never even receives page 4 onward. The
// truncated preview is identical for every preview user of a given book,
// so it's cached on disk after first generation.

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const storageService = require('./storage.service');

const PREVIEWS_DIR = path.join(storageService.STORAGE_ROOT, 'previews');
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

function previewCachePath(bookId, allowedPages) {
  return path.join(PREVIEWS_DIR, `${bookId}-${allowedPages}.pdf`);
}

async function buildTruncatedPdf(sourceAbsolutePath, allowedPages) {
  const bytes = await fs.promises.readFile(sourceAbsolutePath);
  const srcDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const outDoc = await PDFDocument.create();

  const pageCount = srcDoc.getPageCount();
  const indices = Array.from({ length: Math.min(allowedPages, pageCount) }, (_, i) => i);
  const copiedPages = await outDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((p) => outDoc.addPage(p));

  return outDoc.save();
}

// Returns an absolute path to a PDF file on disk that is SAFE to send to
// this particular user for this access level (either the real file, for
// full access, or a cached/generated truncated copy for preview access).
async function resolveDeliverablePath(book, accessLevel) {
  const sourcePath = storageService.bookAbsolutePath(book.pdf_path);

  if (accessLevel === 'full') {
    return sourcePath;
  }

  // preview
  const allowedPages = Math.min(3, book.page_count);
  const cachePath = previewCachePath(book.id, allowedPages);

  try {
    await fs.promises.access(cachePath, fs.constants.R_OK);
    return cachePath; // already cached
  } catch {
    // not cached yet — build it
  }

  const truncatedBytes = await buildTruncatedPdf(sourcePath, allowedPages);
  await fs.promises.writeFile(cachePath, truncatedBytes);
  return cachePath;
}

// Call this whenever a book's underlying PDF changes or is deleted, so a
// stale cached preview is never served for the new file.
function invalidatePreviewCache(bookId) {
  fs.promises
    .readdir(PREVIEWS_DIR)
    .then((files) => {
      files
        .filter((f) => f.startsWith(`${bookId}-`))
        .forEach((f) => storageService.deleteIfExists(path.join(PREVIEWS_DIR, f)));
    })
    .catch(() => {});
}

module.exports = { resolveDeliverablePath, invalidatePreviewCache };
