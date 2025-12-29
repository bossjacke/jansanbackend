import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import passwordRoutes from "./routes/password.routes.js";
import orderRoutes from "./routes/order.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { handleStripeWebhook } from "./middleware/stripe.webhook.js";

dotenv.config();
const app = express();

// Enable CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5177", "http://localhost:5178", "http://localhost:5179"], // For development, allows all. Change to frontend URL in production.
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());

// Stripe Webhook (must be before express.json middleware for raw body)
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/password", passwordRoutes); // Password reset routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payment", paymentRoutes);

// Database connection
console.log('🔗 Initializing database connection...');
connectDB().catch(err => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
});

export default app;
