#!/usr/bin/env node

const https = require("https");

// Configuration
const API_KEYS = {
  test: "test_4EPbrgzEGJO48jjzkS1LwE2nV-9OB9Wy",
  prod: "prod_gq2msS_k09rC324L3TpsgOJ_S7fblclo",
};

const LOG_TYPES = ["text", "call", "callText", "log", "warn", "error"];

const SAMPLE_MESSAGES = [
  "User authentication failed",
  "Payment processed successfully",
  "Database connection error",
  "API rate limit exceeded",
  "File upload completed",
  "Background job started",
  "Cache invalidated",
  "Session expired for user",
  "Webhook received from Stripe",
  "Email sent to customer",
  "Password reset requested",
  "New user registration",
  "Order shipped successfully",
  "Inventory update failed",
  "Server health check passed",
];

const SAMPLE_USER_IDS = [
  "user_123",
  "user_456",
  "user_789",
  "customer_abc",
  "admin_001",
  null, // Some logs without userId
];

// Function to make API call
function sendLog(apiKey, logData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(logData);

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/log",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Generate random log
function generateRandomLog() {
  const type = LOG_TYPES[Math.floor(Math.random() * LOG_TYPES.length)];
  const message = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
  const userId = SAMPLE_USER_IDS[Math.floor(Math.random() * SAMPLE_USER_IDS.length)];

  const log = {
    type,
    message,
    timestamp: new Date().toISOString(),
  };

  // 70% chance to include metadata
  if (Math.random() < 0.7) {
    log.meta = {};

    // Add userId if we have one
    if (userId) {
      log.meta.userId = userId;
    }

    // Add some random metadata
    if (Math.random() < 0.5) {
      log.meta.action = ["click", "submit", "load", "error"][Math.floor(Math.random() * 4)];
    }

    if (Math.random() < 0.3) {
      log.meta.duration = Math.floor(Math.random() * 5000) + "ms";
    }

    if (Math.random() < 0.4) {
      log.meta.browser = ["Chrome", "Firefox", "Safari", "Edge"][Math.floor(Math.random() * 4)];
    }
  }

  return log;
}

// Main function
async function generateLogs() {
  console.log("🚀 Starting log generation...");

  const totalLogs = 400;
  const batchSize = 10; // Send in batches to avoid overwhelming
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < totalLogs; i += batchSize) {
    const batch = [];

    for (let j = 0; j < batchSize && i + j < totalLogs; j++) {
      const logIndex = i + j;
      // Use test key for 60% of logs, prod for 40%
      const apiKey = Math.random() < 0.6 ? API_KEYS.test : API_KEYS.prod;
      const logData = generateRandomLog();

      batch.push(
        sendLog(apiKey, logData)
          .then(() => {
            successCount++;
            if (successCount % 50 === 0) {
              console.log(`✅ Sent ${successCount} logs...`);
            }
          })
          .catch((err) => {
            errorCount++;
            console.error(`❌ Error sending log ${logIndex}:`, err.message);
          }),
      );
    }

    // Wait for batch to complete
    await Promise.all(batch);

    // Small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✨ Log generation complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${successCount + errorCount}`);
}

// Run the script
generateLogs().catch(console.error);
