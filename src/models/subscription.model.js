// src/models/subscription.model.js

const pool = require('../config/db');

async function findActiveForUser(userId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.plan_id, s.start_date, s.end_date, p.name AS plan_name
     FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date >= now()
     ORDER BY s.end_date DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// Called when an admin approves a payment — start/end dates are always
// computed server-side from the plan's duration, never from client input.
async function createFromApprovedPayment(userId, planId, durationDays) {
  const { rows } = await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, now(), now() + ($3 || ' days')::interval, 'active')
     RETURNING *`,
    [userId, planId, durationDays]
  );
  return rows[0];
}

async function listAll({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE s.status = $1';
  }
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, u.name AS user_name, u.email AS user_email,
            s.plan_id, p.name AS plan_name, s.start_date, s.end_date, s.status
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     JOIN subscription_plans p ON p.id = s.plan_id
     ${where}
     ORDER BY s.end_date DESC`,
    params
  );
  return rows;
}

async function setStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0] || null;
}

module.exports = { findActiveForUser, createFromApprovedPayment, listAll, setStatus };
