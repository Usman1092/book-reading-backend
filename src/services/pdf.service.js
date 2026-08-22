// src/services/pdf.service.js
// page_count is always computed server-side from the actual uploaded
// file — never accepted from the client — so preview/expiry page-boundary
// checks can't be fooled by a mismatched value.

// const fs = require('fs');
// const { PDFDocument } = require('pdf-lib');

// async function getPageCount(absolutePdfPath) {
//   const bytes = await fs.promises.readFile(absolutePdfPath);
//   const doc = await PDFDocument.load(bytes, { updateMetadata: false });
//   return doc.getPageCount();
// }

// module.exports = { getPageCount };



//2nd code if not works go to the first code above
// src/services/pdf.service.js

// Reads the uploaded PDF once, calculates the page count,
// and returns the PDF bytes so the same bytes can be uploaded
// to Backblaze B2 without reading the temporary file again.

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function readPdfAndGetPageCount(absolutePdfPath) {
  const bytes = await fs.promises.readFile(absolutePdfPath);

  const doc = await PDFDocument.load(bytes, {
    updateMetadata: false,
  });

  return {
    bytes,
    pageCount: doc.getPageCount(),
  };
}

async function getPageCount(absolutePdfPath) {
  const result = await readPdfAndGetPageCount(absolutePdfPath);
  return result.pageCount;
}

module.exports = {
  getPageCount,
  readPdfAndGetPageCount,
};