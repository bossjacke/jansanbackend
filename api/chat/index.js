import connectDB from '../_utils/db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withAuth } from '../_utils/auth.js';

// POST /api/chat - Send message to AI chat

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHandler = withAuth(async (req, res) => {
    try {
      await connectDB();

      const { message, context = [] } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: 'AI service not configured',
        });
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build conversation history
      const history = context.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Add current message
      history.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Generate response
      const chat = model.startChat({
        history: history.slice(0, -1), // Exclude current message from history
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      const aiMessage = response.text();

      return res.status(200).json({
        success: true,
        message: 'AI response generated successfully',
        data: {
          response: aiMessage,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Chat error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error generating AI response',
        error: error.message,
      });
    }
  });

  return authHandler(req, res);
}
