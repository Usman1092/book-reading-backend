// src/middleware/errorHandler.js
// Single place all errors funnel through (via asyncHandler → next(err)).
// Never leak raw error messages / stack traces to the client in
// production — log them server-side, return a generic message instead.

function errorHandler(err, req, res, next) {
  // multer errors (wrong MIME type from our fileFilter, size limit exceeded,
  // unexpected field) arrive as plain Errors / MulterError without a
  // .status — map them to a client error instead of a generic 500.
  if (err.name === 'MulterError') {
    const isSizeError = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(isSizeError ? 413 : 400)
      .json({ error: isSizeError ? 'File is too large.' : err.message });
  }

  const status = err.status || (err.message?.includes('Only PDF') || err.message?.includes('Cover image') ? 400 : 500);

  if (status >= 500) {
    console.error(err);
  }

  const message =
    status < 500
      ? err.message
      : 'Something went wrong on our end. Please try again shortly.';

  res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

module.exports = { errorHandler, notFoundHandler };
