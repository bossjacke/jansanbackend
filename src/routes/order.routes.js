import express from "express";
import { authMiddleware } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getAllOrders
} from '../controllers/order.controller.js';

const router = express.Router();

// POST /api/order/create - Create order from cart
router.post("/create", authMiddleware, createOrder);

// GET /api/order/my - Get logged-in user's orders
router.get("/my", authMiddleware, getMyOrders);

// GET /api/order/admin/orders - Get all orders (Admin only) - MUST BE BEFORE /:orderId
router.get("/admin/orders", authMiddleware, roleCheck(['admin']), getAllOrders);

// GET /api/order/:orderId - Get specific order
router.get("/:orderId", authMiddleware, getOrderById);

// PUT /api/order/:orderId/status - Update order status (Admin only)
router.put("/:orderId/status", authMiddleware, roleCheck(['admin']), updateOrderStatus);

// DELETE /api/order/:orderId/cancel - Cancel order (User only)
router.delete("/:orderId/cancel", authMiddleware, cancelOrder);

export default router;
