import logger from "../utils/logger.js";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

// ==================== CREATE ORDER ====================
export const createOrder = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty"
      });
    }

    const { shippingAddress, items, totalAmount, paymentMethod, paymentIntentId } = req.body;

    // Validate payment method
    const validPaymentMethods = ["cash_on_delivery", "stripe", "online_payment"];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // Validate required fields from frontend
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item"
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order total amount must be greater than 0"
      });
    }

    logger.info("Creating order for user:", req.user.id);

    // Extract product IDs from request items
    const productIds = items.map(item => {
      if (typeof item.productId === 'string') {
        return item.productId;
      } else if (typeof item.productId === 'object' && item.productId._id) {
        return item.productId._id.toString();
      } else {
        return String(item.productId || '');
      }
    });

    // Fetch products from database to validate stock
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p._id.toString());
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        success: false,
        message: `Some products not found in database`
      });
    }

    // Build order products and validate stock
    const orderProducts = [];

    for (const requestItem of items) {
      let itemProductId = requestItem.productId;
      if (typeof itemProductId === 'object' && itemProductId._id) {
        itemProductId = itemProductId._id.toString();
      } else {
        itemProductId = String(itemProductId);
      }

      const product = products.find(p => p._id.toString() === itemProductId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${itemProductId} not found`
        });
      }

      // Check stock
      if (product.stock < requestItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} - insufficient stock (need ${requestItem.quantity}, available ${product.stock})`
        });
      }

      orderProducts.push({
        productId: product._id,
        quantity: requestItem.quantity,
        price: requestItem.price || product.price || 0
      });
    }

    // Get user for auto-fill address
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const finalShippingAddress = {
      fullName: shippingAddress?.fullName || user?.name || "",
      phone: shippingAddress?.phone || user?.phone || "",
      addressLine1: shippingAddress?.addressLine1 || user?.location || "",
      city: shippingAddress?.city || user?.city || "",
      postalCode: shippingAddress?.postalCode || user?.postalCode || "",
      country: shippingAddress?.country || user?.country || "India"
    };

    // Validate final shipping address
    const requiredFields = ['fullName', 'phone', 'addressLine1', 'city', 'postalCode'];
    const missingFields = requiredFields.filter(field => !finalShippingAddress[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing shipping address: ${missingFields.join(', ')}`
      });
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const order = await Order.create({
      userId: req.user.id,
      orderNumber: orderNumber,
      products: orderProducts,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "cash_on_delivery",
      stripePaymentId: paymentIntentId || null,
      deliveryLocation: user?.location || finalShippingAddress.addressLine1,
      shippingAddress: finalShippingAddress,
      orderStatus: "Processing",
      paymentStatus: (paymentMethod === "stripe" || paymentMethod === "online_payment") ? "pending" : "pending"
    });

    // Clear cart for user
    try {
      await Cart.findOneAndUpdate(
        { userId: req.user.id },
        { items: [], totalAmount: 0 },
        { new: true }
      );
    } catch (cartError) {
      console.error('Warning: Error clearing cart (non-critical):', cartError.message);
    }

    // Fetch complete order with populated data
    const populatedOrder = await Order.findById(order._id)
      .populate('products.productId', 'name type description images image price');

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: populatedOrder
    });
  } catch (err) {
    // If Mongoose validation error, extract field errors
    if (err.name === 'ValidationError') {
      const fieldErrors = Object.keys(err.errors).map(field => ({
        field,
        message: err.errors[field].message
      }));
      return res.status(400).json({
        success: false,
        message: "Order validation failed",
        errors: fieldErrors
      });
    }

    logger.error("CREATE ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Error creating order: " + err.message,
      error: err.message
    });
  }
};

// Get User Orders
export const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("products.productId", "name type description images image");

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    res.status(200).json({ 
      success: true, 
      message: "Orders fetched successfully",
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    logger.error("Error fetching orders:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching orders", 
      error: err.message 
    });
  }
};

// Get Single Order
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId)
      .populate("products.productId", "name type description images image")
      .populate("userId", "name email");

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Check if user owns this order or is admin
    if (order.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized to access this order" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Order fetched successfully",
      data: order 
    });

  } catch (err) {
    logger.error("Error fetching order:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching order", 
      error: err.message 
    });
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    const validStatuses = ['Processing', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Fetch order first to allow conditional updates (deliveryDate, paymentStatus)
    const order = await Order.findById(orderId).populate('products.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update fields
    order.orderStatus = status;
    order.adminNotes = adminNotes || order.adminNotes;

    // If marked Delivered, set deliveryDate
    if (status === 'Delivered') {
      order.deliveryDate = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order
    });

  } catch (err) {
    logger.error("Error updating order status:", err);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: err.message
    });
  }
};

// Cancel Order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check ownership
    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own orders"
      });
    }

    // Only allow cancellation if order is in Processing state
    if (order.orderStatus !== 'Processing') {
      return res.status(400).json({
        success: false,
        message: "Only processing orders can be cancelled"
      });
    }

    order.orderStatus = 'Cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order
    });

  } catch (err) {
    logger.error("Error cancelling order:", err);
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: err.message
    });
  }
};

// Get All Orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.orderStatus = status;
    }
    if (userId) {
      query.userId = userId;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name email phone")
      .populate("products.productId", "name type description images");

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "All orders fetched successfully",
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    logger.error("Error fetching all orders:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: err.message
    });
  }
};

