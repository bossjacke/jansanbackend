import { OAuth2Client } from 'google-auth-library';
import connectDB from '../_utils/db.js';
import User from '../../src/models/user.model.js';
import { generateToken } from '../_utils/helpers.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required',
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with email
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        // Link Google ID to existing user
        existingUser.googleId = googleId;
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        user = await User.create({
          name,
          email,
          googleId,
          role: 'customer',
          phone: '', // Google login doesn't provide phone
        });
      }
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google login failed',
      error: error.message,
    });
  }
}

