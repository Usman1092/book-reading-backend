// src/controllers/reading.controller.js
   
//**** 1ST CODE */

// const fs = require('fs');
// const bookModel = require('../models/book.model');
// const readingProgressModel = require('../models/readingProgress.model');
// const accessService = require('../services/access.service');
// const pdfDeliveryService = require('../services/pdfDelivery.service');

// class NotFoundError extends Error {
//   constructor(msg) {
//     super(msg);
//     this.status = 404;
//   }
// }
// class ForbiddenError extends Error {
//   constructor(msg) {
//     super(msg);
//     this.status = 403;
//   }
// }

// async function loadActiveBookOrThrow(bookId) {
//   const book = await bookModel.findByIdAdmin(bookId); // includes pdf_path
//   if (!book || !book.is_active) throw new NotFoundError('Book not found.');
//   return book;
// }

// // GET /api/books/:id/access — what can this user do with this book?
// async function getAccess(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const access = await accessService.resolveAccess(req.user?.id || null, book);

//   res.json({
//     bookId: book.id,
//     pageCount: book.page_count,
//     accessLevel: access.level, // 'preview' | 'full'
//     allowedPages: access.allowedPages,
//     expiresAt: access.expiresAt,
//     message:
//       access.level === 'preview'
//         ? "You're reading the free preview. The first 3 pages of every book are available for free."
//         : undefined,
//   });
// }

// // GET /api/books/:id/pdf — the actual protected content. Server-side
// // enforced: a preview user physically never receives page 4 onward (see
// // pdfDelivery.service.js), regardless of what the frontend does.
// async function getPdf(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const access = await accessService.resolveAccess(req.user?.id || null, book);

//   const deliverablePath = await pdfDeliveryService.resolveDeliverablePath(book, access.level);

//   res.set({
//     'Content-Type': 'application/pdf',
//     'Content-Disposition': 'inline; filename="document.pdf"', // never leaks the real title/original filename
//     'Cache-Control': 'no-store',
//     'X-Access-Level': access.level,
//   });

//   const stream = fs.createReadStream(deliverablePath);
//   stream.on('error', () => res.status(500).end());
//   stream.pipe(res);
// }

// // GET /api/books/:id/progress
// async function getProgress(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const progress = await readingProgressModel.get(req.user.id, book.id);
//   res.json({
//     bookId: book.id,
//     lastPage: progress?.last_page || null,
//     percent: progress?.percent || 0,
//     updatedAt: progress?.updated_at || null,
//   });
// }

// // POST /api/books/:id/progress  { page }
// async function postProgress(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const access = await accessService.resolveAccess(req.user.id, book);

//   const requestedPage = Number(req.body.page);
//   if (!Number.isInteger(requestedPage) || requestedPage < 1) {
//     const err = new Error('page must be a positive integer.');
//     err.status = 400;
//     throw err;
//   }

//   // Never trust the client's page number beyond what resolveAccess allows
//   // — clamp to the actual allowed boundary for this user/book.
//   if (requestedPage > access.allowedPages) {
//     throw new ForbiddenError(
//       access.level === 'preview'
//         ? "You've reached the free preview limit. Subscribe or get access to continue reading this book."
//         : 'Your access to this book has expired.'
//     );
//   }

//   const progress = await readingProgressModel.upsert(req.user.id, book.id, requestedPage, book.page_count);
//   res.json({ bookId: book.id, lastPage: progress.last_page, percent: progress.percent });
// }

// module.exports = { getAccess, getPdf, getProgress, postProgress };




// 2ND CODE IF NOT WORK GO TO 1ST CODE


// const bookModel = require('../models/book.model');
// const readingProgressModel = require('../models/readingProgress.model');
// const accessService = require('../services/access.service');
// const pdfDeliveryService = require('../services/pdfDelivery.service');

// class NotFoundError extends Error {
//   constructor(msg) {
//     super(msg);
//     this.status = 404;
//   }
// }
// class ForbiddenError extends Error {
//   constructor(msg) {
//     super(msg);
//     this.status = 403;
//   }
// }

