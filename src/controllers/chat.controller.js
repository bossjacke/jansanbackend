import { getChatResponse } from '../services/gemini.service.js';

// Handle chat message and get AI response
export const sendMessage = async (req, res) => {
  try {
    console.log('Chat request received:', req.body);
    
    const { message } = req.body;

    // Validate input
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Get response from service
    const aiResponse = getChatResponse(message.trim());
    console.log('Service response:', aiResponse);

    // Return the response
    res.status(200).json({
      success: true,
      reply: aiResponse
    });

  } catch (error) {
    console.error('Chat Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      reply: 'Sorry, something went wrong. Please try again later.'
    });
  }
};

export default {
  sendMessage
};
