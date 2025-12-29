import express from 'express';
import { sendMessage } from '../controllers/chat.controller.js';

const router = express.Router();

// POST /api/chat - Send message and get AI response
router.post('/', sendMessage);

export default router;