// async function loadActiveBookOrThrow(bookId) {
//   const book = await bookModel.findByIdAdmin(bookId); // includes pdf_path
//   if (!book || !book.is_active) throw new NotFoundError('Book not found.');
//   return book;
// }

// // GET /api/books/:id/access — what can this user do with this book?
// async function getAccess(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const access = await accessService.resolveAccess(req.user?.id || null, book);

//   res.json({
//     bookId: book.id,
//     pageCount: book.page_count,
//     accessLevel: access.level, // 'preview' | 'full'
//     allowedPages: access.allowedPages,
//     expiresAt: access.expiresAt,
//     message:
//       access.level === 'preview'
//         ? "You're reading the free preview. The first 3 pages of every book are available for free."
//         : undefined,
//   });
// }

// // GET /api/books/:id/pdf — the actual protected content. Server-side
// // enforced: a preview user physically never receives page 4 onward (see
// // pdfDelivery.service.js), regardless of what the frontend does.

// // async function getPdf(req, res) {
// //   const book = await loadActiveBookOrThrow(req.params.id);
// //   const access = await accessService.resolveAccess(req.user?.id || null, book);

// // const deliverable =
// //   await pdfDeliveryService.resolveDeliverable(
// //     book,
// //     access.level
// //   );

// //   res.set({
// //     'Content-Type': 'application/pdf',
// //     'Content-Disposition': 'inline; filename="document.pdf"', // never leaks the real title/original filename
// //     'Cache-Control': 'no-store',
// //     'X-Access-Level': access.level,
// //   });

// //   res.send(deliverable.buffer);
// // }

// // async function getPdf(req, res) {
// //   const book =
// //     await loadActiveBookOrThrow(req.params.id);

// //   const access =
// //     await accessService.resolveAccess(
// //       req.user?.id || null,
// //       book
// //     );

// //   // const deliverable =
// //   //   await pdfDeliveryService.resolveDeliverable(
// //   //     book,
// //   //     access.level
// //   //   );

// //   const stream = fs.createReadStream(deliverablePath);
// // stream.pipe(res);

// //   res.set({
// //     'Content-Type': 'application/pdf',

// //     'Content-Disposition':
// //       'inline; filename="document.pdf"',

// //     'Cache-Control': 'no-store',

// //     'X-Access-Level':
// //       access.level,
// //   });

// //   res.send(deliverable.buffer);
// // }


// async function getPdf(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);

//   const access = await accessService.resolveAccess(
//     req.user?.id || null,
//     book
//   );

//   const pdfBuffer =
//     await pdfDeliveryService.getDeliverableBuffer(
//       book,
//       access.level
//     );

//   res.set({
//     'Content-Type': 'application/pdf',
//     'Content-Disposition':
//       'inline; filename="document.pdf"',
//     'Cache-Control': 'no-store',
//     'X-Access-Level': access.level,
//     'Content-Length': pdfBuffer.length,
//   });

//   res.send(pdfBuffer);
// }
// // GET /api/books/:id/progress
// async function getProgress(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const progress = await readingProgressModel.get(req.user.id, book.id);
//   res.json({
//     bookId: book.id,
//     lastPage: progress?.last_page || null,
//     percent: progress?.percent || 0,
//     updatedAt: progress?.updated_at || null,
//   });
// }

// // POST /api/books/:id/progress  { page }
// async function postProgress(req, res) {
//   const book = await loadActiveBookOrThrow(req.params.id);
//   const access = await accessService.resolveAccess(req.user.id, book);

//   const requestedPage = Number(req.body.page);
//   if (!Number.isInteger(requestedPage) || requestedPage < 1) {
//     const err = new Error('page must be a positive integer.');
//     err.status = 400;
//     throw err;
//   }

