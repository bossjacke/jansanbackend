import Stripe from 'stripe';

// Initialize Stripe instance lazily to reduce cold start
let stripeInstance = null;

export function getStripeInstance() {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
      typescript: false,
    });
  }
  return stripeInstance;
}

export default { getStripeInstance };

