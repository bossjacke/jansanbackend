# 🚀 Vercel Deployment Guide

## ✅ What I Fixed

The 404 errors were caused by **missing API implementation files**. Your backend had empty folders for several API endpoints. I've created all the missing API files and **optimized for Vercel's 12-function limit**:

### Optimized API Structure (8 Functions Total):
- ✅ `api/auth.js` - Combined auth (register, login, google-login)
- ✅ `api/cart-chat.js` - Combined cart + chat functionality
- ✅ `api/orders.js` - Order management (GET, POST, PUT, DELETE)
- ✅ `api/payment.js` - Payment processing (GET, POST)
- ✅ `api/products.js` - Full CRUD operations
- ✅ `api/users.js` - User management (GET, PUT, DELETE)
- ✅ `api/health.js` - Environment status check
- ✅ `api/webhooks.js` - Stripe webhook handler

### Fixed Issues:
1. **404 Errors**: All API endpoints now have proper implementations
2. **Function Count**: Reduced from 15+ to 8 functions (within Vercel limits)
3. **Authentication**: Added proper JWT verification and admin role checks
4. **Database Connection**: All endpoints now properly connect to MongoDB
5. **Error Handling**: Consistent error responses across all APIs
6. **CORS Headers**: Properly configured in all functions

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Vercel account** ([vercel.com](https://vercel.com))
3. **MongoDB Atlas** database
4. **Stripe account** (for payments)
5. **Gemini API key** (for AI chat)

## 🗝️ Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_super_secret_jwt_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GEMINI_API_KEY=your_gemini_api_key
```

## 🚀 Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
# Deploy to preview (for testing)
vercel

# Deploy to production
vercel --prod
```

## 🧪 Testing Your Deployment

### Method 1: Use the Test Script
```bash
# Replace with your actual Vercel URL
node test-api.js https://your-project.vercel.app
```

### Method 2: Manual Testing

#### 1. Health Check (No auth required)
```bash
curl https://your-project.vercel.app/api/health
```
Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "message": "Server is running",
  "timestamp": "2024-01-13T12:00:00.000Z",
  "nodeEnv": "production",
  "environment": {
    "allConfigured": true,
    "configured": ["MONGO_URI", "JWT_SECRET", "STRIPE_SECRET_KEY", "GEMINI_API_KEY"],
    "missing": []
  }
}
```

#### 2. Get Products (No auth required)
```bash
curl https://your-project.vercel.app/api/products
```

#### 3. Register User (No auth required)
```bash
curl -X POST https://your-project.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "test123",
    "location": "Chennai"
  }'
```

#### 4. Login (No auth required)
```bash
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

#### 5. Test Protected Endpoint (Auth required)
```bash
# First get token from login, then:
curl -X GET https://your-project.vercel.app/api/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 🔧 Stripe Webhook Setup (IMPORTANT!)

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://your-project.vercel.app/api/webhooks/stripe`
3. **Select events**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.dispute.created`
   - `charge.refunded`
4. **Copy webhook secret** and add as `STRIPE_WEBHOOK_SECRET` in Vercel

## 📊 API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | User registration |
| POST | `/api/auth/login` | ❌ | User login |
| GET | `/api/products` | ❌ | Get all products |
| POST | `/api/products` | ✅ Admin | Create product |
| GET | `/api/products/:id` | ❌ | Get product by ID |
| PUT | `/api/products/:id` | ✅ Admin | Update product |
| DELETE | `/api/products/:id` | ✅ Admin | Delete product |
| GET | `/api/cart` | ✅ | Get user cart |
| POST | `/api/cart` | ✅ | Add item to cart |
| PUT | `/api/cart` | ✅ | Update cart item |
| DELETE | `/api/cart` | ✅ | Remove/clear cart |
| GET | `/api/orders` | ✅ | Get user orders |
| POST | `/api/orders` | ✅ | Create order |
| GET | `/api/payment` | ✅ | Get
