import connectDB from './_utils/db.js';
import { authenticate, requireAdmin } from './_utils/auth.js';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getAllOrders
} from '../src/controllers/order.controller.js';

export default async function handler(req, res) {
  await connectDB();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply authentication middleware
  const authResult = await authenticate(req);
  if (!authResult.success) {
    return res.status(401).json({ success: false, message: authResult.message });
  }
  req.user = authResult.user;

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    // Extract orderId from URL for /api/orders/:orderId
    const pathParts = pathname.split('/');
    const orderId = pathParts[pathParts.length - 1];
    const hasOrderId = pathParts.length === 4 && orderId !== 'orders';

    switch (req.method) {
      case 'GET':
        if (req.query.all === 'true') {
          // Admin only
          const adminCheck = await requireAdmin(req.user);
          if (!adminCheck.success) {
            return res.status(403).json({ success: false, message: adminCheck.message });
          }
          return await getAllOrders(req, res);
        } else if (hasOrderId) {
          // Get single order
          req.params = { orderId };
          return await getOrderById(req, res);
        } else {
          // Get user's orders
          return await getMyOrders(req, res);
        }
      
      case 'POST':
        return await createOrder(req, res);
      
      case 'PUT':
        if (hasOrderId) {
          req.params = { orderId };
          // Check if this is status update (admin) or cancel (user)
          if (req.body.status !== undefined) {
            // Admin only for status update
            const adminCheck = await requireAdmin(req.user);
            if (!adminCheck.success) {
              return res.status(403).json({ success: false, message: adminCheck.message });
            }
            return await updateOrderStatus(req, res);
          } else {
            // User can cancel their own order
            return await cancelOrder(req, res);
          }
        }
        return res.status(400).json({ success: false, message: 'Order ID required' });
      
      case 'DELETE':
        if (hasOrderId) {
          req.params = { orderId };
          return await cancelOrder(req, res);
        }
        return res.status(400).json({ success: false, message: 'Order ID required' });
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}
