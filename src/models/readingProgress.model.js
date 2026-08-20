// src/models/readingProgress.model.js

const pool = require('../config/db');

async function get(userId, bookId) {
  const { rows } = await pool.query(
    'SELECT last_page, percent, updated_at FROM reading_progress WHERE user_id = $1 AND book_id = $2',
    [userId, bookId]
  );
  return rows[0] || null;
}

// percent is always recomputed here from last_page/page_count — never
// trusted as a value passed in from the client.
async function upsert(userId, bookId, lastPage, pageCount) {
  const percent = pageCount > 0 ? Math.min(100, Math.round((lastPage / pageCount) * 10000) / 100) : 0;
  const { rows } = await pool.query(
    `INSERT INTO reading_progress (user_id, book_id, last_page, percent, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET last_page = EXCLUDED.last_page, percent = EXCLUDED.percent, updated_at = now()
     RETURNING last_page, percent, updated_at`,
    [userId, bookId, lastPage, percent]
  );
  return rows[0];
}

async function recentForUser(userId, limit = 5) {
  const { rows } = await pool.query(
    `SELECT rp.book_id, b.title, b.cover_path, b.page_count, rp.last_page, rp.percent, rp.updated_at
     FROM reading_progress rp JOIN books b ON b.id = rp.book_id
     WHERE rp.user_id = $1
     ORDER BY rp.updated_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = { get, upsert, recentForUser };
