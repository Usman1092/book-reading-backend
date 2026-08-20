// src/services/pdf.service.js
// page_count is always computed server-side from the actual uploaded
// file — never accepted from the client — so preview/expiry page-boundary
// checks can't be fooled by a mismatched value.

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function getPageCount(absolutePdfPath) {
  const bytes = await fs.promises.readFile(absolutePdfPath);
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc.getPageCount();
}

module.exports = { getPageCount };
