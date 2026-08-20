// src/services/auth.service.js

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userModel = require('../models/user.model');
const resetTokenModel = require('../models/passwordResetToken.model');
const emailService = require('./email.service');
const pool = require('../config/db');

const BCRYPT_ROUNDS = 12;

class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function register({ name, email, password }) {
  const existing = await userModel.findByEmail(email);
  if (existing) {
    // Same generic message a login-enumeration-safe app would use, but
    // registration conventionally does tell the user the email is taken —
    // acceptable here since it's needed for usable signup UX.
    throw new AuthError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userModel.createUser({ name, email, passwordHash });

  await pool.query(
    `INSERT INTO activity_logs (user_id, action, meta) VALUES ($1, 'register', $2)`,
    [user.id, JSON.stringify({ email })]
  );

  return user;
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);

  // Constant-shape response whether the email exists or not, to avoid
  // leaking which emails are registered.
  if (!user) {
    throw new AuthError('Invalid email or password.', 401);
  }
  if (!user.is_active) {
    throw new AuthError('This account has been deactivated. Contact an administrator.', 403);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Invalid email or password.', 401);
  }

  await pool.query(`INSERT INTO activity_logs (user_id, action) VALUES ($1, 'login')`, [user.id]);

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function requestPasswordReset(email) {
  const user = await userModel.findByEmail(email);

  // Always behave the same way regardless of whether the email exists —
  // don't let this endpoint be used to enumerate registered accounts.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  await resetTokenModel.createToken(user.id, rawToken, 30);

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
  await emailService.sendPasswordResetEmail(user.email, resetUrl);
}

async function resetPassword(rawToken, newPassword) {
  const tokenRow = await resetTokenModel.findValidToken(rawToken);
  if (!tokenRow) {
    throw new AuthError('This reset link is invalid or has expired.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userModel.updatePasswordHash(tokenRow.user_id, passwordHash);
  await resetTokenModel.markUsed(tokenRow.id);

  await pool.query(`INSERT INTO activity_logs (user_id, action) VALUES ($1, 'password_reset')`, [
    tokenRow.user_id,
  ]);
}

module.exports = { AuthError, register, login, requestPasswordReset, resetPassword };
