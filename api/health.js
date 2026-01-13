export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if all required environment variables are configured
  const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'GEMINI_API_KEY'
  ];
  
  const configuredVars = requiredEnvVars.filter(envVar => process.env[envVar]);
  const allConfigured = requiredEnvVars.length === configuredVars.length;
  
  res.status(200).json({
    success: true,
    status: 'healthy',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development',
    environment: {
      allConfigured,
      configured: configuredVars,
      missing: requiredEnvVars.filter(envVar => !process.env[envVar])
    }
  });
}
