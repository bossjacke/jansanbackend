import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

// Verify JWT token and return user payload
export function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token, authorization denied', status: 401 };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded, error: null };
  } catch (error) {
    return { error: 'Token is not valid', status: 401 };
  }
}

// Auth middleware wrapper for serverless handlers
export function withAuth(handler) {
  return async (req, res) => {
    const { user, error, status } = verifyToken(req);

    if (error) {
      return res.status(status || 401).json({
        success: false,
        message: error,
      });
    }

    req.user = user;
    return handler(req, res);
  };
}

// Role check middleware wrapper
export function withRole(...allowedRoles) {
  return (handler) => {
    return async (req, res) => {
      const { user, error, status } = verifyToken(req);

      if (error) {
        return res.status(status || 401).json({
          success: false,
          message: error,
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        });
      }

      req.user = user;
      return handler(req, res);
    };
  };
}

export default { verifyToken, withAuth, withRole };

