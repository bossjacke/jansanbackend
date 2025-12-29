import logger from "../utils/logger.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import stripe from "stripe";

// Initialize Stripe
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// ==================== STRIPE WEBHOOK HANDLER ====================
export const handleStripeWebhook = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('STRIPE WEBHOOK RECEIVED');
    console.log('========================================');
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error('Missing stripe signature or webhook secret');
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    let event;

    try {
      event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log('Webhook signature verified successfully');
      console.log('Event type:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle different event types
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

    // Return 200 OK to acknowledge receipt of the event
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('WEBHOOK HANDLER ERROR:', error);
    logger.error("Error handling webhook:", error);
    
    // Still return 200 to avoid Stripe retrying
    res.status(200).json({ received: true, error: error.message });
  }
};

// ==================== PAYMENT SUCCEEDED HANDLER ====================
async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log('Handling payment succeeded:', paymentIntent.id);
    
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "succeeded",
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        paidAt: new Date()
      },
      { new: true }
    ).populate('orderId');

    if (!payment) {
      console.error('Payment record not found for payment intent:', paymentIntent.id);
      return;
    }

    console.log('Payment record updated:', payment._id);

    // If order exists, update its status
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
      
      console.log('Order status updated:', payment.orderId._id);
    }

    logger.info(`Payment succeeded: ${paymentIntent.id}`);

  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    logger.error("Error in payment succeeded handler:", error);
  }
}

// ==================== PAYMENT FAILED HANDLER ====================
async function handlePaymentFailed(paymentIntent) {
  try {
    console.log('Handling payment failed:', paymentIntent.id);
    
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "failed",
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
        failedAt: new Date()
      },
      { new: true }
    ).populate('orderId');

    if (!payment) {
      console.error('Payment record not found for payment intent:', paymentIntent.id);
      return;
    }

    console.log('Payment record updated to failed:', payment._id);

    // If order exists, update its status
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
      
      console.log('Order status updated to cancelled:', payment.orderId._id);
    }

    logger.warn(`Payment failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message}`);

  } catch (error) {
    console.error('Error handling payment failed:', error);
    logger.error("Error in payment failed handler:", error);
  }
}

// ==================== PAYMENT CANCELED HANDLER ====================
async function handlePaymentCanceled(paymentIntent) {
  try {
    console.log('Handling payment canceled:', paymentIntent.id);
    
    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "canceled"
      },
      { new: true }
    ).populate('orderId');

    if (!payment) {
      console.error('Payment record not found for payment intent:', paymentIntent.id);
      return;
    }

    console.log('Payment record updated to canceled:', payment._id);

    // If order exists, update its status
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
      
      console.log('Order status updated to cancelled:', payment.orderId._id);
    }

    logger.info(`Payment canceled: ${paymentIntent.id}`);

  } catch (error) {
    console.error('Error handling payment canceled:', error);
    logger.error("Error in payment canceled handler:", error);
  }
}

// ==================== CHARGEBACK HANDLER ====================
async function handleChargebackCreated(charge) {
  try {
    console.log('Handling chargeback created:', charge.id);
    
    // Find payment by charge ID
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    
    if (!payment) {
      console.error('Payment record not found for charge:', charge.id);
      return;
    }

    // If order exists, update its status
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
    console.error('Error handling chargeback:', error);
    logger.error("Error in chargeback handler:", error);
  }
}

// ==================== REFUND HANDLER ====================
async function handleChargeRefunded(charge) {
  try {
    console.log('Handling charge refunded:', charge.id);
    
    // Find payment by charge ID
    const payment = await Payment.findOne({ stripeChargeId: charge.id });
    
    if (!payment) {
      console.error('Payment record not found for charge:', charge.id);
      return;
    }

    // Update payment record
    payment.status = "refunded";
    payment.refundAmount = charge.amount_refunded;
    payment.refundedAt = new Date();
    await payment.save();

    // If order exists, update its status
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
    console.error('Error handling refund:', error);
    logger.error("Error in refund handler:", error);
  }
}
