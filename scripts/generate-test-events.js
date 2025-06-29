#!/usr/bin/env node

const http = require('http');

// Distribution: log (0.5), warn (0.2), error (0.15), text (0.15)
const EVENT_DISTRIBUTION = [
  { type: 'log', weight: 0.5 },
  { type: 'warn', weight: 0.2 },
  { type: 'error', weight: 0.15 },
  { type: 'text', weight: 0.15 }
];

// Sample messages for each log type
const MESSAGES = {
  log: [
    'User successfully authenticated',
    'Database query completed in 45ms',
    'Cache hit for user preferences',
    'Background job started: data sync',
    'API request processed successfully'
  ],
  warn: [
    'High memory usage detected: 85%',
    'Slow database query: 2.3s',
    'Rate limit approaching for API key',
    'Deprecated function called: getUserData()',
    'Missing optional configuration parameter'
  ],
  error: [
    'Failed to connect to payment gateway',
    'Database connection timeout after 30s',
    'Invalid user input: email format',
    'File upload failed: exceeded size limit',
    'Authentication token expired'
  ],
  text: [
    'Critical system alert: backup failed',
    'Security alert: multiple failed login attempts',
    'Infrastructure alert: server CPU at 95%',
    'URGENT: Production database unreachable',
    'CRITICAL: Payment system offline'
  ]
};

// Function to select event type based on distribution
function selectEventType() {
  const random = Math.random();
  let cumulative = 0;
  
  for (const event of EVENT_DISTRIBUTION) {
    cumulative += event.weight;
    if (random <= cumulative) {
      return event.type;
    }
  }
  
  return 'log'; // fallback
}

// Function to get random message for type
function getRandomMessage(type) {
  const messages = MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Function to get random delay between events
function getRandomDelay() {
  // Generate delays with different probabilities:
  // 20% chance: very fast (100ms - 500ms)
  // 30% chance: fast (500ms - 2s)
  // 30% chance: normal (2s - 5s)
  // 20% chance: slow (5s - 10s)
  const random = Math.random();
  
  if (random < 0.2) {
    // Very fast burst
    return Math.floor(Math.random() * 400) + 100;
  } else if (random < 0.5) {
    // Fast
    return Math.floor(Math.random() * 1500) + 500;
  } else if (random < 0.8) {
    // Normal
    return Math.floor(Math.random() * 3000) + 2000;
  } else {
    // Slow
    return Math.floor(Math.random() * 5000) + 5000;
  }
}

// Function to send event
function sendEvent(apiKey) {
  const type = selectEventType();
  const message = getRandomMessage(type);
  
  const data = JSON.stringify({
    type,
    message,
    meta: {
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      sessionId: `session_${Math.floor(Math.random() * 10000)}`,
      environment: 'production',
      version: '1.2.3'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/log',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${apiKey}`
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      const timestamp = new Date().toISOString();
      if (res.statusCode === 200) {
        console.log(`[${timestamp}] ✓ Sent ${type}: "${message}"`);
      } else {
        console.error(`[${timestamp}] ✗ Failed (${res.statusCode}): ${responseData}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ✗ Request error:`, error.message);
  });

  req.write(data);
  req.end();
}

// Main execution
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node generate-test-events.js <API_KEY>');
  console.error('Example: node generate-test-events.js test_abc123xyz');
  process.exit(1);
}

console.log('Starting event generator...');
console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
console.log('Sending events with variable timing (100ms - 10s). Press Ctrl+C to stop.\n');

let timeoutId;
let isRunning = true;

// Function to schedule next event
function scheduleNextEvent() {
  if (!isRunning) return;
  
  const delay = getRandomDelay();
  console.log(`[${new Date().toISOString()}] Next event in ${(delay / 1000).toFixed(1)}s`);
  
  timeoutId = setTimeout(() => {
    sendEvent(apiKey);
    scheduleNextEvent();
  }, delay);
}

// Send first event immediately
sendEvent(apiKey);

// Start the scheduling
scheduleNextEvent();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping event generator...');
  isRunning = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  process.exit(0);
});