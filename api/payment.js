import connectDB from './_utils/db.js';
import { authenticate, requireAdmin } from './_utils/auth.js';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentById,
  getPaymentByIntentId,
  getUserPayments,
  processRefund,
  getAllPayments,
  getUserPaymentsForAdmin
} from '../src/controllers/payment.controller.js';

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
        if (req.query.all === 'true') {
          // Admin only
          const adminCheck = await requireAdmin(req.user);
          if (!adminCheck.success) {
            return res.status(403).json({ success: false, message: adminCheck.message });
          }
          return await getAllPayments(req, res);
        } else {
          // Get user's own payments
          return await getUserPayments(req, res);
        }
      
      case 'POST':
        // Create payment intent
        return await createPaymentIntent(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
