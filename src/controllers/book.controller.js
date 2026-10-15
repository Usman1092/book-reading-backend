// 






// is code say book upload karty time cashe main store ho jayi gi aur user fast access hogi.
// src/controllers/book.controller.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bookModel = require('../models/book.model');
const pdfService = require('../services/pdf.service');
const storageService = require('../services/storage.service');
const pdfDeliveryService = require('../services/pdfDelivery.service');

// === NEW: CACHE WARMING FUNCTION - Pehli baar ko tez karne ke liye ===
function warmCloudflareCache(cdnUrl) {
  if (!cdnUrl) return;
  // Background mein Cloudflare ko hit karo, user ka wait khatam
  // fetch ko await nahi kiya taake upload slow na ho
  try {
    console.log(`[CACHE WARM] Warming cache for: ${cdnUrl}`);
    fetch(cdnUrl, { method: 'GET', headers: { 'User-Agent': 'Cache-Warmer/1.0' } })
     .then(res => console.log(`[CACHE WARM] Success: ${res.status} for ${cdnUrl}`))
     .catch(err => console.log(`[CACHE WARM] Failed (normal if cold): ${err.message}`));
  } catch (e) {
    console.log('[CACHE WARM] Error:', e.message);
  }
}
// === END NEW FUNCTION ===

async function uploadPdfToB2(fileBuffer) {
  const key = `books/${crypto.randomUUID()}.pdf`;
  await storageService.uploadToB2(
    key,
    fileBuffer,
    'application/pdf'
  );
  return key;
}

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 404;
  }
}
class BadRequestError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 400;
  }
}

// --- Public ---
async function readBook(req, res) {
  const book = await bookModel.findByIdPublic(req.params.id);
  if (!book ||!book.is_active) throw new NotFoundError('Book not found.');

  const accessLevel = req.query.preview === 'true'? 'preview' : 'full';

  if (accessLevel === 'full') {
    const cdnUrl = pdfDeliveryService.getCdnUrlForBook(book);
    return res.json({
      url: cdnUrl,
      pageCount: book.page_count,
      accessLevel: 'full'
    });
  } else {
    const buffer = await pdfDeliveryService.getDeliverableBuffer(book, 'preview');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    return res.send(buffer);
  }
}

async function list(req, res) {
  const { search, categoryId, sort, page, pageSize } = req.query;
  const result = await bookModel.listPublic({
    search: search?.trim() || undefined,
    categoryId: categoryId? Number(categoryId) : undefined,
    sort,
    page: page? Number(page) : 1,
    pageSize: pageSize? Math.min(Number(pageSize), 50) : 20,
  });
  res.json(result);
}

async function getOne(req, res) {
  const book = await bookModel.findByIdPublic(req.params.id);
  if (!book ||!book.is_active) throw new NotFoundError('Book not found.');
  res.json({ book });
}

// --- Admin ---
async function create(req, res) {
  const { title, author, description, categoryId } = req.body;
  const pdfFile = req.files?.pdf?.[0];
  const coverFile = req.files?.cover?.[0];

  if (!pdfFile) {
    throw new BadRequestError('A PDF file is required.');
  }

  let pageCount;
  let pdfBytes;

  try {
    console.log('STEP 1: About to read PDF');
    const result = await pdfService.readPdfAndGetPageCount(pdfFile.path);
    console.log('STEP 2: PDF read successfully');
    pageCount = result.pageCount;
    pdfBytes = result.bytes;
    console.log('STEP 3: Page count:', pageCount);
  } catch (err) {
    console.error('PDF READ/PARSE ERROR:', err);
    storageService.deleteIfExists(pdfFile.path);
    if (coverFile) storageService.deleteIfExists(coverFile.path);
    throw new BadRequestError('The uploaded file is not a valid PDF.');
  }

  let pdfRelativePath;
  try {
    console.log('STEP 5: About to upload PDF to Backblaze B2');
    pdfRelativePath = await uploadPdfToB2(pdfBytes);
    console.log('STEP 6: PDF uploaded to B2 successfully:', pdfRelativePath);
  } catch (err) {
    console.error('B2 UPLOAD ERROR:', err);
    storageService.deleteIfExists(pdfFile.path);
    if (coverFile) storageService.deleteIfExists(coverFile.path);
    throw new Error('Failed to store the PDF. Please try again.');
  }

  storageService.deleteIfExists(pdfFile.path);

  const coverRelativePath = coverFile
   ? path.join('covers', path.basename(coverFile.path))
    : null;

  console.log('STEP 7: About to save book in Neon');
  const book = await bookModel.create({
    title,
    author,
    description,
    categoryId: categoryId? Number(categoryId) : null,
    coverPath: coverRelativePath,
    pdfPath: pdfRelativePath,
    pageCount,
  });

  console.log('STEP 8: Book saved successfully in Neon');

  // === NEW: CACHE WARMING AFTER CREATE ===
  // Jaise hi book upload hui, Cloudflare cache garam kar do
  try {
    const cdnUrl = pdfDeliveryService.getCdnUrlForBook(book);
    warmCloudflareCache(cdnUrl);
  } catch (e) {
    console.log('Cache warm skip:', e.message);
  }

  res.status(201).json({ book });
}

async function update(req, res) {
  const existing = await bookModel.findByIdAdmin(req.params.id);
  if (!existing) throw new NotFoundError('Book not found.');

  const { title, author, description, categoryId, isActive } = req.body;
  const pdfFile = req.files?.pdf?.[0];
  const coverFile = req.files?.cover?.[0];

  const fields = {};
  if (title!== undefined) fields.title = title;
  if (author!== undefined) fields.author = author;
  if (description!== undefined) fields.description = description;
  if (categoryId!== undefined) fields.category_id = categoryId? Number(categoryId) : null;
  if (isActive!== undefined) fields.is_active = isActive === 'true' || isActive === true;

  if (pdfFile) {
    let pageCount;
    let newPdfKey;
    try {
      const result = await pdfService.readPdfAndGetPageCount(pdfFile.path);
      pageCount = result.pageCount;
      newPdfKey = await uploadPdfToB2(result.bytes);
      console.log('Replacement PDF uploaded to B2:', newPdfKey);
    } catch (err) {
      storageService.deleteIfExists(pdfFile.path);
      console.error('PDF replacement/upload error:', err);
      throw new BadRequestError('Failed to process and store the replacement PDF.');
    }
    storageService.deleteIfExists(pdfFile.path);
    if (existing.pdf_path && storageService.USE_B2) {
      try {
        await storageService.deleteFromB2(existing.pdf_path);
      } catch (err) {
        console.error('Failed to delete old PDF from B2:', err);
      }
    }
    fields.pdf_path = newPdfKey;
    fields.page_count = pageCount;
    pdfDeliveryService.invalidatePreviewCache(existing.id);
  }

  if (coverFile) {
    fields.cover_path = path.join('covers', path.basename(coverFile.path));
    if (existing.cover_path) {
      storageService.deleteIfExists(path.join(storageService.STORAGE_ROOT, existing.cover_path));
    }
  }

  const book = await bookModel.update(req.params.id, fields);

  // === NEW: CACHE WARMING AFTER UPDATE ===
  if (fields.pdf_path) {
    try {
      const cdnUrl = pdfDeliveryService.getCdnUrlForBook(book);
      warmCloudflareCache(cdnUrl);
    } catch (e) {}
  }

  res.json({ book });
}

async function remove(req, res) {
  const existing = await bookModel.findByIdAdmin(req.params.id);
  if (!existing) throw new NotFoundError('Book not found.');
  if (existing.pdf_path && storageService.USE_B2) {
    try {
      await storageService.deleteFromB2(existing.pdf_path);
    } catch (err) {
      console.error('Failed to delete PDF from Backblaze B2:', err);
    }
  }
  if (existing.cover_path) {
    storageService.deleteIfExists(path.join(storageService.STORAGE_ROOT, existing.cover_path));
  }
  pdfDeliveryService.invalidatePreviewCache(existing.id);
  await bookModel.remove(req.params.id);
  res.json({ message: 'Book deleted.' });
}

module.exports = { list, getOne, create, update, remove, readBook };