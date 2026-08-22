// src/controllers/book.controller.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bookModel = require('../models/book.model');
const pdfService = require('../services/pdf.service');
const storageService = require('../services/storage.service');
const pdfDeliveryService = require('../services/pdfDelivery.service');




// async function uploadPdfToB2(localPath) {
//   const key = `books/${crypto.randomUUID()}.pdf`;

//   const fileBuffer = await fs.promises.readFile(localPath);

//   await storageService.uploadToB2(
//     key,
//     fileBuffer,
//     'application/pdf'
//   );

//   return key;
// }



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

  console.log('PDF FILE:', pdfFile);
console.log('PDF EXISTS:', fs.existsSync(pdfFile?.path));
console.log('PDF PATH:', pdfFile?.path);

console.log('COVER FILE:', coverFile);
console.log(
  'COVER EXISTS:',
  coverFile ? fs.existsSync(coverFile.path) : 'no cover'
);

  if (!pdfFile) {
    throw new BadRequestError('A PDF file is required.');
  }

  //let pageCount;
  // try {
  //   pageCount = await pdfService.getPageCount(pdfFile.path);
  // } catch (err) {
  //   storageService.deleteIfExists(pdfFile.path);
  //   if (coverFile) storageService.deleteIfExists(coverFile.path);
  //   throw new BadRequestError('The uploaded file is not a valid PDF.');
  // }

  let pageCount;
let pdfBytes;
 console.log('PDF FILE:', pdfFile);
console.log('PDF EXISTS:', fs.existsSync(pdfFile?.path));
console.log('PDF PATH:', pdfFile?.path);
// let pageCount;
// let pdfBytes;

try {
  console.log('STEP 1: About to read PDF');
  console.log('PDF path:', pdfFile.path);

  const result = await pdfService.readPdfAndGetPageCount(
    pdfFile.path
  );

  console.log('STEP 2: PDF read successfully');

  pageCount = result.pageCount;
  pdfBytes = result.bytes;

  console.log('STEP 3: Page count:', pageCount);
  console.log('STEP 4: PDF bytes:', pdfBytes.length);
} catch (err) {
  console.error('PDF READ/PARSE ERROR:', err);

  storageService.deleteIfExists(pdfFile.path);

  if (coverFile) {
    storageService.deleteIfExists(coverFile.path);
  }

  throw new BadRequestError(
    'The uploaded file is not a valid PDF.'
  );
}

let pdfRelativePath;

try {
  console.log('STEP 5: About to upload PDF to Backblaze B2');
  console.log('B2 enabled:', storageService.USE_B2);

  pdfRelativePath = await uploadPdfToB2(pdfBytes);

  console.log('STEP 6: PDF uploaded to B2 successfully');
  console.log('B2 PDF key:', pdfRelativePath);

  
} catch (err) {
  console.error('B2 UPLOAD ERROR:', err);

  storageService.deleteIfExists(pdfFile.path);

  if (coverFile) {
    storageService.deleteIfExists(coverFile.path);
  }

  throw new Error(
    'Failed to store the PDF. Please try again.'
  );
}



// The PDF is now safely stored in B2.
// Remove the temporary local copy.
storageService.deleteIfExists(pdfFile.path);



const coverRelativePath = coverFile
  ? path.join('covers', path.basename(coverFile.path))
  : null;
console.log('STEP 7: About to save book in Neon');
console.log('PDF path being saved:', pdfRelativePath);

  const book = await bookModel.create({
    title,
    author,
    description,
    categoryId: categoryId ? Number(categoryId) : null,
    coverPath: coverRelativePath,
    pdfPath: pdfRelativePath,
    pageCount,
  });

  console.log('STEP 8: Book saved successfully in Neon');
console.log('Created book:', book);

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
    const result =
  await pdfService.readPdfAndGetPageCount(
    pdfFile.path
  );

pageCount = result.pageCount;

newPdfKey =
  await uploadPdfToB2(result.bytes);
  } catch (err) {
    storageService.deleteIfExists(
      pdfFile.path
    );

    throw new BadRequestError(
      'The uploaded file is not a valid PDF.'
    );
  }

  let newPdfKey;

  try {
    newPdfKey =
      await uploadPdfToB2(
        pdfFile.path
      );
  } catch (err) {
    storageService.deleteIfExists(
      pdfFile.path
    );

    console.error(
      'Failed to upload replacement PDF to Backblaze B2:',
      err
    );

    throw new Error(
      'Failed to store the replacement PDF. Please try again.'
    );
  }

  // Remove temporary local copy.
  storageService.deleteIfExists(
    pdfFile.path
  );

  // Delete old PDF from B2.
  if (
    existing.pdf_path &&
    storageService.USE_B2
  ) {
    try {
      await storageService.deleteFromB2(
        existing.pdf_path
      );
    } catch (err) {
      console.error(
        'Failed to delete old PDF from B2:',
        err
      );
    }
  }

  fields.pdf_path = newPdfKey;
  fields.page_count = pageCount;

  pdfDeliveryService.invalidatePreviewCache(
    existing.id
  );
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

// async function remove(req, res) {
//   const existing = await bookModel.findByIdAdmin(req.params.id);
//   if (!existing) throw new NotFoundError('Book not found.');

//   if (existing.pdf_path) {
//     storageService.deleteIfExists(storageService.bookAbsolutePath(existing.pdf_path));
//   }
//   if (existing.cover_path) {
//     storageService.deleteIfExists(path.join(storageService.STORAGE_ROOT, existing.cover_path));
//   }
//   pdfDeliveryService.invalidatePreviewCache(existing.id);

//   await bookModel.remove(req.params.id);
//   res.json({ message: 'Book deleted.' });
// }

async function remove(req, res) {
  const existing =
    await bookModel.findByIdAdmin(
      req.params.id
    );

  if (!existing) {
    throw new NotFoundError(
      'Book not found.'
    );
  }

  // Delete PDF from Backblaze B2.
  if (
    existing.pdf_path &&
    storageService.USE_B2
  ) {
    try {
      await storageService.deleteFromB2(
        existing.pdf_path
      );
    } catch (err) {
      console.error(
        'Failed to delete PDF from Backblaze B2:',
        err
      );
    }
  }

  // Delete cover from local storage.
  if (existing.cover_path) {
    storageService.deleteIfExists(
      path.join(
        storageService.STORAGE_ROOT,
        existing.cover_path
      )
    );
  }

  pdfDeliveryService.invalidatePreviewCache(
    existing.id
  );

  await bookModel.remove(
    req.params.id
  );

  res.json({
    message: 'Book deleted.',
  });
}
module.exports = { list, getOne, create, update, remove };
