import logger from "../utils/logger.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import stripe from "stripe";

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Create Payment Intent
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, orderId, currency = "inr", metadata = {} } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    // Fetch user data to get email
    const user = await User.findById(req.user.id).select('email');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Validate user email exists
    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "User email is required for payment processing"
      });
    }

    const amountInPaise = Math.round(amount * 100); // INR uses paise (100 paise = 1 INR)

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInPaise,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.user.id, orderId: orderId || "", ...metadata },
      receipt_email: user.email
    });

    const payment = await Payment.create({
      userId: req.user.id,
      orderId: orderId || null,
      stripePaymentIntentId: paymentIntent.id,
      amount: amountInPaise,
      currency: currency,
      status: "pending",
      receiptEmail: user.email,
      metadata: new Map(Object.entries(paymentIntent.metadata))
    });

    res.status(200).json({
      success: true,
      message: "Payment intent created successfully",
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency
      }
    });
  } catch (error) {
    logger.error("Error creating payment intent:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error creating payment intent",
      error: error.message 
    });
  }
};

// Confirm Payment
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment intent ID is required" 
      });
    }

    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ 
        success: false, 
        message: "Payment not successful",
        status: paymentIntent.status 
      });
    }

    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
      {
        status: "succeeded",
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        orderId: orderId || null
      },
      { new: true }
    ).populate('orderId');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment record not found" 
      });
    }

    if (payment.orderId) {
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "paid",
        orderStatus: "Processing",
        stripePaymentId: paymentIntentId
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Payment confirmed successfully",
      data: payment 
    });
  } catch (error) {
    logger.error("Error confirming payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error confirming payment",
      error: error.message 
    });
  }
};

// Get Payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber totalAmount orderStatus');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment not found" 
      });
    }

    if (payment.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized to access this payment" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Payment fetched successfully",
      data: payment 
    });
  } catch (error) {
    logger.error("Error fetching payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching payment",
      error: error.message 
    });
  }
};

// Get Payment by Payment Intent ID
export const getPaymentByIntentId = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId })
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber totalAmount orderStatus');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment not found" 
      });
    }

    if (payment.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized to access this payment" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Payment fetched successfully",
      data: payment 
    });
  } catch (error) {
    logger.error("Error fetching payment by intent ID:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching payment",
      error: error.message 
    });
  }
};

// Get User Payments
export const getUserPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { userId: req.user.id };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('orderId', 'orderNumber totalAmount orderStatus')
      .populate('userId', 'name email');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: {
        payments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalPayments: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching user payments:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching payments",
      error: error.message 
    });
  }
};

// Process Refund (Admin)
export const processRefund = async (req, res) => {
  try {
    const { paymentId, reason = "Customer requested refund" } = req.body;
    const payment = await Payment.findById(paymentId).populate('orderId');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment not found" 
      });
    }

    if (payment.status !== "succeeded") {
      return res.status(400).json({ 
        success: false, 
        message: "Only successful payments can be refunded" 
      });
    }

    const refund = await stripeInstance.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: "requested_by_customer",
      metadata: { reason }
    });

    payment.status = "refunded";
    payment.refundId = refund.id;
    payment.refundAmount = refund.amount;
    payment.refundReason = reason;
    await payment.save();

    if (payment.orderId) {
      payment.orderId.orderStatus = "Refunded";
      await payment.orderId.save();
    }

    res.status(200).json({ 
      success: true, 
      message: "Refund processed successfully",
      data: {
        refundId: refund.id,
        refundAmount: refund.amount,
        payment: payment
      }
    });
  } catch (error) {
    logger.error("Error processing refund:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error processing refund",
      error: error.message 
    });
  }
};

// Get All Payments (Admin)
export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber totalAmount orderStatus');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "All payments fetched successfully",
      data: {
        payments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalPayments: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching all payments:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching payments",
      error: error.message 
    });
  }
};

// Get User Payments (Admin)
export const getUserPaymentsForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const query = { userId: userId };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber totalAmount orderStatus');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "User payments fetched successfully",
      data: {
        payments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalPayments: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    logger.error("Error fetching user payments for admin:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching user payments",
      error: error.message 
    });
  }
};
