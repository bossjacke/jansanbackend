import express from "express";
import { authMiddleware } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentById,
  getPaymentByIntentId,
  getUserPayments,
  processRefund,
  getAllPayments,
  getUserPaymentsForAdmin
} from '../controllers/payment.controller.js';

const router = express.Router();

// User Routes
router.post("/create-payment-intent", authMiddleware, createPaymentIntent);
router.post("/confirm", authMiddleware, confirmPayment);
router.get("/my", authMiddleware, getUserPayments);

// Admin Routes (must come before /:paymentId to avoid conflicts)
router.post("/refund", authMiddleware, roleCheck(['admin']), processRefund);
router.get("/admin/all", authMiddleware, roleCheck(['admin']), getAllPayments);
router.get("/admin/user/:userId", authMiddleware, roleCheck(['admin']), getUserPaymentsForAdmin);

// Stripe Config (for frontend)
router.get("/stripe-config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Payment by Intent ID (for success page)
router.get("/by-intent/:paymentIntentId", authMiddleware, getPaymentByIntentId);

// Dynamic Routes (must come after specific routes)
router.get("/:paymentId", authMiddleware, getPaymentById);

export default router;
