import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'polytechnic-college-secret-key-1029384756';

/**
 * Middleware verifying JWT in Authorization header
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired.' });
    }
    req.user = user;
    next();
  });
}

/**
 * Role checking gate middleware
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ 
        error: `Access Denied. Role '${role}' does not have sufficient clearance for this operation.` 
      });
    }

    next();
  };
}

export function generateToken(userPayload) {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
}

const authMiddleware = {
  authenticateToken,
  requireRole,
  generateToken
};

export default authMiddleware;
