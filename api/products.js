import connectDB from '../_utils/db.js';
import { authenticate, requireAdmin } from '../_utils/auth.js';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '../../src/controllers/product.controller.js';

export default async function handler(req, res) {
  await connectDB();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    // Extract ID from URL for /api/products/:id
    const pathParts = pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    const hasId = pathParts.length === 4 && productId !== 'products';

    switch (req.method) {
      case 'GET':
        if (hasId) {
          req.params = { id: productId };
          return await getProductById(req, res);
        } else {
          return await getAllProducts(req, res);
        }
      
      case 'POST':
        // Admin only for creating products
        const authResult = await authenticate(req);
        if (!authResult.success) {
          return res.status(401).json({ success: false, message: authResult.message });
        }
        req.user = authResult.user;
        
        const adminCheck = await requireAdmin(req.user);
        if (!adminCheck.success) {
          return res.status(403).json({ success: false, message: adminCheck.message });
        }
        return await createProduct(req, res);
      
      case 'PUT':
        // Admin only for updating products
        const putAuthResult = await authenticate(req);
        if (!putAuthResult.success) {
          return res.status(401).json({ success: false, message: putAuthResult.message });
        }
        req.user = putAuthResult.user;
        
        const putAdminCheck = await requireAdmin(req.user);
        if (!putAdminCheck.success) {
          return res.status(403).json({ success: false, message: putAdminCheck.message });
        }
        if (hasId) {
          req.params = { id: productId };
        }
        return await updateProduct(req, res);
      
      case 'DELETE':
        // Admin only for deleting products
        const deleteAuthResult = await authenticate(req);
        if (!deleteAuthResult.success) {
          return res.status(401).json({ success: false, message: deleteAuthResult.message });
        }
        req.user = deleteAuthResult.user;
        
        const deleteAdminCheck = await requireAdmin(req.user);
        if (!deleteAdminCheck.success) {
          return res.status(403).json({ success: false, message: deleteAdminCheck.message });
        }
        if (hasId) {
          req.params = { id: productId };
        }
        return await deleteProduct(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
