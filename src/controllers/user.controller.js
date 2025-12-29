import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret";

// ✅ Register
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, location } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "Email already registered" });

    // Validate required fields for customer role
    const effectiveRole = role || "customer";
    if (effectiveRole === "customer" && !location) {
      return res.status(400).json({ success: false, message: "Location is required for customers" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: effectiveRole,
      location,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ✅ Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
    try {
      const userId = req.user.id; // token-la irunthu id vaanguradhu
      const user = await User.findById(userId).select("-password"); // password illa fetch
  
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
  
      res.status(200).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  };

// Update Profile
export const updateUserProfile = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    res.json({ success: true, message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

// Get All Users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Admin only." 
      });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching users", 
      error: error.message 
    });
  }
};

// Delete User (Admin only) - Enhanced Version
export const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Admin only." 
      });
    }

    const { userId } = req.params;
    
    // Validate userId
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID format" 
      });
    }

    // Check if user exists
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: "Cannot delete your own account" 
      });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({ 
      success: true,
      message: "User deleted successfully",
      deletedUser: {
        id: userToDelete._id,
        name: userToDelete.name,
        email: userToDelete.email,
        role: userToDelete.role
      }
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting user", 
      error: error.message 
    });
  }
};
