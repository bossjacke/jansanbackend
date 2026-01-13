import connectDB from '../_utils/db.js';
import User from '../../src/models/user.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// GET /api/users - Get all users (admin only)
// GET /api/users/profile - Get current user profile
// PUT /api/users/profile - Update current user profile

export default async function handler(req, res) {
  // GET /api/users - Get all users (admin only)
  if (req.method === 'GET') {
    // Check if requesting all users (admin) or own profile
    const url = new URL(req.url, `http://${req.headers.host}`);
    const isAdminEndpoint = url.pathname.endsWith('/users') && url.searchParams.toString() === '';

    if (isAdminEndpoint) {
      const authHandler = withRole('admin')(async (req, res) => {
        try {
          await connectDB();

          const users = await User.find().select('-password').sort({ createdAt: -1 });

          return res.status(200).json({
            success: true,
            users,
            count: users.length,
          });
        } catch (error) {
          console.error('Error fetching users:', error);
          return res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message,
          });
        }
      });

      return authHandler(req, res);
    }

    // GET /api/users/profile - Get own profile
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        return res.status(200).json({
          success: true,
          user,
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({
          success: false,
          message: 'Server error',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // PUT /api/users/profile - Update own profile
  if (req.method === 'PUT') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const updates = req.body;
        if (updates.password) {
          const bcrypt = await import('bcryptjs');
          updates.password = await bcrypt.hash(updates.password, 10);
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
          new: true,
        }).select('-password');

        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully',
          user,
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
          success: false,
          message: 'Error updating profile',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

