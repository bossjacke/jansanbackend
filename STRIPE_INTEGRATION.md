# Stripe Payment Integration Guide

## 📋 Overview
This backend now supports Stripe payment integration for processing online payments alongside the existing Cash on Delivery option.

## 🔧 Setup Instructions

### 1. Environment Variables
Add the following to your `.env` file:

```env
# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Get Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or login
3. Go to Developers → API Keys
4. Copy your Secret Key (starts with `sk_test_` for test mode)
5. Copy your Publishable Key (starts with `pk_test_` for test mode)

### 3. Setup Webhook
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3003/api/webhooks/stripe
   ```
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.dispute.created`
   - `charge.refunded`

## 🚀 API Endpoints

### Payment Routes
- `POST /api/payment/create-payment-intent` - Create payment intent
- `POST /api/payment/confirm` - Confirm payment
- `GET /api/payment/my` - Get user payments
- `GET /api/payment/:paymentId` - Get specific payment
- `POST /api/payment/refund` - Process refund (Admin only)
- `GET /api/payment/admin/all` - Get all payments (Admin only)

### Webhook Endpoint
- `POST /api/webhooks/stripe` - Stripe webhook handler

## 💳 Payment Flow

### 1. Create Payment Intent
```javascript
POST /api/payment/create-payment-intent
{
  "amount": 100.00,  // Amount in USD
  "orderId": "order_id_here", // Optional
  "currency": "usd"
}

Response:
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "amount": 100.00,
    "currency": "usd"
  }
}
```

### 2. Process Payment (Frontend)
Use the `clientSecret` with Stripe.js on frontend to complete payment.

### 3. Create Order with Payment
```javascript
POST /api/orders/create
{
  "shippingAddress": { ... },
  "items": [ ... ],
  "totalAmount": 100.00,
  "paymentMethod": "stripe",
  "paymentIntentId": "pi_xxx"
}
```

### 4. Webhook Processing
Stripe automatically sends webhook events to update payment and order status.

## 📊 Database Schema

### Payment Model
- `userId` - User ID
- `orderId` - Associated Order ID
- `stripePaymentIntentId` - Stripe payment intent ID
- `amount` - Amount in cents
- `status` - pending/succeeded/failed/canceled/refunded
- `paymentMethod` - card/upi/netbanking/wallet
- `stripeChargeId` - Stripe charge ID (after success)
- `refundId` - Refund ID (if refunded)

### Order Model Updates
- `paymentMethod` - cash_on_delivery/stripe
- `paymentStatus` - pending/paid/failed/canceled/refunded
- `stripePaymentId` - Stripe payment intent ID

## 🔒 Security Features

1. **Webhook Signature Verification** - All webhooks are verified
2. **Payment Intent Validation** - Only valid payment intents accepted
3. **User Authentication** - All payment endpoints require auth
4. **Admin Role Check** - Sensitive operations require admin role

## 🛠 Testing

### Test Cards
Use these Stripe test cards:
- Card Number: `4242 4242 4242 4242` (Success)
- Card Number: `4000 0000 0000 0002` (Card Declined)
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### Test Flow
1. Create payment intent
2. Complete payment with test card
3. Check payment status updates
4. Verify order status changes via webhook

## 📝 Error Handling

Common error responses:
- `400` - Invalid amount, missing fields
- `401` - Not authenticated
- `403` - Unauthorized access
- `404` - Payment/order not found
- `500` - Server error

## 🔄 Order Status Flow

### Stripe Payment
```
Payment Intent Created → Order Created (pending) → 
Payment Succeeded → Order Status: Processing (paid) →
Delivered → Order Status: Delivered
```

### Failed Payment
```
Payment Failed → Order Status: Cancelled (failed)
```

## 📞 Support

For Stripe integration issues:
1. Check Stripe Dashboard logs
2. Verify webhook endpoint is accessible
3. Check environment variables
4. Review server logs for detailed errors

## 🎯 Next Steps

1. Update frontend to integrate Stripe.js
2. Add payment method selection in checkout
3. Implement payment confirmation UI
4. Add payment history for users
5. Set up Stripe Dashboard monitoring
