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

// Authenticate function for serverless functions
export async function authenticate(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, message: 'No token, authorization denied' };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get full user details from database
    const User = (await import('../../src/models/user.model.js')).default;
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, message: 'Token is not valid' };
  }
}

// Check if user is admin
export async function requireAdmin(user) {
  if (user.role !== 'admin') {
    return { success: false, message: 'Access denied. Admin role required.' };
  }
  return { success: true };
}

export default { verifyToken, withAuth, withRole, authenticate, requireAdmin };
