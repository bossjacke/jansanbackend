// Vercel Serverless Health Check Endpoint
// GET /api/health

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // Check environment variables
    const envCheck = {
      mongoUri: !!process.env.MONGO_URI,
      jwtSecret: !!process.env.JWT_SECRET,
      stripeSecret: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      geminiKey: !!process.env.GEMINI_API_KEY,
      googleClient: !!process.env.GOOGLE_CLIENT_ID,
    };

    const allEnvSet = Object.values(envCheck).every((v) => v);

    return res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        allConfigured: allEnvSet,
        details: envCheck,
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        deploymentUrl: process.env.VERCEL_URL || 'unknown',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
}

