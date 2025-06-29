#!/usr/bin/env node

/**
 * Alert Testing Script
 *
 * Usage:
 * node scripts/test-alerts.js <scenario> <apiKey>
 *
 * Scenarios:
 * - global-threshold: Trigger global event threshold
 * - message-specific: Trigger message-specific threshold
 * - mixed-types: Test with different log types
 * - rapid-fire: Send many events quickly
 * - slow-drip: Send events slowly over time
 */

const scenario = process.argv[2];
const apiKey = process.argv[3];

if (!scenario || !apiKey) {
  console.log("Usage: node scripts/test-alerts.js <scenario> <apiKey>");
  console.log("\nScenarios:");
  console.log("  global-threshold   - Trigger global event threshold");
  console.log("  message-specific   - Trigger message-specific threshold");
  console.log("  mixed-types       - Test with different log types");
  console.log("  rapid-fire        - Send many events quickly");
  console.log("  slow-drip         - Send events slowly over time");
  console.log("\nExample:");
  console.log(
    "  node scripts/test-alerts.js global-threshold prod_gq2msS_k09rC324L3TpsgOJ_S7fblclo",
  );
  process.exit(1);
}

const API_URL = "http://localhost:3000/api/v1/log";

async function sendLog(type, message, meta = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        message,
        meta,
        timestamp: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    console.log(`[${type}] ${message} - ${response.ok ? "SUCCESS" : "FAILED"}`, result);
    return response.ok;
  } catch (error) {
    console.error(`[${type}] ${message} - ERROR:`, error.message);
    return false;
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runScenario() {
  console.log(`\n🚀 Running scenario: ${scenario}\n`);

  switch (scenario) {
    case "global-threshold":
      console.log("📊 Testing Global Threshold Alert");
      console.log("This will send 10 different messages to trigger a global threshold\n");

      for (let i = 1; i <= 10; i++) {
        await sendLog("text", `Global test message ${i}`, { testId: "global-test" });
        await delay(1000); // 1 second between events
      }

      console.log("\n✅ If configured for 10 events in X minutes, you should receive an alert!");
      break;

    case "message-specific":
      console.log("🎯 Testing Message-Specific Alert");
      console.log("This will send the same message 5 times\n");

      const specificMessage = "Database connection failed";
      for (let i = 1; i <= 5; i++) {
        await sendLog("error", specificMessage, { attempt: i });
        await delay(2000); // 2 seconds between events
      }

      console.log(
        `\n✅ If configured for "${specificMessage}" with 5 events, you should receive an alert!`,
      );
      break;

    case "mixed-types":
      console.log("🔀 Testing Mixed Log Types");
      console.log("This will send various log types with the same message\n");

      const mixedMessage = "Payment processing error";
      const types = ["text", "error", "warn", "log"];

      for (const type of types) {
        for (let i = 1; i <= 3; i++) {
          await sendLog(type, mixedMessage, { logType: type, iteration: i });
          await delay(1500);
        }
      }

      console.log(`\n✅ Check if your rules filter by log type correctly!`);
      break;

    case "rapid-fire":
      console.log("⚡ Testing Rapid Fire Events");
      console.log("This will send 20 events as fast as possible\n");

      const promises = [];
      for (let i = 1; i <= 20; i++) {
        promises.push(sendLog("warn", "High traffic warning", { eventNumber: i }));
      }

      await Promise.all(promises);
      console.log("\n✅ This tests alert system under high load!");
      break;

    case "slow-drip":
      console.log("💧 Testing Slow Drip Events");
      console.log("This will send 1 event per minute for 5 minutes\n");
      console.log("Good for testing time window boundaries\n");

      for (let i = 1; i <= 5; i++) {
        await sendLog("text", "Periodic health check failed", { minute: i });
        if (i < 5) {
          console.log(`Waiting 1 minute before next event... (${5 - i} remaining)`);
          await delay(60000); // 1 minute
        }
      }

      console.log("\n✅ Check if alerts respect your time window settings!");
      break;

    default:
      console.error("Unknown scenario:", scenario);
      process.exit(1);
  }

  console.log("\n🏁 Test scenario completed!\n");
}

// Run the selected scenario
runScenario().catch(console.error);
