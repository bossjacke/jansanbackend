import { getChatResponse } from '../services/gemini.service.js';

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const aiResponse = getChatResponse(message.trim());

    res.status(200).json({
      success: true,
      reply: aiResponse
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      reply: 'Sorry, something went wrong. Please try again later.'
    });
  }
};

