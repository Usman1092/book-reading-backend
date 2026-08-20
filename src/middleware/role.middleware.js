// src/middleware/role.middleware.js
// Must run AFTER requireAuth — reads the role that requireAuth put on
// req.user from the verified JWT, never from anything client-supplied.

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireRole };
