import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/product.controller.js';

const router = express.Router();

// GET /api/products → Return Bio-Gas and Fertilizer (Public)
router.get('/', getAllProducts);

// GET /api/products/:id → Get single product (Public)
router.get('/:id', getProductById);

// POST /api/products → Create product (admin only)
router.post('/', authMiddleware, roleCheck(['admin']), createProduct);

// PUT /api/products/:id → Update product (admin only)
router.put('/:id', authMiddleware, roleCheck(['admin']), updateProduct);

// DELETE /api/products/:id → Delete product (admin only)
router.delete('/:id', authMiddleware, roleCheck(['admin']), deleteProduct);

export default router;
