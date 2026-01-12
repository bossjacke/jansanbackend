import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSummary
} from '../controllers/cart.controller.js';

const router = express.Router();

router.get('/', authMiddleware, getCart);
router.post('/add', authMiddleware, addToCart);
router.put('/item/:itemId', authMiddleware, updateCartItem);
router.delete('/item/:itemId', authMiddleware, removeFromCart);
router.delete('/clear', authMiddleware, clearCart);
router.get('/summary', authMiddleware, getCartSummary);

export default router;

