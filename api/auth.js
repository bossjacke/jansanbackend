import bcrypt from 'bcryptjs';
import connectDB from '../_utils/db.js';
import User from '../../src/models/user.model.js';
import { generateToken } from '../_utils/helpers.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Vercel config
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // POST /api/auth/register
  if (req.method === 'POST' && pathname.includes('/register')) {
    try {
      await connectDB();

      const { name, email, phone, password, role, location } = req.body;

      // Validate required fields
      if (!name || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, phone, and password are required',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const effectiveRole = role || 'customer';

      // Validate location for customers
      if (effectiveRole === 'customer' && !location) {
        return res.status(400).json({
          success: false,
          message: 'Location is required for customers',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role: effectiveRole,
        location,
      });

      // Generate token
      const token = generateToken(newUser._id, newUser.role);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  // POST /api/auth/login
  if (req.method === 'POST' && pathname.includes('/login')) {
    try {
      await connectDB();

      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Generate token
      const token = generateToken(user._id, user.role);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  // POST /api/auth/google-login
  if (req.method === 'POST' && pathname.includes('/google-login')) {
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
            phone: '',
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

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

