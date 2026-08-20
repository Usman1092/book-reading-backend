// src/models/passwordResetToken.model.js
// Raw tokens are never stored — only a SHA-256 hash, mirroring how we
// never store raw passwords. This means even a database leak doesn't
// expose usable reset links.

const crypto = require('crypto');
const pool = require('../config/db');

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function createToken(userId, rawToken, ttlMinutes = 30) {
  const tokenHash = hashToken(rawToken);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [userId, tokenHash, ttlMinutes]
  );
}

async function findValidToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await pool.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markUsed(tokenId) {
  await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [tokenId]);
}

module.exports = { createToken, findValidToken, markUsed, hashToken };
