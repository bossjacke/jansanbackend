import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "inr" // Changed to INR for Indian payments
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet"],
      default: "card"
    },
    description: String,
    metadata: {
      type: Map,
      of: String
    },
    failureReason: String,
    receiptEmail: String,
    stripeChargeId: String,
    refundId: String,
    refundAmount: {
      type: Number,
      min: 0
    },
    refundReason: String,
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for formatted amount (INR)
paymentSchema.virtual('formattedAmount').get(function() {
  return `₹${(this.amount / 100).toFixed(2)}`; // INR format
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ orderId: 1 });

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  const now = new Date();
  if (this.isModified('status')) {
    switch (this.status) {
      case 'succeeded':
        if (!this.paidAt) this.paidAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
      case 'refunded':
        if (!this.refundedAt) this.refundedAt = now;
        break;
    }
  }
  next();
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
