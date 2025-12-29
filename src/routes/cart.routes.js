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

// Get user's cart
router.get('/', authMiddleware, getCart);

// Add item to cart
router.post('/add', authMiddleware, addToCart);

// Update cart item quantity
router.put('/item/:itemId', authMiddleware, updateCartItem);

// Remove item from cart
router.delete('/item/:itemId', authMiddleware, removeFromCart);

// Clear entire cart
router.delete('/clear', authMiddleware, clearCart);

// Get cart summary
router.get('/summary', authMiddleware, getCartSummary);

export default router;
