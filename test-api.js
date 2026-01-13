#!/usr/bin/env node

// Simple test script to verify API endpoints
const https = require('https');

// Replace this with your actual Vercel deployment URL
const BASE_URL = 'https://your-project.vercel.app';

// Test endpoints
const endpoints = [
  { path: '/api/health', method: 'GET', description: 'Health Check' },
  { path: '/api/products', method: 'GET', description: 'Get All Products' },
  { path: '/api/auth/register', method: 'POST', description: 'Register User (will fail without data)' },
  { path: '/api/auth/login', method: 'POST', description: 'Login (will fail without data)' },
  { path: '/api/auth/google-login', method: 'POST', description: 'Google Login (will fail without data)' },
  { path: '/api/cart', method: 'GET', description: 'Get Cart (will fail without auth)' },
  { path: '/api/chat', method: 'POST', description: 'Chat API (will fail without auth/data)' },
  { path: '/api/orders', method: 'GET', description: 'Get Orders (will fail without auth)' },
  { path: '/api/payment', method: 'GET', description: 'Get Payments (will fail without auth)' },
  { path: '/api/users', method: 'GET', description: 'Get User Profile (will fail without auth)' },
  { path: '/api/webhooks', method: 'POST', description: 'Stripe Webhook (will fail without signature)' },
];

function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          endpoint: endpoint.description,
          path: endpoint.path,
          method: endpoint.method,
          statusCode: res.statusCode,
          statusText: res.statusMessage,
          success: res.statusCode < 500, // Consider 4xx as "expected" failures
          response: data
        });
      });
    });

    req.on('error', (error) => {
      reject({
        endpoint: endpoint.description,
        path: endpoint.path,
        method: endpoint.method,
        error: error.message
      });
    });

    // Send some basic data for POST requests
    if (endpoint.method === 'POST') {
      req.write(JSON.stringify({ test: true }));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.description} (${endpoint.method} ${endpoint.path})`);
      const result = await testEndpoint(endpoint);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.statusCode} ${result.statusText}`);
      } else {
        console.log(`❌ ${result.statusCode} ${result.statusText}`);
      }
    } catch (error) {
      console.log(`💥 Error: ${error.error}`);
      results.push(error);
    }
    console.log('');
  }

  // Summary
  console.log('\n📊 Test Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.endpoint}: ${result.statusCode || 'Error'} ${result.statusText || result.error}`);
    });
  }
}

// Check if BASE_URL is provided
if (process.argv[2]) {
  BASE_URL = process.argv[2];
} else {
  console.log('⚠️  Usage: node test-api.js <your-vercel-url>');
  console.log('⚠️  Example: node test-api.js https://my-app.vercel.app');
  console.log('⚠️  Using default URL - please replace with your actual deployment URL\n');
}

runTests().catch(console.error);
