import connectDB from '../_utils/db.js';
import Cart from '../../src/models/cart.model.js';
import Product from '../../src/models/product.model.js';
import { withAuth } from '../_utils/auth.js';

// Vercel config: Disable body parser for raw body handling
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET /api/cart - Get user's cart
// POST /api/cart - Add item to cart
// PUT /api/cart - Update cart item
// DELETE /api/cart - Clear cart

export default async function handler(req, res) {
  // GET /api/cart - Get user's cart
  if (req.method === 'GET') {
    const authHandler = withAuth(async (req, res) => {
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

  // POST /api/cart - Add item to cart
  if (req.method === 'POST') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const { productId, quantity = 1 } = req.body;

        if (!productId) {
          return res.status(400).json({
            success: false,
            message: 'Product ID is required',
          });
        }

        // Validate product exists and has stock
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found',
          });
        }

        if (product.stock < quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${product.stock}`,
          });
        }

        // Get or create cart
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
          cart = await Cart.create({ userId: req.user.id, items: [], totalAmount: 0 });
        }

        // Check if product already in cart
        const existingItem = cart.items.find(item => item.productId.toString() === productId);

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          cart.items.push({
            productId,
            quantity,
            price: product.price,
          });
        }

        // Recalculate total
        cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();

        // Populate product details
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

  // PUT /api/cart - Update cart item
  if (req.method === 'PUT') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const { productId, quantity } = req.body;

        if (!productId || quantity === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Product ID and quantity are required',
          });
        }

        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) {
          return res.status(404).json({
            success: false,
            message: 'Cart not found',
          });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Item not found in cart',
          });
        }

        if (quantity <= 0) {
          // Remove item
          cart.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          cart.items[itemIndex].quantity = quantity;
        }

        // Recalculate total
        cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();

        await cart.populate('items.productId', 'name price images image');

        return res.status(200).json({
          success: true,
          message: 'Cart updated successfully',
          data: cart,
        });
      } catch (error) {
        console.error('Error updating cart:', error);
        return res.status(500).json({
          success: false,
          message: 'Error updating cart',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // DELETE /api/cart - Clear cart
  if (req.method === 'DELETE') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        await Cart.findOneAndUpdate(
          { userId: req.user.id },
          { items: [], totalAmount: 0 },
          { new: true }
        );

        return res.status(200).json({
          success: true,
          message: 'Cart cleared successfully',
        });
      } catch (error) {
        console.error('Error clearing cart:', error);
        return res.status(500).json({
          success: false,
          message: 'Error clearing cart',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
