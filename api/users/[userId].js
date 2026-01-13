import connectDB from '../_utils/db.js';
import User from '../../src/models/user.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// GET /api/users/:userId - Get user by ID (admin)
// DELETE /api/users/:userId - Delete user (admin)

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  // Validate ObjectId format
  if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format',
    });
  }

  // GET - Get user by ID (admin only)
  if (req.method === 'GET') {
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

  // DELETE - Delete user (admin only)
  if (req.method === 'DELETE') {
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

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

