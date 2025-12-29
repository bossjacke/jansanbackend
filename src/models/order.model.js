import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    orderNumber: {
      type: String,
      required: true
    },

    products: [
      {
        productId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Product", 
          required: true 
        },
        quantity: { 
          type: Number, 
          required: true, 
          min: 1 
        },
        price: { 
          type: Number, 
          required: true,
          min: 0
        },
      },
    ],

    totalAmount: { 
      type: Number, 
      required: true, 
      min: 0 
    },

    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "stripe", "online_payment"],
      required: true,
      default: "cash_on_delivery"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled", "refunded"],
      default: "pending"
    },

    // Stripe payment integration
    stripePaymentId: {
      type: String
    },

    deliveryLocation: {
      type: String,
      required: true
    },

    orderStatus: {
      type: String,
      enum: ["Processing", "Delivered", "Cancelled"],
      default: "Processing"
    },


    shippingAddress: {
      fullName: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      addressLine1: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      postalCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        default: "India"
      },
    },

    deliveryDate: Date,
    
    // Track order timeline
    statusHistory: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      note: String
    }],

    // Order notes for admin
    adminNotes: String
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate order number before saving
orderSchema.pre('save', function(next) {
    if (this.isNew && !this.orderNumber) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9).toUpperCase();
        this.orderNumber = `ORD-${timestamp}-${random}`;
    }
    next();
});

// Calculate total amount before saving
orderSchema.pre('save', function(next) {
    if (this.isModified('products') && this.products) {
        this.totalAmount = this.products.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }
    next();
});

// Add status history when order status changes
orderSchema.pre('save', function(next) {
    if (this.isModified('orderStatus') && !this.isNew) {
        this.statusHistory.push({
            status: this.orderStatus,
            timestamp: new Date(),
            note: `Order status changed to ${this.orderStatus}`
        });
    }
    next();
});

// Virtual for formatted total amount
orderSchema.virtual('formattedTotal').get(function() {
    return `₹${this.totalAmount.toLocaleString()}`;
});

// Virtual for estimated delivery date
orderSchema.virtual('estimatedDelivery').get(function() {
    if (this.deliveryDate) {
        return this.deliveryDate;
    }
    const estimated = new Date(this.createdAt);
    estimated.setDate(estimated.getDate() + 3);
    return estimated;
});

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
