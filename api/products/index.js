import connectDB from '../_utils/db.js';
import Product from '../../src/models/product.model.js';

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

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