//   // Never trust the client's page number beyond what resolveAccess allows
//   // — clamp to the actual allowed boundary for this user/book.
//   if (requestedPage > access.allowedPages) {
//     throw new ForbiddenError(
//       access.level === 'preview'
//         ? "You've reached the free preview limit. Subscribe or get access to continue reading this book."
//         : 'Your access to this book has expired.'
//     );
//   }

//   const progress = await readingProgressModel.upsert(req.user.id, book.id, requestedPage, book.page_count);
//   res.json({ bookId: book.id, lastPage: progress.last_page, percent: progress.percent });
// }

// module.exports = { getAccess, getPdf, getProgress, postProgress };






const bookModel = require('../models/book.model');
const readingProgressModel = require('../models/readingProgress.model');
const accessService = require('../services/access.service');
const pdfDeliveryService = require('../services/pdfDelivery.service');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 404;
  }
}

class ForbiddenError extends Error {
  constructor(msg) {
    super(msg);
    this.status = 403;
  }
}

async function loadActiveBookOrThrow(bookId) {
  const book = await bookModel.findByIdAdmin(bookId);

  if (!book || !book.is_active) {
    throw new NotFoundError('Book not found.');
  }

  return book;
}

// GET /api/books/:id/access
async function getAccess(req, res) {
  const book = await loadActiveBookOrThrow(req.params.id);

  const access = await accessService.resolveAccess(
    req.user?.id || null,
    book
  );

  res.json({
    bookId: book.id,
    pageCount: book.page_count,
    accessLevel: access.level,
    allowedPages: access.allowedPages,
    expiresAt: access.expiresAt,
    message:
      access.level === 'preview'
        ? "You're reading the free preview. The first 3 pages of every book are available for free."
        : undefined,
  });
}

// GET /api/books/:id/pdf
async function getPdf(req, res) {
  console.log('PDF REQUEST START');
  console.log('Book ID:', req.params.id);

  const book = await loadActiveBookOrThrow(req.params.id);

  console.log('Book loaded:', book.id);
  console.log('PDF path:', book.pdf_path);

  const access = await accessService.resolveAccess(
    req.user?.id || null,
    book
  );

  console.log('Access level:', access.level);
  console.log('Allowed pages:', access.allowedPages);

  const pdfBuffer =
    await pdfDeliveryService.getDeliverableBuffer(
      book,
      access.level
    );

  console.log(
    'PDF delivered successfully. Bytes:',
    pdfBuffer.length
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="document.pdf"',
    'Cache-Control': 'no-store',
    'X-Access-Level': access.level,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
}

// GET /api/books/:id/progress
async function getProgress(req, res) {
  const book = await loadActiveBookOrThrow(req.params.id);

  const progress = await readingProgressModel.get(
    req.user.id,
    book.id
  );

  res.json({
    bookId: book.id,
    lastPage: progress?.last_page || null,
    percent: progress?.percent || 0,
    updatedAt: progress?.updated_at || null,
  });
}

// POST /api/books/:id/progress
async function postProgress(req, res) {
  const book = await loadActiveBookOrThrow(req.params.id);

  const access = await accessService.resolveAccess(
    req.user.id,
    book
  );

  const requestedPage = Number(req.body.page);

  if (
    !Number.isInteger(requestedPage) ||
    requestedPage < 1
  ) {
    const err = new Error(
      'page must be a positive integer.'
    );

    err.status = 400;
    throw err;
  }

  if (requestedPage > access.allowedPages) {
    throw new ForbiddenError(
      access.level === 'preview'
        ? "You've reached the free preview limit. Subscribe or get access to continue reading this book."
        : 'Your access to this book has expired.'
    );
  }

  const progress =
    await readingProgressModel.upsert(
      req.user.id,
      book.id,
      requestedPage,
      book.page_count
    );

  res.json({
    bookId: book.id,
    lastPage: progress.last_page,
    percent: progress.percent,
  });
}

module.exports = {
  getAccess,
  getPdf,
  getProgress,
  postProgress,
};
