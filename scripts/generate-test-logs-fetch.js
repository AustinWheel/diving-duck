#!/usr/bin/env node

// Configuration
const API_KEYS = {
  test: 'test_4EPbrgzEGJO48jjzkS1LwE2nV-9OB9Wy',
  prod: 'prod_gq2msS_k09rC324L3TpsgOJ_S7fblclo'
};

const BASE_URL = 'http://localhost:3000'; // Change this if your app runs on a different port

const LOG_TYPES = ['text', 'call', 'callText', 'log', 'warn', 'error'];

const SAMPLE_MESSAGES = [
  'User authentication failed',
  'Payment processed successfully',
  'Database connection error',
  'API rate limit exceeded',
  'File upload completed',
  'Background job started',
  'Cache invalidated',
  'Session expired for user',
  'Webhook received from Stripe',
  'Email sent to customer',
  'Password reset requested',
  'New user registration',
  'Order shipped successfully',
  'Inventory update failed',
  'Server health check passed',
  'Critical error in payment gateway',
  'User profile updated',
  'Search query executed',
  'Report generated successfully',
  'Backup completed'
];

const SAMPLE_USER_IDS = [
  'user_123',
  'user_456',
  'user_789',
  'customer_abc',
  'admin_001',
  'guest_xyz',
  null // Some logs without userId
];

// Function to make API call
async function sendLog(apiKey, logData) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status ${response.status}: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Generate random log
function generateRandomLog() {
  const type = LOG_TYPES[Math.floor(Math.random() * LOG_TYPES.length)];
  const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
  const userId = SAMPLE_USER_IDS[Math.floor(Math.random() * SAMPLE_USER_IDS.length)];
  
  const log = {
    type,
    message,
    timestamp: new Date().toISOString()
  };
  
  // 70% chance to include metadata
  if (Math.random() < 0.7) {
    log.meta = {};
    
    // Add userId if we have one
    if (userId) {
      log.meta.userId = userId;
    }
    
    // Add some random metadata based on log type
    if (type === 'error' || type === 'warn') {
      log.meta.errorCode = 'ERR_' + Math.floor(Math.random() * 1000);
      log.meta.stackTrace = 'at function() line ' + Math.floor(Math.random() * 500);
    }
    
    if (type === 'call' || type === 'callText') {
      log.meta.function = ['processPayment', 'validateUser', 'sendEmail', 'updateDatabase'][Math.floor(Math.random() * 4)];
      log.meta.duration = Math.floor(Math.random() * 5000) + 'ms';
    }
    
    // Random additional metadata
    if (Math.random() < 0.5) {
      log.meta.environment = ['production', 'staging', 'development'][Math.floor(Math.random() * 3)];
    }
    
    if (Math.random() < 0.3) {
      log.meta.ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }
    
    if (Math.random() < 0.4) {
      log.meta.browser = ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)];
    }
  }
  
  return log;
}

// Sleep function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
async function generateLogs() {
  console.log('🚀 Starting log generation...');
  console.log(`📍 Sending to: ${BASE_URL}`);
  console.log(`🔑 Using keys: TEST and PROD`);
  console.log('');
  
  const totalLogs = 400;
  const batchSize = 10; // Send in batches to avoid overwhelming
  let successCount = 0;
  let errorCount = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < totalLogs; i += batchSize) {
    const batch = [];
    
    for (let j = 0; j < batchSize && i + j < totalLogs; j++) {
      const logIndex = i + j;
      // Use test key for 60% of logs, prod for 40%
      const useTestKey = Math.random() < 0.6;
      const apiKey = useTestKey ? API_KEYS.test : API_KEYS.prod;
      const logData = generateRandomLog();
      
      batch.push(
        sendLog(apiKey, logData)
          .then(() => {
            successCount++;
            // Show progress every 25 logs
            if (successCount % 25 === 0) {
              const progress = Math.round((successCount / totalLogs) * 100);
              console.log(`📊 Progress: ${successCount}/${totalLogs} (${progress}%)`);
            }
          })
          .catch((err) => {
            errorCount++;
            console.error(`❌ Error sending log ${logIndex}:`, err.message);
          })
      );
    }
    
    // Wait for batch to complete
    await Promise.all(batch);
    
    // Small delay between batches to avoid rate limiting
    await sleep(50);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`\n✨ Log generation complete in ${duration}s!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${successCount + errorCount}`);
  console.log(`\n🎉 You should now see ${successCount} logs in your dashboard!`);
}

// Check if running in Node.js 18+
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ for native fetch support');
  console.log('💡 Try running: node --version');
  process.exit(1);
}

// Run the script
generateLogs().catch(console.error);