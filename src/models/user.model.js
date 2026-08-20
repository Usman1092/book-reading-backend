// src/models/user.model.js

const pool = require('../config/db');

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.is_active, r.name AS role
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, r.name AS role, u.created_at
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role_id)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'user'))
     RETURNING id, name, email, is_active, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

async function updatePasswordHash(userId, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    passwordHash,
    userId,
  ]);
}

// --- Admin user management ---

async function listAdmin({ search, page = 1, pageSize = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(pageSize, (Math.max(page, 1) - 1) * pageSize);
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active, r.name AS role, u.created_at
     FROM users u JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM users u ${where}`,
    params.slice(0, params.length - 2)
  );

  return { users: rows, total: Number(countRows[0].count), page, pageSize };
}

async function setActive(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2
     RETURNING id, name, email, is_active`,
    [isActive, id]
  );
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  updatePasswordHash,
  listAdmin,
  setActive,
};
