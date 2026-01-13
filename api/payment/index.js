import connectDB from '../_utils/db.js';
import { getStripeInstance } from '../_utils/stripe.js';
import Payment from '../../src/models/payment.model.js';
import User from '../../src/models/user.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// POST /api/payment/create-payment-intent - Create payment intent
// POST /api/payment/confirm - Confirm payment
// GET /api/payment/my - Get user payments
// POST /api/payment/refund - Process refund (admin)
// GET /api/payment/admin/all - Get all payments (admin)
// GET /api/payment/stripe-config - Get Stripe config

export default async function handler(req, res) {
  // POST /api/payment/create-payment-intent
  if (req.method === 'POST' && req.url.includes('/create-payment-intent')) {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const { amount, orderId, currency = 'inr', metadata = {} } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Amount must be greater than 0',
          });
        }

        const user = await User.findById(req.user.id).select('email');
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        if (!user.email) {
          return res.status(400).json({
            success: false,
            message: 'User email is required for payment processing',
          });
        }

        const amountInPaise = Math.round(amount * 100);

        const paymentIntent = await getStripeInstance().paymentIntents.create({
          amount: amountInPaise,
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: { userId: req.user.id, orderId: orderId || '', ...metadata },
          receipt_email: user.email,
        });

        const payment = await Payment.create({
          userId: req.user.id,
          orderId: orderId || null,
          stripePaymentIntentId: paymentIntent.id,
          amount: amountInPaise,
          currency,
          status: 'pending',
          receiptEmail: user.email,
          metadata: new Map(Object.entries(paymentIntent.metadata)),
        });

        return res.status(200).json({
          success: true,
          message: 'Payment intent created successfully',
          data: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount,
            currency,
          },
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        return res.status(500).json({
          success: false,
          message: 'Error creating payment intent',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // POST /api/payment/confirm
  if (req.method === 'POST' && req.url.includes('/confirm')) {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const { paymentIntentId, orderId } = req.body;

        if (!paymentIntentId) {
          return res.status(400).json({
            success: false,
            message: 'Payment intent ID is required',
          });
        }

        const paymentIntent = await getStripeInstance().paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            success: false,
            message: 'Payment not successful',
            status: paymentIntent.status,
          });
        }

        const payment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          {
            status: 'succeeded',
            stripeChargeId: paymentIntent.charges?.data?.[0]?.id,
            orderId: orderId || null,
          },
          { new: true }
        ).populate('orderId');

        if (!payment) {
          return res.status(404).json({
            success: false,
            message: 'Payment record not found',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Payment confirmed successfully',
          data: payment,
        });
      } catch (error) {
        console.error('Error confirming payment:', error);
        return res.status(500).json({
          success: false,
          message: 'Error confirming payment',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/payment/my
  if (req.method === 'GET' && req.url.includes('/my')) {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const status = url.searchParams.get('status');

        const query = { userId: req.user.id };
        if (status) query.status = status;

        const payments = await Payment.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('orderId', 'orderNumber totalAmount orderStatus')
          .populate('userId', 'name email');

        const total = await Payment.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: 'Payments fetched successfully',
          data: {
            payments,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalPayments: total,
              hasNextPage: page * limit < total,
              hasPrevPage: page > 1,
            },
          },
        });
      } catch (error) {
        console.error('Error fetching user payments:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching payments',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // POST /api/payment/refund
  if (req.method === 'POST' && req.url.includes('/refund')) {
    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const { paymentId, reason = 'Customer requested refund' } = req.body;
        const payment = await Payment.findById(paymentId).populate('orderId');

        if (!payment) {
          return res.status(404).json({
            success: false,
            message: 'Payment not found',
          });
        }

        if (payment.status !== 'succeeded') {
          return res.status(400).json({
            success: false,
            message: 'Only successful payments can be refunded',
          });
        }

        const refund = await getStripeInstance().refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: 'requested_by_customer',
          metadata: { reason },
        });

        payment.status = 'refunded';
        payment.refundId = refund.id;
        payment.refundAmount = refund.amount;
        payment.refundReason = reason;
        await payment.save();

        return res.status(200).json({
          success: true,
          message: 'Refund processed successfully',
          data: {
            refundId: refund.id,
            refundAmount: refund.amount,
            payment,
          },
        });
      } catch (error) {
        console.error('Error processing refund:', error);
        return res.status(500).json({
          success: false,
          message: 'Error processing refund',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/payment/admin/all
  if (req.method === 'GET' && req.url.includes('/admin/all')) {
    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const status = url.searchParams.get('status');
        const userId = url.searchParams.get('userId');

        const query = {};
        if (status) query.status = status;
        if (userId) query.userId = userId;

        const payments = await Payment.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('userId', 'name email')
          .populate('orderId', 'orderNumber totalAmount orderStatus');

        const total = await Payment.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: 'All payments fetched successfully',
          data: {
            payments,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalPayments: total,
              hasNextPage: page * limit < total,
              hasPrevPage: page > 1,
            },
          },
        });
      } catch (error) {
        console.error('Error fetching all payments:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching payments',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/payment/stripe-config
  if (req.method === 'GET' && req.url.includes('/stripe-config')) {
    return res.status(200).json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
