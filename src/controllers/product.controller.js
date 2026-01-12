import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true, 
      message: "Products fetched successfully", 
      data: products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching products", 
      error: error.message 
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ 
      success: false, 
      message: "Product not found" 
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Product fetched successfully", 
      data: product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching product", 
      error: error.message 
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ 
      success: true, 
      message: "Product created successfully", 
      data: product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error creating product", 
      error: error.message 
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ 
      success: false, 
      message: "Product not found" 
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Product updated successfully", 
      data: updated 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error updating product", 
      error: error.message 
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ 
      success: true, 
      message: "Product deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error deleting product", 
      error: error.message 
    });
  }
};

