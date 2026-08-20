// src/services/access.service.js
//
// resolveAccess() is the ONLY function in the codebase that decides how
// much of a book a given user may read. Every reading-related route calls
// this — never a frontend-supplied flag, never a page number sent by the
// client. Priority order (see architecture notes from Phase 2):
//
//   1. An active, non-expired admin-assigned book_access grant → FULL
//   2. An active, non-expired subscription                      → FULL
//   3. Otherwise                                                 → PREVIEW (pages 1-3)
//
// Anonymous (unauthenticated) users always resolve to PREVIEW — per the
// spec's "Visitor/User without subscription" scenario.

const FREE_PREVIEW_PAGES = 3;

const bookAccessModel = require('../models/bookAccess.model');
const subscriptionModel = require('../models/subscription.model');

async function resolveAccess(userId, book) {
  if (!userId) {
    return { level: 'preview', allowedPages: Math.min(FREE_PREVIEW_PAGES, book.page_count), expiresAt: null, source: 'anonymous' };
  }

  const grant = await bookAccessModel.findActiveGrant(userId, book.id);
  if (grant) {
    return { level: 'full', allowedPages: book.page_count, expiresAt: grant.end_date, source: 'book_access' };
  }

  const subscription = await subscriptionModel.findActiveForUser(userId);
  if (subscription) {
    return { level: 'full', allowedPages: book.page_count, expiresAt: subscription.end_date, source: 'subscription' };
  }

  return { level: 'preview', allowedPages: Math.min(FREE_PREVIEW_PAGES, book.page_count), expiresAt: null, source: 'none' };
}

module.exports = { resolveAccess, FREE_PREVIEW_PAGES };
