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

router.post("/create-payment-intent", authMiddleware, createPaymentIntent);
router.post("/confirm", authMiddleware, confirmPayment);
router.get("/my", authMiddleware, getUserPayments);
router.post("/refund", authMiddleware, roleCheck(['admin']), processRefund);
router.get("/admin/all", authMiddleware, roleCheck(['admin']), getAllPayments);
router.get("/admin/user/:userId", authMiddleware, roleCheck(['admin']), getUserPaymentsForAdmin);
router.get("/stripe-config", (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});
router.get("/by-intent/:paymentIntentId", authMiddleware, getPaymentByIntentId);
router.get("/:paymentId", authMiddleware, getPaymentById);

export default router;

