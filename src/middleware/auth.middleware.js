// src/middleware/auth.middleware.js
// Verifies the Bearer access token and attaches { id, role, email } to
// req.user. This is the ONLY place req.user gets set — every downstream
// route/service trusts req.user, never a client-supplied field.

const { verifyAccessToken } = require('../services/token.service');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Attaches req.user if a valid token is present, but never blocks the
// request — for routes like GET /books/:id that behave differently for
// logged-in vs anonymous users but are accessible to both.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch (err) {
      // Invalid/expired token on an optional route — proceed as anonymous.
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
