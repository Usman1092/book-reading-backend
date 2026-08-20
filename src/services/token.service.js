// src/services/token.service.js
// Access tokens: short-lived, sent in the response body, used as a Bearer
// token by the client. Refresh tokens: longer-lived, stored ONLY in an
// httpOnly, secure cookie — never accessible to client-side JS, which is
// what keeps a stolen access token from being a permanent compromise.

const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

const REFRESH_COOKIE_NAME = 'wisdom_refresh';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: '/api/auth', // only sent to auth endpoints (refresh/logout)
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
};
