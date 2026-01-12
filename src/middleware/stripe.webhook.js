import logger from "../utils/logger.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import stripe from "stripe";

let stripeInstance = null;

const getStripeInstance = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
    }
    stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

export const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    let event;

    try {
      event = getStripeInstance().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

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
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error("Error handling webhook:", error);
    res.status(200).json({ received: true, error: error.message });
  }
};

async function handlePaymentSucceeded(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "succeeded",
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        paidAt: new Date()
      },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: "paid",
        orderStatus: "Processing",
        $push: {
          statusHistory: {
            status: "Processing",
            timestamp: new Date(),
            note: "Payment confirmed via Stripe webhook"
          }
        }
      });
    }

    logger.info(`Payment succeeded: ${paymentIntent.id}`);
  } catch (error) {
    logger.error("Error in payment succeeded handler:", error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "failed",
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
        failedAt: new Date()
      },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: "failed",
        orderStatus: "Cancelled",
        $push: {
          statusHistory: {
            status: "Cancelled",
            timestamp: new Date(),
            note: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`
          }
        }
      });
    }

    logger.warn(`Payment failed: ${paymentIntent.id}`);
  } catch (error) {
    logger.error("Error in payment failed handler:", error);
  }
}

async function handlePaymentCanceled(paymentIntent) {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: "canceled" },
      { new: true }
    ).populate('orderId');

    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId._id, {
        paymentStatus: "canceled",
        orderStatus: "Cancelled",
        $push: {
          statusHistory: {
            status: "Cancelled",
            timestamp: new Date(),
            note: "Payment was canceled"
          }
        }
      });
    }

    logger.info(`Payment canceled: ${paymentIntent.id}`);
  } catch (error) {
    logger.error("Error in payment canceled handler:", error);
  }
}

async function handleChargebackCreated(charge) {
  try {
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    if (!payment) return;

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        orderStatus: "Disputed",
        $push: {
          statusHistory: {
            status: "Disputed",
            timestamp: new Date(),
            note: `Chargeback initiated: ${charge.id}`
          }
        }
      });
    }

    logger.warn(`Chargeback created for payment: ${payment._id}`);
  } catch (error) {
    logger.error("Error in chargeback handler:", error);
  }
}

async function handleChargeRefunded(charge) {
  try {
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    if (!payment) return;

    payment.status = "refunded";
    payment.refundAmount = charge.amount_refunded;
    payment.refundedAt = new Date();
    await payment.save();

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        orderStatus: "Refunded",
        $push: {
          statusHistory: {
            status: "Refunded",
            timestamp: new Date(),
            note: `Payment refunded: $${(charge.amount_refunded / 100).toFixed(2)}`
          }
        }
      });
    }

    logger.info(`Charge refunded for payment: ${payment._id}`);
  } catch (error) {
    logger.error("Error in refund handler:", error);
  }
}

