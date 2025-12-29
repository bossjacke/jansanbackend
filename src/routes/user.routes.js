import express from "express";
import {getUserProfile,updateUserProfile,deleteUser,getAllUsers} from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = express.Router();

// Protected routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);

// Admin only routes
router.get("/", authMiddleware, roleCheck(['admin']), getAllUsers);
router.delete("/:userId", authMiddleware, roleCheck(['admin']), deleteUser);

export default router;
