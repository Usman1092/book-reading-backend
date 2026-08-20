// src/controllers/admin.controller.js

const pool = require('../config/db');
const userModel = require('../models/user.model');
const bookAccessModel = require('../models/bookAccess.model');
const readingProgressModel = require('../models/readingProgress.model');
const subscriptionModel = require('../models/subscription.model');

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

// --- Users ---

async function listUsers(req, res) {
  const { search, page, pageSize } = req.query;
  const result = await userModel.listAdmin({
    search: search?.trim() || undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Math.min(Number(pageSize), 100) : 20,
  });
  res.json(result);
}

async function getUser(req, res) {
  const user = await userModel.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found.');

  const [assignedBooks, subscription, readingProgress] = await Promise.all([
    bookAccessModel.listForUser(user.id),
    subscriptionModel.findActiveForUser(user.id),
    readingProgressModel.recentForUser(user.id, 50),
  ]);

  res.json({ user, assignedBooks, subscription, readingProgress });
}

async function setUserActive(req, res) {
  const { isActive } = req.body;
  const user = await userModel.setActive(req.params.id, isActive === true || isActive === 'true');
  if (!user) throw new NotFoundError('User not found.');
  res.json({ user });
}

// --- Book assignment (20-day access grants) ---

async function listBookAccess(req, res) {
  const { status } = req.query;
  const grants = await bookAccessModel.listAll({ status });
  res.json({ grants });
}

async function grantBookAccess(req, res) {
  const { userId, bookId, durationDays } = req.body;
  const grant = await bookAccessModel.grant({
    userId,
    bookId,
    grantedBy: req.user.id,
    durationDays: durationDays ? Number(durationDays) : 20,
  });
  res.status(201).json({ grant });
}

async function revokeBookAccess(req, res) {
  const grant = await bookAccessModel.revoke(req.params.id);
  if (!grant) throw new NotFoundError('Access grant not found.');
  res.json({ grant });
}

async function renewBookAccess(req, res) {
  const { durationDays } = req.body;
  const grant = await bookAccessModel.renew(req.params.id, durationDays ? Number(durationDays) : 20);
  if (!grant) throw new NotFoundError('Access grant not found.');
  res.json({ grant });
}

// --- Dashboard stats ---

async function dashboard(req, res) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM books WHERE is_active) AS total_books,
      (SELECT COUNT(*) FROM categories) AS total_categories,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND end_date >= now()) AS active_subscriptions,
      (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending_payments,
      (SELECT COUNT(*) FROM book_access WHERE status = 'active' AND end_date >= now()) AS active_assignments,
      (SELECT COUNT(*) FROM book_access WHERE status = 'active' AND end_date < now()) AS expired_assignments
  `);

  const stats = rows[0];
  res.json({
    totalUsers: Number(stats.total_users),
    totalBooks: Number(stats.total_books),
    totalCategories: Number(stats.total_categories),
    activeSubscriptions: Number(stats.active_subscriptions),
    pendingPayments: Number(stats.pending_payments),
    activeAssignments: Number(stats.active_assignments),
    expiredAssignments: Number(stats.expired_assignments),
  });
}

module.exports = {
  listUsers,
  getUser,
  setUserActive,
  listBookAccess,
  grantBookAccess,
  revokeBookAccess,
  renewBookAccess,
  dashboard,
};
