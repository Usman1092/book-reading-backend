// src/models/payment.model.js

const pool = require('../config/db');

async function create({ userId, planId, method, referenceNumber, amount, proofPath }) {
  const { rows } = await pool.query(
    `INSERT INTO payments (user_id, plan_id, method, reference_number, amount, proof_path, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
    [userId, planId, method, referenceNumber, amount, proofPath]
  );
  return rows[0];
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT p.*, sp.name AS plan_name FROM payments p
     JOIN subscription_plans sp ON sp.id = p.plan_id
     WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listAll({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE p.status = $1';
  }
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS user_name, u.email AS user_email, sp.name AS plan_name,
            reviewer.name AS reviewer_name
     FROM payments p
     JOIN users u ON u.id = p.user_id
     JOIN subscription_plans sp ON sp.id = p.plan_id
     LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS user_name, u.email AS user_email, sp.name AS plan_name, sp.duration_days
     FROM payments p
     JOIN users u ON u.id = p.user_id
     JOIN subscription_plans sp ON sp.id = p.plan_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function setStatus(id, status, { reviewedBy, rejectionReason } = {}) {
  const { rows } = await pool.query(
    `UPDATE payments SET status = $1, reviewed_by = $2, rejection_reason = $3, reviewed_at = now()
     WHERE id = $4 RETURNING *`,
    [status, reviewedBy, rejectionReason || null, id]
  );
  return rows[0] || null;
}

module.exports = { create, listForUser, listAll, findById, setStatus };
