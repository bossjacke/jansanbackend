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

router.post("/create", authMiddleware, createOrder);
router.get("/my", authMiddleware, getMyOrders);
router.get("/admin/orders", authMiddleware, roleCheck(['admin']), getAllOrders);
router.get("/:orderId", authMiddleware, getOrderById);
router.put("/:orderId/status", authMiddleware, roleCheck(['admin']), updateOrderStatus);
router.delete("/:orderId/cancel", authMiddleware, cancelOrder);

export default router;

