import jwt from 'jsonwebtoken';

/**
 * Authentication middleware.
 * Verifies JWT from httpOnly cookie or Authorization Bearer header.
 */
export function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization: Bearer header fallback
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'skillup_default_dev_secret';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, email, ... }
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired session. Please log in again.',
    });
  }
}
