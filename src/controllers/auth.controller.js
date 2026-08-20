// src/controllers/auth.controller.js

const authService = require('../services/auth.service');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} = require('../services/token.service');
const userModel = require('../models/user.model');

async function register(req, res) {
  const { name, email, password } = req.body;
  const user = await authService.register({ name, email, password });
  res.status(201).json({
    message: 'Account created successfully. You can now log in.',
    user: { id: user.id, name: user.name, email: user.email },
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await authService.login({ email, password });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No refresh token provided.' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token invalid or expired. Please log in again.' });
  }

  const user = await userModel.findById(payload.sub);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Account no longer available.' });
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
  res.json({ message: 'Logged out.' });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  await authService.requestPasswordReset(email);
  // Same response whether or not the email exists — see auth.service.js.
  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.json({ message: 'Password has been reset. You can now log in with your new password.' });
}

async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, me };
