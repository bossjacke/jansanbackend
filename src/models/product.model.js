import mongoose from "mongoose";

// Product Schema for both Biogas and Fertilizer
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Biogas Unit / Fertilizer
    type: { type: String, enum: ["biogas", "fertilizer"], required: true },
    capacity: { type: String }, // For biogas only
    price: { type: Number, required: true },
    warrantyPeriod: { type: String }, // For biogas only
    description: { type: String },
    stock: { type: Number, required: true, default: 0 }, // Available stock
    images: [{ type: String }], // Product image URLs (optional)
    image: { type: String }, // Product image URL (optional) - for backward compatibility
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
