// src/controllers/me.controller.js
// Endpoints scoped to req.user.id only — a user can never pass another
// user's id here, unlike the admin equivalents in admin.controller.js.

const readingProgressModel = require('../models/readingProgress.model');
const bookAccessModel = require('../models/bookAccess.model');
const subscriptionModel = require('../models/subscription.model');
const paymentModel = require('../models/payment.model');

async function readingProgress(req, res) {
  const items = await readingProgressModel.recentForUser(req.user.id, 20);
  res.json({ items });
}

async function bookAccess(req, res) {
  const items = await bookAccessModel.listForUser(req.user.id);
  res.json({ items });
}

async function subscription(req, res) {
  const active = await subscriptionModel.findActiveForUser(req.user.id);
  res.json({ subscription: active });
}

async function payments(req, res) {
  const items = await paymentModel.listForUser(req.user.id);
  res.json({ items });
}

module.exports = { readingProgress, bookAccess, subscription, payments };
