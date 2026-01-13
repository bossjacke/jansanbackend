export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple API info response for root path
  const apiInfo = {
    message: 'API Backend is running successfully!',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      base: '/api',
      routes: [
        'GET /api/health',
        'POST /api/auth',
        'GET /api/jobs',
        'Add your other routes here...'
      ]
    },
    documentation: 'Visit /api for API endpoints',
    deployment: 'Vercel Hobby Plan',
    timestamp: new Date().toISOString()
  };

  // Serve JSON response for API consumers
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(apiInfo);
}
