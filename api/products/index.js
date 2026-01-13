import connectDB from '../_utils/db.js';
import Product from '../../src/models/product.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// Vercel config: Disable body parser for raw body handling (if needed)
export const config = {
  api: {
    bodyParser: false,
  },
};

// GET /api/products - Get all products
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await connectDB();

      const products = await Product.find().sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        data: products,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: error.message,
      });
    }
  }

  // POST /api/products - Create product (admin only)
  if (req.method === 'POST') {
    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const product = await Product.create(req.body);

        return res.status(201).json({
          success: true,
          message: 'Product created successfully',
          data: product,
        });
      } catch (error) {
        console.error('Error creating product:', error);
        return res.status(500).json({
          success: false,
          message: 'Error creating product',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

