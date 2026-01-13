import connectDB from '../_utils/db.js';
import Order from '../../src/models/order.model.js';
import Cart from '../../src/models/cart.model.js';
import Product from '../../src/models/product.model.js';
import User from '../../src/models/user.model.js';
import { withAuth } from '../_utils/auth.js';

// POST /api/orders - Create order
// GET /api/orders/my - Get user's orders

export default async function handler(req, res) {
  // POST /api/orders - Create order
  if (req.method === 'POST') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        if (!req.body || Object.keys(req.body).length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Request body is empty',
          });
        }

        const { shippingAddress, items, totalAmount, paymentMethod, paymentIntentId } = req.body;

        // Validate payment method
        const validPaymentMethods = ['cash_on_delivery', 'stripe', 'online_payment'];
        if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
          return res.status(400).json({
            success: false,
            message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
          });
        }

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Order must contain at least one item',
          });
        }

        if (!shippingAddress) {
          return res.status(400).json({
            success: false,
            message: 'Shipping address is required',
          });
        }

        if (!totalAmount || totalAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Order total amount must be greater than 0',
          });
        }

        // Extract product IDs
        const productIds = items.map((item) => {
          if (typeof item.productId === 'string') {
            return item.productId;
          } else if (typeof item.productId === 'object' && item.productId._id) {
            return item.productId._id.toString();
          }
          return String(item.productId || '');
        });

        // Fetch and validate products
        const products = await Product.find({ _id: { $in: productIds } });

        if (products.length !== productIds.length) {
          const foundIds = products.map((p) => p._id.toString());
          const missingIds = productIds.filter((id) => !foundIds.includes(id));
          return res.status(400).json({
            success: false,
            message: `Some products not found in database`,
          });
        }

        // Build order products with stock validation
        const orderProducts = [];
        for (const requestItem of items) {
          let itemProductId = requestItem.productId;
          if (typeof itemProductId === 'object' && itemProductId._id) {
            itemProductId = itemProductId._id.toString();
          } else {
            itemProductId = String(itemProductId);
          }

          const product = products.find((p) => p._id.toString() === itemProductId);

          if (!product) {
            return res.status(400).json({
              success: false,
              message: `Product ${itemProductId} not found`,
            });
          }

          if (product.stock < requestItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `${product.name} - insufficient stock (need ${requestItem.quantity}, available ${product.stock})`,
            });
          }

          orderProducts.push({
            productId: product._id,
            quantity: requestItem.quantity,
            price: requestItem.price || product.price || 0,
          });
        }

        // Get user for address
        const user = await User.findById(req.user.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        const finalShippingAddress = {
          fullName: shippingAddress?.fullName || user?.name || '',
          phone: shippingAddress?.phone || user?.phone || '',
          addressLine1: shippingAddress?.addressLine1 || user?.location || '',
          city: shippingAddress?.city || user?.city || '',
          postalCode: shippingAddress?.postalCode || user?.postalCode || '',
          country: shippingAddress?.country || user?.country || 'India',
        };

        // Validate shipping address
        const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'postalCode'];
        const missingFields = requiredFields.filter((field) => !finalShippingAddress[field]);

        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Missing shipping address: ${missingFields.join(', ')}`,
          });
        }

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create order
        const order = await Order.create({
          userId: req.user.id,
          orderNumber,
          products: orderProducts,
          totalAmount,
          paymentMethod: paymentMethod || 'cash_on_delivery',
          stripePaymentId: paymentIntentId || null,
          deliveryLocation: user?.location || finalShippingAddress.addressLine1,
          shippingAddress: finalShippingAddress,
          orderStatus: 'Processing',
          paymentStatus: paymentMethod === 'stripe' || paymentMethod === 'online_payment' ? 'pending' : 'pending',
        });

        // Clear cart
        try {
          await Cart.findOneAndUpdate(
            { userId: req.user.id },
            { items: [], totalAmount: 0 },
            { new: true }
          );
        } catch (cartError) {
          console.warn('Warning: Error clearing cart (non-critical):', cartError.message);
        }

        // Fetch complete order
        const populatedOrder = await Order.findById(order._id).populate(
          'products.productId',
          'name type description images image price'
        );

        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: populatedOrder,
        });
      } catch (error) {
        console.error('Create order error:', error);

        if (error.name === 'ValidationError') {
          const fieldErrors = Object.keys(error.errors).map((field) => ({
            field,
            message: error.errors[field].message,
          }));
          return res.status(400).json({
            success: false,
            message: 'Order validation failed',
            errors: fieldErrors,
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Error creating order',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  // GET /api/orders/my - Get user's orders
  if (req.method === 'GET') {
    const authHandler = withAuth(async (req, res) => {
      try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const status = url.searchParams.get('status');

        const query = { userId: req.user.id };
        if (status) {
          query.orderStatus = status;
        }

        const orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('products.productId', 'name type description images image');

        const total = await Order.countDocuments(query);

        return res.status(200).json({
          success: true,
          message: 'Orders fetched successfully',
          data: {
            orders,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(total / limit),
              totalOrders: total,
              hasNextPage: page * limit < total,
              hasPrevPage: page > 1,
            },
          },
        });
      } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching orders',
          error: error.message,
        });
      }
    });

    return authHandler(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

