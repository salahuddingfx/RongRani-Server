const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('🔒 Auth middleware:', {
      email: user.email,
      role: user.role,
      tokenId: decoded.id.substring(0, 8) + '...'
    });

    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      // No token provided, but that's okay - continue as guest
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      // Invalid user, but continue as guest
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch {
    // Invalid token, but continue as guest
    req.user = null;
    next();
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    console.log('🔐 Authorize middleware:', {
      userEmail: req.user?.email,
      userRole: req.user?.role,
      allowedRoles: roles,
      isAuthorized: req.user && roles.includes(req.user.role)
    });

    if (!req.user) {
      console.log('❌ Auth failed: No user');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ Auth failed: Role not allowed');
      return res.status(403).json({ message: 'Not authorized' });
    }

    console.log('✅ Auth successful');
    next();
  };
};

module.exports = { auth, authorize, optionalAuth };