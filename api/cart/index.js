import connectDB from '../_utils/db.js';
import Cart from '../../src/models/cart.model.js';
import Product from '../../src/models/product.model.js';
import { withAuth } from '../_utils/auth.js';

function makeHandler(authenticatedHandler) {
  return async (req, res) => {
    const authResult = authenticatedHandler(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({
        success: false,
        message: authResult.error,
      });
    }
    req.user = authResult.user;
    return authenticatedHandler(req, res);
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const authHandler = makeHandler(async (req, res) => {
      try {
        await connectDB();
        let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId', 'name price images image');
        if (!cart) {
          cart = await Cart.create({ userId: req.user.id, items: [], totalAmount: 0 });
        }
        return res.status(200).json({
          success: true,
          message: 'Cart fetched successfully',
          data: cart,
        });
      } catch (error) {
        console.error('Error fetching cart:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching cart',
          error: error.message,
        });
      }
    });
    return authHandler(req, res);
  }

  if (req.method === 'POST') {
    const authHandler = makeHandler(async (req, res) => {
      try {
        await connectDB();
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required',
          });
        }

        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found',
          });
        }

        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
          cart = await Cart.create({ userId: req.user.id, items: [], totalAmount: 0 });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.items.push({ productId, quantity, price: product.price });
        }

        cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        await cart.populate('items.productId', 'name price images image');

        return res.status(200).json({
          success: true,
          message: 'Item added to cart successfully',
          data: cart,
        });
      } catch (error) {
        console.error('Error adding to cart:', error);
        return res.status(500).json({
          success: false,
          message: 'Error adding to cart',
          error: error.message,
        });
      }
    });
    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
