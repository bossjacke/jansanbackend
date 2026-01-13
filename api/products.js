import connectDB from '../_utils/db.js';
import Product from '../../src/models/product.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// Vercel config
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/');
  const productId = pathParts[pathParts.length - 1];
  const isProductIdRoute = productId && productId !== '' && productId !== 'products';

  // GET /api/products/:id
  if (req.method === 'GET' && isProductIdRoute) {
    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    try {
      await connectDB();

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product fetched successfully',
        data: product,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: error.message,
      });
    }
  }

  // PUT /api/products/:id
  if (req.method === 'PUT' && isProductIdRoute) {
    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const updated = await Product.findByIdAndUpdate(productId, req.body, {
          new: true,
        });

        if (!updated) {
          return res.status(404).json({
            success: false,
            message: 'Product not found',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Product updated successfully',
          data: updated,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({
          success: false,
          message: 'Error updating product',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // DELETE /api/products/:id
  if (req.method === 'DELETE' && isProductIdRoute) {
    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        await Product.findByIdAndDelete(productId);

        return res.status(200).json({
          success: true,
          message: 'Product deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
          success: false,
          message: 'Error deleting product',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/products - Get all products
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

