import app from '../src/app.js';
import connectDB from '../src/config/db.js';

export default async function handler(req, res) {
  try {
    // Connect to database
    await connectDB();
    
    // Let the Express app handle the request
    return app(req, res);
    
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
