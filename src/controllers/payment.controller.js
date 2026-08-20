// src/controllers/payment.controller.js

const path = require('path');
const paymentModel = require('../models/payment.model');
const planModel = require('../models/subscriptionPlan.model');
const pool = require('../config/db');
const { PROOFS_DIR } = require('../middleware/paymentUpload.middleware');

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

// --- User-facing ---

async function submit(req, res) {
  const { planId, method, referenceNumber, amount } = req.body;

  const plan = await planModel.findById(planId);
  if (!plan || !plan.is_active) throw new BadRequestError('Selected plan is not available.');

  const proofPath = req.file ? path.join('payment-proofs', path.basename(req.file.path)) : null;

  const payment = await paymentModel.create({
    userId: req.user.id,
    planId,
    method,
    referenceNumber,
    amount,
    proofPath,
  });

  res.status(201).json({
    payment,
    message: 'Your payment is awaiting administrator verification.',
  });
}

async function listMine(req, res) {
  const payments = await paymentModel.listForUser(req.user.id);
  res.json({ payments });
}

// --- Admin-facing ---

async function listAdmin(req, res) {
  const { status } = req.query;
  const payments = await paymentModel.listAll({ status });
  res.json({ payments });
}

async function getProof(req, res) {
  const payment = await paymentModel.findById(req.params.id);
  if (!payment || !payment.proof_path) throw new NotFoundError('Payment proof not found.');

  const absolutePath = path.resolve(PROOFS_DIR, '..', payment.proof_path);
  res.set('Cache-Control', 'no-store');
  res.sendFile(absolutePath, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Payment proof not found.' });
  });
}

// Approving atomically flips the payment to 'approved' AND creates the
// resulting subscription — both happen in one DB transaction so a payment
// can never end up "approved" without a matching subscription record.
async function approve(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: paymentRows } = await client.query(
      `SELECT p.*, sp.duration_days FROM payments p
       JOIN subscription_plans sp ON sp.id = p.plan_id
       WHERE p.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const payment = paymentRows[0];
    if (!payment) throw new NotFoundError('Payment not found.');
    if (payment.status !== 'pending') throw new BadRequestError('This payment has already been reviewed.');

    await client.query(
      `UPDATE payments SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [req.user.id, payment.id]
    );
    const { rows: subRows } = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status)
       VALUES ($1, $2, now(), now() + ($3 || ' days')::interval, 'active')
       RETURNING *`,
      [payment.user_id, payment.plan_id, payment.duration_days]
    );

    await client.query('COMMIT');
    res.json({ message: 'Payment approved and subscription activated.', subscription: subRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function reject(req, res) {
  const { reason } = req.body;
  const payment = await paymentModel.findById(req.params.id);
  if (!payment) throw new NotFoundError('Payment not found.');
  if (payment.status !== 'pending') throw new BadRequestError('This payment has already been reviewed.');

  const updated = await paymentModel.setStatus(req.params.id, 'rejected', {
    reviewedBy: req.user.id,
    rejectionReason: reason,
  });
  res.json({ message: 'Payment rejected.', payment: updated });
}

module.exports = { submit, listMine, listAdmin, getProof, approve, reject };
