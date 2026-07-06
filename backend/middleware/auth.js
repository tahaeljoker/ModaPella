const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-demo-token');
  const requestedRole = req.header('x-role') || 'manager';

  if (!token) {
    if (process.env.ALLOW_DEV_AUTH === 'true') {
      req.user = { id: 'demo-user', role: requestedRole, email: 'demo@modapella.local' };
      return next();
    }
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'modapella-secret');
    req.user = decoded.user;
    next();
  } catch (error) {
    if (process.env.ALLOW_DEV_AUTH === 'true' && ['demo-token', 'demo-manager-token', 'demo-cashier-token'].includes(token)) {
      req.user = { id: 'demo-user', role: requestedRole, email: 'demo@modapella.local' };
      return next();
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};
