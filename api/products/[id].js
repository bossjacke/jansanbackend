import connectDB from '../_utils/db.js';
import Product from '../../src/models/product.model.js';
import { withAuth, withRole } from '../_utils/auth.js';

// GET /api/products/:id - Get product by ID
// PUT /api/products/:id - Update product (admin)
// DELETE /api/products/:id - Delete product (admin)

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required',
    });
  }

  // GET - Get product by ID
  if (req.method === 'GET') {
    try {
      await connectDB();

      const product = await Product.findById(id);

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

  // PUT - Update product (admin only)
  if (req.method === 'PUT') {
    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        const updated = await Product.findByIdAndUpdate(id, req.body, {
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

  // DELETE - Delete product (admin only)
  if (req.method === 'DELETE') {
    const authHandler = withRole('admin')(async (req, res) => {
      try {
        await connectDB();

        await Product.findByIdAndDelete(id);

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

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

