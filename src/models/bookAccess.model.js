// src/models/bookAccess.model.js

const pool = require('../config/db');

// The single query the whole access-control system leans on: is there a
// currently-valid (status='active' AND end_date >= now) grant for this
// user+book? Checking end_date directly (not just status) means access is
// correctly enforced even if a background job hasn't yet flipped a stale
// row's status to 'expired'.
async function findActiveGrant(userId, bookId) {
  const { rows } = await pool.query(
    `SELECT id, start_date, end_date FROM book_access
     WHERE user_id = $1 AND book_id = $2 AND status = 'active' AND end_date >= now()
     ORDER BY end_date DESC LIMIT 1`,
    [userId, bookId]
  );
  return rows[0] || null;
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ba.id, ba.book_id, b.title, b.cover_path, ba.start_date, ba.end_date, ba.status,
            CASE WHEN ba.status = 'active' AND ba.end_date >= now() THEN
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (ba.end_date - now())) / 86400))::int
            ELSE 0 END AS remaining_days
     FROM book_access ba JOIN books b ON b.id = ba.book_id
     WHERE ba.user_id = $1
     ORDER BY ba.end_date DESC`,
    [userId]
  );
  return rows;
}

// --- Admin management (used by the admin book-assignment panel, Phase 5) ---

async function listAll({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE ba.status = $1';
  }
  const { rows } = await pool.query(
    `SELECT ba.id, ba.user_id, u.name AS user_name, u.email AS user_email,
            ba.book_id, b.title AS book_title, ba.start_date, ba.end_date, ba.status
     FROM book_access ba
     JOIN users u ON u.id = ba.user_id
     JOIN books b ON b.id = ba.book_id
     ${where}
     ORDER BY ba.end_date DESC`,
    params
  );
  return rows;
}

async function grant({ userId, bookId, grantedBy, durationDays = 20 }) {
  const { rows } = await pool.query(
    `INSERT INTO book_access (user_id, book_id, granted_by, start_date, end_date, status)
     VALUES ($1, $2, $3, now(), now() + ($4 || ' days')::interval, 'active')
     RETURNING *`,
    [userId, bookId, grantedBy, durationDays]
  );
  return rows[0];
}

async function revoke(id) {
  const { rows } = await pool.query(
    `UPDATE book_access SET status = 'revoked', updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function renew(id, durationDays = 20) {
  const { rows } = await pool.query(
    `UPDATE book_access
     SET status = 'active', start_date = now(), end_date = now() + ($2 || ' days')::interval, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, durationDays]
  );
  return rows[0] || null;
}

module.exports = { findActiveGrant, listForUser, listAll, grant, revoke, renew };
