import express from 'express';
import { registerUser, loginUser } from '../controllers/user.controller.js';
import { googleLogin } from '../controllers/googleAuth.controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);

export default router;

