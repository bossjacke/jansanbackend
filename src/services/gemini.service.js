// Simple chat response service (without Gemini for now)
export function getChatResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Smart responses for common questions
  if (lowerMessage.includes('product') || lowerMessage.includes('what do you have')) {
    return "We offer various eco-friendly cleaning products for home and office use. Our products include surface cleaners, floor cleaners, and disinfectants that are safe for the environment!";
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
    return "Our products range from ₹100 to ₹1000 depending on type and size. We have affordable options for every budget!";
  }
  
  if (lowerMessage.includes('order') || lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
    return "You can easily order through our website! Just browse our products, add items to cart, and proceed to checkout. We accept multiple payment methods.";
  }
  
  if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
    return "We deliver across India! Standard delivery takes 3-5 business days. Express delivery is available in major cities.";
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! Welcome to Jansan Eco Solutions! How can I help you today?";
  }
  
  if (lowerMessage.includes('tamil') || lowerMessage.includes('language')) {
    return "Yes! We support both Tamil and English. How can I assist you today?";
  }
  
  if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
    return "You can reach our customer support via email at support@jansan.com or call us at +91-9876543210. We're available Monday to Saturday, 9 AM to 6 PM.";
  }
  
  return "Thank you for your question! For more specific information about our eco-friendly cleaning products, please check our products page or contact our customer support.";
}

export default {
  getChatResponse
};
