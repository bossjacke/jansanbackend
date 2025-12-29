import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import sendEmail from '../utils/email.js';

// Generate HTML email template for OTP
const generateOTPEmailTemplate = (otp, userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - Jansan E-commerce</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 10px;
        }
        .otp-code {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .otp-label {
          color: #ffffff;
          font-size: 16px;
          margin-bottom: 15px;
          font-weight: 500;
        }
        .otp-number {
          font-size: 36px;
          font-weight: bold;
          color: #ffffff;
          letter-spacing: 8px;
          background: rgba(255, 255, 255, 0.2);
          padding: 15px 25px;
          border-radius: 8px;
          display: inline-block;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .instructions {
          background-color: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .greeting {
          font-size: 18px;
          color: #374151;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛍️ Jansan E-commerce</div>
          <h1 style="margin: 0; color: #374151; font-size: 24px;">Password Reset Request</h1>
        </div>
        
        <p class="greeting">Hello ${userName},</p>
        
        <p>We received a request to reset your password for your Jansan E-commerce account. Use the OTP code below to proceed with resetting your password.</p>
        
        <div class="otp-code">
          <div class="otp-label">Your One-Time Password (OTP)</div>
          <div class="otp-number">${otp}</div>
        </div>
        
        <div class="instructions">
          <strong>📋 Instructions:</strong>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Go to the password reset page</li>
            <li>Enter your email address</li>
            <li>Enter this OTP code: <strong>${otp}</strong></li>
            <li>Create your new password</li>
          </ol>
        </div>
        
        <div class="warning">
          <strong>⚠️ Important Security Notice:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>This OTP expires in <strong>10 minutes</strong></li>
            <li>Never share this code with anyone</li>
            <li>Our team will never ask for your OTP</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/reset-password" 
             style="background-color: #10b981; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 6px; display: inline-block; 
                    font-weight: 500;">
            Reset Password
          </a>
        </p>
        
        <div class="footer">
          <p>© 2024 Jansan E-commerce. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
          <p>If you need help, contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Rate limiting map (in production, use Redis or database)
const otpRequests = new Map();

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  // Input validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Valid email required' });
  }

  // Rate limiting: max 3 requests per 15 minutes per email
  const now = Date.now();
  const userRequests = otpRequests.get(email) || [];
  const recentRequests = userRequests.filter(time => now - time < 15 * 60 * 1000);
  
  if (recentRequests.length >= 3) {
    return res.status(429).json({ 
      message: 'Too many requests. Please try again later.' 
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If email exists, OTP sent successfully' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Update rate limiting
    recentRequests.push(now);
    otpRequests.set(email, recentRequests);

    // Send email
    const subject = '🔐 Password Reset OTP - Jansan E-commerce';
    const text = `Your password reset OTP is: ${otp}\n\nThis OTP expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    try {
      await sendEmail({ 
        to: user.email, 
        subject, 
        text,
        html: generateOTPEmailTemplate(otp, user.name || 'User')
      });
      console.log('✅ OTP sent successfully to:', user.email);
    } catch (emailError) {
      console.error('❌ Email send failed:', emailError);
      // Log OTP for development in case email fails
      console.log('=== DEVELOPMENT FALLBACK ===');
      console.log('Email:', user.email);
      console.log('OTP:', otp);
      console.log('Expires:', otpExpires);
      console.log('============================');
      // Don't fail the request if email fails - OTP is still saved in database
    }

    res.json({ message: 'If email exists, OTP sent successfully' });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Input validation
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ 
      message: 'Email, OTP, and new password are required' 
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Valid email required' });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'Invalid OTP format' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      message: 'Password must be at least 6 characters' 
    });
  }

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      otp: otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired OTP' 
      });
    }

    // Hash password and save
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { forgotPassword, resetPassword };
