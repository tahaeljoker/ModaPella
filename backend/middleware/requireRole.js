/**
 * requireRole — middleware to restrict access by user role.
 * Usage: router.get('/route', auth, requireRole(['admin']), handler)
 */
module.exports = function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};
