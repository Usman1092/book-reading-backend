// src/controllers/book.controller.js

const path = require('path');
const bookModel = require('../models/book.model');
const pdfService = require('../services/pdf.service');
const storageService = require('../services/storage.service');
const pdfDeliveryService = require('../services/pdfDelivery.service');

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

async function list(req, res) {
  const { search, categoryId, sort, page, pageSize } = req.query;
  const result = await bookModel.listPublic({
    search: search?.trim() || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    sort,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Math.min(Number(pageSize), 50) : 20,
  });
  res.json(result);
}

async function getOne(req, res) {
  const book = await bookModel.findByIdPublic(req.params.id);
  if (!book || !book.is_active) throw new NotFoundError('Book not found.');
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
  try {
    pageCount = await pdfService.getPageCount(pdfFile.path);
  } catch (err) {
    storageService.deleteIfExists(pdfFile.path);
    if (coverFile) storageService.deleteIfExists(coverFile.path);
    throw new BadRequestError('The uploaded file is not a valid PDF.');
  }

  const pdfRelativePath = path.join('books', path.basename(pdfFile.path));
  const coverRelativePath = coverFile ? path.join('covers', path.basename(coverFile.path)) : null;

  const book = await bookModel.create({
    title,
    author,
    description,
    categoryId: categoryId ? Number(categoryId) : null,
    coverPath: coverRelativePath,
    pdfPath: pdfRelativePath,
    pageCount,
  });

  res.status(201).json({ book });
}

async function update(req, res) {
  const existing = await bookModel.findByIdAdmin(req.params.id);
  if (!existing) throw new NotFoundError('Book not found.');

  const { title, author, description, categoryId, isActive } = req.body;
  const pdfFile = req.files?.pdf?.[0];
  const coverFile = req.files?.cover?.[0];

  const fields = {};
  if (title !== undefined) fields.title = title;
  if (author !== undefined) fields.author = author;
  if (description !== undefined) fields.description = description;
  if (categoryId !== undefined) fields.category_id = categoryId ? Number(categoryId) : null;
  if (isActive !== undefined) fields.is_active = isActive === 'true' || isActive === true;

  // Replacing the PDF: validate, compute new page count, delete the old file.
  if (pdfFile) {
    let pageCount;
    try {
      pageCount = await pdfService.getPageCount(pdfFile.path);
    } catch (err) {
      storageService.deleteIfExists(pdfFile.path);
      throw new BadRequestError('The uploaded file is not a valid PDF.');
    }
    fields.pdf_path = path.join('books', path.basename(pdfFile.path));
    fields.page_count = pageCount;
    if (existing.pdf_path) {
      storageService.deleteIfExists(storageService.bookAbsolutePath(existing.pdf_path));
    }
    pdfDeliveryService.invalidatePreviewCache(existing.id);
  }

  if (coverFile) {
    fields.cover_path = path.join('covers', path.basename(coverFile.path));
    // Old cover cleanup is best-effort; covers live under COVERS_DIR directly.
    if (existing.cover_path) {
      storageService.deleteIfExists(path.join(storageService.STORAGE_ROOT, existing.cover_path));
    }
  }

  const book = await bookModel.update(req.params.id, fields);
  res.json({ book });
}

async function remove(req, res) {
  const existing = await bookModel.findByIdAdmin(req.params.id);
  if (!existing) throw new NotFoundError('Book not found.');

  if (existing.pdf_path) {
    storageService.deleteIfExists(storageService.bookAbsolutePath(existing.pdf_path));
  }
  if (existing.cover_path) {
    storageService.deleteIfExists(path.join(storageService.STORAGE_ROOT, existing.cover_path));
  }
  pdfDeliveryService.invalidatePreviewCache(existing.id);

  await bookModel.remove(req.params.id);
  res.json({ message: 'Book deleted.' });
}

module.exports = { list, getOne, create, update, remove };
