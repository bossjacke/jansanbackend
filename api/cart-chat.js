import connectDB from './_utils/db.js';
import { authenticate } from './_utils/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary
} from '../src/controllers/cart.controller.js';
import { sendMessage } from '../src/controllers/chat.controller.js';

// Cart functions
async function handleCart(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        if (req.query.summary === 'true') {
          return await getCartSummary(req, res);
        }
        return await getCart(req, res);
      
      case 'POST':
        return await addToCart(req, res);
      
      case 'PUT':
        return await updateCartItem(req, res);
      
      case 'DELETE':
        if (req.query.clear === 'true') {
          return await clearCart(req, res);
        }
        return await removeFromCart(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Cart API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

// Chat function
async function handleChat(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
    return await sendMessage(req, res);
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
}

// Main handler
export default async function handler(req, res) {
  await connectDB();

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    switch (pathname) {
      case '/api/cart':
      case '/api/cart/':
        // Apply authentication for cart
        const authResult = await authenticate(req);
        if (!authResult.success) {
          return res.status(401).json({ success: false, message: authResult.message });
        }
        req.user = authResult.user;
        return await handleCart(req, res);
      
      case '/api/chat':
      case '/api/chat/':
        // Apply authentication for chat
        const chatAuthResult = await authenticate(req);
        if (!chatAuthResult.success) {
          return res.status(401).json({ success: false, message: chatAuthResult.message });
        }
        req.user = chatAuthResult.user;
        return await handleChat(req, res);
      
      default:
        return res.status(404).json({ success: false, message: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Cart-Chat API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}
