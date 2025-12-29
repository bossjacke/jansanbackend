import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/password.controller.js';

const router = express.Router();

// POST /api/user/forgot-password - Send OTP to email
router.post('/forgot-password', forgotPassword);

// POST /api/user/reset-password - Reset password with OTP
router.post('/reset-password', resetPassword);

export default router;
