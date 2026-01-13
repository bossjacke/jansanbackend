# Vercel Serverless Backend - TODO List

## Completed ✅
- [x] Analyzed existing codebase structure
- [x] Reviewed all API handlers in api/ folder
- [x] Verified MongoDB cached connection utility
- [x] Verified Stripe webhook handler configuration
- [x] Updated `vercel.json` with maxDuration and proper routing
- [x] **Combined API files to reduce function count from 15+ to 8**
  - `api/auth.js` - register, login, google-login
  - `api/products.js` - all product CRUD
  - `api/users.js` - user profile, admin user management
  - `api/orders.js` - order CRUD
  - `api/payments.js` - payment intents, refunds, admin
  - `api/cart-chat.js` - cart + chat endpoints
  - `api/webhooks/stripe.js` - Stripe webhook
  - `api/health.js` - health check

## Remaining Tasks 📋

### Documentation

---

## Deployment Instructions

### Prerequisites
- Node.js 18+ installed
- Vercel account
- MongoDB Atlas account
- Stripe account

### Step 1: Setup Environment Variables

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables one by one
vercel env add MONGO_URI
vercel env add JWT_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GEMINI_API_KEY
```

**Option B: Using Vercel Dashboard**
1. Go to [Vercel Dashboard](https://dashboard.vercel.com)
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable from `.env.example`

### Step 2: Deploy to Vercel

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 3: Stripe Webhook Setup (IMPORTANT!)

1. **Go to Stripe Dashboard**
   - Navigate to: https://dashboard.stripe.com/webhooks

2. **Add Webhook Endpoint**
   - Click "Add endpoint"
   - URL: `https://your-project.vercel.app/api/webhooks/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.dispute.created`
     - `charge.refunded`

3. **Copy Webhook Secret**
   - After creating, click "Reveal" next to signing secret
   - Copy the secret (starts with `whsec_`)
   - Add as `STRIPE_WEBHOOK_SECRET` in Vercel

4. **Test Webhook**
   - Click "Send test webhook" in Stripe
   - Select an event type
   - Check Vercel function logs for success

### Step 4: Verify Deployment

1. **Health Check**
   ```bash
   curl https://your-project.vercel.app/api/health
   ```

2. **Test Registration**
   ```bash
   curl -X POST https://your-project.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","phone":"1234567890","password":"test123","location":"Chennai"}'
   ```

3. **Check Vercel Logs**
   - Dashboard → Project → Functions
   - Look for any errors

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | User registration |
| POST | `/api/auth/login` | ❌ | User login |
| POST | `/api/auth/google-login` | ❌ | Google OAuth login |
| GET | `/api/products` | ❌ | Get all products |
| POST | `/api/products` | ✅ Admin | Create product |
| GET | `/api/products/:id` | ❌ | Get product by ID |
| PUT | `/api/products/:id` | ✅ Admin | Update product |
| DELETE | `/api/products/:id` | ✅ Admin | Delete product |
| GET | `/api/cart` | ✅ | Get user cart |
| POST | `/api/cart` | ✅ | Add item to cart |
| PUT | `/api/cart` | ✅ | Update cart item |
| DELETE | `/api/cart` | ✅ | Clear cart |
| GET | `/api/orders` | ✅ | Get user orders |
| POST | `/api/orders` | ✅ | Create order |
| GET | `/api/payment/my` | ✅ | Get user payments |
| POST | `/api/payment/create-payment-intent` | ✅ | Create Stripe payment |
| POST | `/api/webhooks/stripe` | ❌ | Stripe webhook handler |
| GET | `/api/users/profile` | ✅ | Get user profile |
| PUT | `/api/users/profile` | ✅ | Update profile |
| GET | `/api/chat` | ✅ | AI chat (Gemini) |

## Verification Steps (After Deployment)

### 1. Health Check
```
GET https://your-domain.vercel.app/api/health
```
Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "environment": {
    "allConfigured": true
  }
}
```

### 2. MongoDB Connection Test
```
POST https://your-domain.vercel.app/api/auth/register
Body: {
  "name": "Test",
  "email": "test@example.com",
  "phone": "1234567890",
  "password": "test123",
  "location": "Chennai"
}
```
Expected: `201 Created` with user data

### 3. Stripe Webhook Test
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Send test webhook"
3. Send `payment_intent.succeeded` event
4. Check Vercel function logs for success

### 4. Login Test
```
POST https://your-domain.vercel.app/api/auth/login
Body: {
  "email": "test@example.com",
  "password": "test123"
}
```
Expected: `200 OK` with JWT token

### 5. Products Test (with Auth)
```
GET https://your-domain.vercel.app/api/products
Header: Authorization: Bearer <token>
```
Expected: `200 OK` with products array

### 6. Check Vercel Logs
- Go to Vercel Dashboard → Your Project → Functions
- Check for any errors in function logs
- Ensure no timeout issues

### Common Issues:
| Issue | Solution |
|-------|----------|
| MongoDB timeout | Check `MONGODB_URI` env var format |
| 401 Unauthorized | Check `JWT_SECRET` matches locally |
| Stripe webhook fails | Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |
| Cold start slow | Normal for first request (max 10-15s) |

