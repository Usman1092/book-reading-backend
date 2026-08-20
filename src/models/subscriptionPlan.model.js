// src/models/subscriptionPlan.model.js

const pool = require('../config/db');

async function listActive() {
  const { rows } = await pool.query(
    'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC'
  );
  return rows;
}

async function listAll() {
  const { rows } = await pool.query('SELECT * FROM subscription_plans ORDER BY created_at DESC');
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ name, price, durationDays, benefits }) {
  const { rows } = await pool.query(
    `INSERT INTO subscription_plans (name, price, duration_days, benefits)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, price, durationDays, benefits]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowed = ['name', 'price', 'duration_days', 'benefits', 'is_active'];
  const params = [];
  const setClauses = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      params.push(fields[key]);
      setClauses.push(`${key} = $${params.length}`);
    }
  }
  if (setClauses.length === 0) return findById(id);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE subscription_plans SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

module.exports = { listActive, listAll, findById, create, update };
