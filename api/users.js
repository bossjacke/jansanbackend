import connectDB from '../_utils/db.js';
import User from '../../src/models/user.model.js';
import { withAuth, withRole } from '../_utils/auth.js';
import bcrypt from 'bcryptjs';

// Vercel config
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET /api/users - Get all users (admin)
// GET /api/users/profile - Get current user profile
// PUT /api/users/profile - Update current user profile
// GET /api/users/:userId - Get user by ID (admin)
// DELETE /api/users/:userId - Delete user (admin)

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');
  const userIdParam = pathParts[pathParts.length - 1];
  const isUserIdRoute = userIdParam && userIdParam !== 'profile' && userIdParam !== '';

  // GET /api/users/:userId - Get user by ID (admin)
  if (req.method === 'GET' && isUserIdRoute) {
    const userId = userIdParam;

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const user = await User.findById(userId).select('-password');

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
        console.error('Error fetching user:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching user',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // DELETE /api/users/:userId - Delete user (admin)
  if (req.method === 'DELETE' && isUserIdRoute) {
    const userId = userIdParam;

    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        // Prevent self-deletion
        if (userId === req.user.id) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete your own account',
          });
        }

        await User.findByIdAndDelete(userId);

        return res.status(200).json({
          success: true,
          message: 'User deleted successfully',
          deletedUser: {
            id: userToDelete._id,
            name: userToDelete.name,
            email: userToDelete.email,
            role: userToDelete.role,
          },
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
          success: false,
          message: 'Error deleting user',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/users - Get all users (admin only)
  if (req.method === 'GET' && url.pathname.endsWith('/users') && url.searchParams.toString() === '') {
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
  if (req.method === 'GET' && url.pathname.includes('/profile')) {
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
  if (req.method === 'PUT' && url.pathname.includes('/profile')) {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const updates = req.body;
        if (updates.password) {
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

