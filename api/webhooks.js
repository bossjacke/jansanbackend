import { getStripeInstance } from './_utils/stripe.js';
import connectDB from './_utils/db.js';
import Payment from '../src/models/payment.model.js';
import Order from '../src/models/order.model.js';

// Vercel config: Disable body parser for raw body handling
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePaymentSucceeded(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'succeeded',
        stripeChargeId: paymentIntent.charges?.data?.[0]?.id,
        paidAt: new Date(),
      },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: 'paid',
        orderStatus: 'Processing',
        $push: {
          statusHistory: {
            status: 'Processing',
            timestamp: new Date(),
            note: 'Payment confirmed via Stripe webhook',
          },
        },
      });
    }

    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error in payment succeeded handler:', error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        failedAt: new Date(),
      },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: 'failed',
        orderStatus: 'Cancelled',
        $push: {
          statusHistory: {
            status: 'Cancelled',
            timestamp: new Date(),
            note: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
          },
        },
      });
    }

    console.warn(`⚠️ Payment failed: ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error in payment failed handler:', error);
  }
}

async function handlePaymentCanceled(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: 'canceled' },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: 'canceled',
        orderStatus: 'Cancelled',
        $push: {
          statusHistory: {
            status: 'Cancelled',
            timestamp: new Date(),
            note: 'Payment was canceled',
          },
        },
      });
    }

    console.log(`ℹ️ Payment canceled: ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error in payment canceled handler:', error);
  }
}

async function handleChargebackCreated(charge) {
  try {
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        orderStatus: 'Disputed',
        $push: {
          statusHistory: {
            status: 'Disputed',
            timestamp: new Date(),
            note: `Chargeback initiated: ${charge.id}`,
          },
        },
      });
    }

    console.warn(`🚨 Chargeback created for payment: ${payment._id}`);
  } catch (error) {
    console.error('Error in chargeback handler:', error);
  }
}

async function handleChargeRefunded(charge) {
  try {
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    if (!payment) return;

    payment.status = 'refunded';
    payment.refundAmount = charge.amount_refunded;
    payment.refundedAt = new Date();
    await payment.save();

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        orderStatus: 'Refunded',
        $push: {
          statusHistory: {
            status: 'Refunded',
            timestamp: new Date(),
            note: `Payment refunded: $${(charge.amount_refunded / 100).toFixed(2)}`,
          },
        },
      });
    }

    console.log(`💰 Charge refunded for payment: ${payment._id}`);
  } catch (error) {
    console.error('Error in refund handler:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Get raw body for signature verification
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    let event;
    try {
      event = getStripeInstance().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Ensure database connection
    await connectDB();

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      case 'charge.dispute.created':
        await handleChargebackCreated(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Always return 200 to Stripe to prevent retry loops
    return res.status(200).json({ received: true, error: error.message });
  }
}
