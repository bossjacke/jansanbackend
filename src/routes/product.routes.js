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

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', authMiddleware, roleCheck(['admin']), createProduct);
router.put('/:id', authMiddleware, roleCheck(['admin']), updateProduct);
router.delete('/:id', authMiddleware, roleCheck(['admin']), deleteProduct);

export default router;

