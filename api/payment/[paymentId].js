import connectDB from '../_utils/db.js';
import Payment from '../../src/models/payment.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// GET /api/payment/:paymentId - Get payment by ID

export default async function handler(req, res) {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: 'Payment ID is required',
    });
  }

  // GET - Get payment by ID
  if (req.method === 'GET') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const payment = await Payment.findById(paymentId)
          .populate('userId', 'name email')
          .populate('orderId', 'orderNumber totalAmount orderStatus');

        if (!payment) {
          return res.status(404).json({
            success: false,
            message: 'Payment not found',
          });
        }

        // Check ownership or admin
        if (payment.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to access this payment',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Payment fetched successfully',
          data: payment,
        });
      } catch (error) {
        console.error('Error fetching payment:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching payment',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
