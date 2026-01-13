import connectDB from './_utils/db.js';
import { authenticate, requireAdmin } from './_utils/auth.js';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUser
} from '../../src/controllers/user.controller.js';

export default async function handler(req, res) {
  await connectDB();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply authentication middleware
  const authResult = await authenticate(req);
  if (!authResult.success) {
    return res.status(401).json({ success: false, message: authResult.message });
  }
  req.user = authResult.user;

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    switch (req.method) {
      case 'GET':
        if (pathname.includes('/profile') || pathname === '/api/users') {
          // Get user profile (authenticated user)
          return await getUserProfile(req, res);
        } else if (req.query.all === 'true') {
          // Admin only - get all users
          const adminCheck = await requireAdmin(req.user);
          if (!adminCheck.success) {
            return res.status(403).json({ success: false, message: adminCheck.message });
          }
          return await getAllUsers(req, res);
        } else {
          return res.status(400).json({ success: false, message: 'Invalid endpoint' });
        }
      
      case 'PUT':
        if (pathname.includes('/profile') || pathname === '/api/users') {
          // Update user profile (authenticated user)
          return await updateUserProfile(req, res);
        } else {
          return res.status(400).json({ success: false, message: 'Invalid endpoint' });
        }
      
      case 'DELETE':
        // Extract userId from URL for /api/users/:userId
        const pathParts = pathname.split('/');
        const userId = pathParts[pathParts.length - 1];
        if (userId !== 'users') {
          req.params = { userId };
          // Admin only - delete user
          const adminCheck = await requireAdmin(req.user);
          if (!adminCheck.success) {
            return res.status(403).json({ success: false, message: adminCheck.message });
          }
          return await deleteUser(req, res);
        } else {
          return res.status(400).json({ success: false, message: 'User ID required' });
        }
      
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
