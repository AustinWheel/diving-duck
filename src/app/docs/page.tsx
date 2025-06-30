"use client";

import { Column, Heading, Text, CodeBlock, Flex, Icon, Button, Row } from "@once-ui-system/core";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "api" | "alerts">("quickstart");

  return (
    <>
      <Navbar />
      <Column fillWidth padding="32" gap="32" style={{ paddingTop: "120px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <Column gap="12">
        <Heading variant="display-strong-l">Documentation</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Everything you need to know to get started with Warden
        </Text>
      </Column>

      {/* Navigation Tabs */}
      <Flex gap="16" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
        <Button
          onClick={() => setActiveTab("quickstart")}
          variant={activeTab === "quickstart" ? "primary" : "tertiary"}
          size="m"
        >
          Quick Start
        </Button>
        <Button
          onClick={() => setActiveTab("api")}
          variant={activeTab === "api" ? "primary" : "tertiary"}
          size="m"
        >
          API Reference
        </Button>
        <Button
          onClick={() => setActiveTab("alerts")}
          variant={activeTab === "alerts" ? "primary" : "tertiary"}
          size="m"
        >
          Alerts & Monitoring
        </Button>
      </Flex>

      {/* Content */}
      {activeTab === "quickstart" && (
        <Column gap="48">
          {/* Getting Started */}
          <Column gap="24">
            <Heading variant="heading-strong-l">Getting Started</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Get up and running with Warden in under 5 minutes.
            </Text>

            {/* Step 1 */}
            <Column gap="16">
              <Flex gap="12" vertical="center">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text variant="body-strong-s" onBackground="brand-strong">1</Text>
                </div>
                <Text variant="heading-strong-m">Install the Package</Text>
              </Flex>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `npm install @console-warden`,
                    language: "bash",
                    label: "npm",
                  },
                  {
                    code: `yarn add @console-warden`,
                    language: "bash",
                    label: "yarn",
                  },
                  {
                    code: `pnpm add @console-warden`,
                    language: "bash",
                    label: "pnpm",
                  },
                ]}
              />
            </Column>

            {/* Step 2 */}
            <Column gap="16">
              <Flex gap="12" vertical="center">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text variant="body-strong-s" onBackground="brand-strong">2</Text>
                </div>
                <Text variant="heading-strong-m">Add Your API Key</Text>
              </Flex>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Create a <code>.env</code> file in your project root and add your Warden API key:
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `WARDEN_PUBLIC_KEY=test_your_api_key_here`,
                    language: "bash",
                    label: ".env",
                  },
                ]}
              />
            </Column>

            {/* Step 3 */}
            <Column gap="16" vertical="center">
              <Flex gap="12" vertical="center">
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text variant="body-strong-s" onBackground="brand-strong">3</Text>
                </div>
                <Text variant="heading-strong-m">Import and Use</Text>
              </Flex>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Import Warden at the top of your application and start logging:
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Import at the top of your entry file
import '@console-warden';

// Now use anywhere in your application
console.text('User signup completed');
console.error('Payment processing failed', { orderId: '12345' });
console.warn('API rate limit approaching');
console.log('Debug information');

// Track function calls
console.call('processPayment', { amount: 99.99 });

// Track and alert on function calls
console.callText('criticalOperation', { userId: 'usr_123' });`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>
          </Column>

          {/* Configuration */}
          <Column gap="24">
            <Heading variant="heading-strong-l">Configuration</Heading>
            
            <Column gap="16">
              <Heading variant="heading-strong-m">Environment Variables</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Warden supports the following environment variables:
              </Text>
              <div style={{
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
              }}>
                <Column gap="12">
                  <Row gap="12">
                    <Text variant="body-strong-s" style={{ minWidth: "200px" }}>WARDEN_PUBLIC_KEY</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">Your API key (required)</Text>
                  </Row>
                </Column>
              </div>
            </Column>

            <Column gap="16">
              <Heading variant="heading-strong-m">Test vs Production Keys</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Warden provides two types of API keys:
              </Text>
              <Row gap="16" mobileDirection="column">
                <div style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "rgba(251, 146, 60, 0.05)",
                  border: "1px solid rgba(251, 146, 60, 0.2)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s" style={{ color: "#fb923c" }}>Test Keys (test_*)</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      • No rate limits<br/>
                      • Expire after 2 hours<br/>
                      • Perfect for development<br/>
                      • No domain restrictions
                    </Text>
                  </Column>
                </div>
                <div style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "rgba(34, 197, 94, 0.05)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s" style={{ color: "#22c55e" }}>Production Keys (prod_*)</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      • Rate limited for security<br/>
                      • Never expire<br/>
                      • Domain whitelisting required<br/>
                    </Text>
                  </Column>
                </div>
              </Row>
            </Column>
          </Column>
        </Column>
      )}

      {activeTab === "api" && (
        <Column gap="48">
          <Column gap="24">
            <Heading variant="heading-strong-l">API Reference</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Complete reference for all console methods enhanced by Warden.
            </Text>

            {/* console.text() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.text(message, metadata?)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Primary method for sending alerts. Use this for important events that may require notification.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Basic usage
console.text('User account deleted');

// With metadata
console.text('Payment failed', {
  userId: 'usr_123',
  amount: 99.99,
  currency: 'USD',
  error: 'Insufficient funds'
});

// With user context
console.text('Subscription cancelled', {
  userId: 'usr_456',
  plan: 'pro',
  reason: 'Payment method expired'
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>

            {/* console.error() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.error(message, metadata?)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Enhanced error logging. Automatically captures stack traces when available.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Basic error
console.error('Database connection failed');

// With error object
try {
  await processPayment();
} catch (error) {
  console.error('Payment processing error', {
    error: error.message,
    stack: error.stack,
    orderId: '12345'
  });
}

// Critical errors
console.error('CRITICAL: Service unavailable', {
  service: 'payment-gateway',
  downtime: '5 minutes'
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>

            {/* console.warn() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.warn(message, metadata?)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Warning level logs for non-critical issues.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Performance warnings
console.warn('Slow query detected', {
  query: 'SELECT * FROM users',
  duration: '2.5s'
});

// Deprecation warnings
console.warn('Deprecated API endpoint used', {
  endpoint: '/api/v1/users',
  alternative: '/api/v2/users'
});

// Threshold warnings
console.warn('Memory usage high', {
  used: '1.8GB',
  limit: '2GB',
  percentage: 90
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>

            {/* console.log() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.log(message, metadata?)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Standard logging for debugging and informational messages.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Debug information
console.log('User authenticated', { userId: 'usr_123' });

// Process tracking
console.log('Import started', {
  file: 'users.csv',
  records: 1000
});

// State changes
console.log('Cache cleared', {
  size: '50MB',
  items: 1250
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>

            {/* console.call() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.call(functionName, metadata?) (Coming Soon!)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Track function executions without triggering alerts.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Track API calls
console.call('fetchUserData', { userId: 'usr_123' });

// Track important operations
console.call('generateReport', {
  type: 'monthly',
  month: 'January',
  year: 2024
});

// Track background jobs
console.call('sendEmailBatch', {
  recipients: 500,
  template: 'newsletter'
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>

            {/* console.callText() */}
            <Column gap="16">
              <Heading variant="heading-strong-m">console.callText(functionName, metadata?) (Coming Soon!)</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Track function executions AND send alerts. Combines call() and text() functionality.
              </Text>
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Critical operations that need alerts
console.callText('deleteUserAccount', {
  userId: 'usr_123',
  deletedBy: 'admin_456'
});

// Financial transactions
console.callText('processRefund', {
  amount: 299.99,
  orderId: 'ord_789',
  reason: 'Customer request'
});

// Security events
console.callText('suspiciousLoginAttempt', {
  ip: '192.168.1.1',
  attempts: 5,
  userId: 'usr_123'
});`,
                    language: "javascript",
                    label: "JavaScript",
                  },
                ]}
              />
            </Column>
          </Column>
        </Column>
      )}

      {activeTab === "alerts" && (
        <Column gap="48">
          <Column gap="24">
            <Heading variant="heading-strong-l">Alerts & Monitoring</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Configure intelligent alerts to stay informed about critical events in your application.
            </Text>

            {/* Alert Rules */}
            <Column gap="16">
              <Heading variant="heading-strong-m">How Alert Rules Work</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Warden monitors your logs in real-time and triggers alerts based on configurable thresholds.
              </Text>
              
              <div style={{
                padding: "24px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
              }}>
                <Column gap="16">
                  <Flex gap="12" vertical="center">
                    <Icon name="bell" size="m" />
                    <Text variant="body-strong-s">Threshold-Based Alerts</Text>
                  </Flex>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    Set up rules like "Send alert when 5 errors occur within 10 minutes"
                  </Text>
                  <Column gap="8">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      • Configure event count thresholds<br/>
                      • Set time windows (minutes to hours)<br/>
                      • Filter by log type (error, warn, text)<br/>
                      • Group by specific messages
                    </Text>
                  </Column>
                </Column>
              </div>
            </Column>

            {/* Alert Types */}
            <Column gap="16">
              <Heading variant="heading-strong-m">Alert Types</Heading>
              
              <Row gap="16" mobileDirection="column">
                <div style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Flex gap="8" vertical="center">
                      <Icon name="message" size="s" color="#3b82f6" />
                      <Text variant="body-strong-s" style={{ color: "#3b82f6" }}>SMS Alerts</Text>
                    </Flex>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Instant SMS notifications to your phone when thresholds are met
                    </Text>
                  </Column>
                </div>
                
                <div style={{
                  flex: 1,
                  padding: "16px",
                  backgroundColor: "rgba(251, 146, 60, 0.05)",
                  border: "1px solid rgba(251, 146, 60, 0.2)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Flex gap="8" vertical="center">
                      <Icon name="phone" size="s" color="#fb923c" />
                      <Text variant="body-strong-s" style={{ color: "#fb923c" }}>Phone Calls</Text>
                    </Flex>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Coming soon: Escalate critical alerts to phone calls
                    </Text>
                  </Column>
                </div>
              </Row>
            </Column>

            {/* Best Practices */}
            <Column gap="16">
              <Heading variant="heading-strong-m">Best Practices</Heading>
              
              <Column gap="16">
                <div style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s">1. Start with Conservative Thresholds</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Begin with higher thresholds (e.g., 10 errors in 30 minutes) and adjust based on your app's behavior
                    </Text>
                  </Column>
                </div>
                
                <div style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s">2. Use Message-Specific Rules</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Create targeted rules for specific error messages to reduce noise
                    </Text>
                  </Column>
                </div>
                
                <div style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s">3. Set Global Limits</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Prevent alert fatigue by setting maximum alerts per hour
                    </Text>
                  </Column>
                </div>
                
                <div style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}>
                  <Column gap="8">
                    <Text variant="body-strong-s">4. Test Your Alerts</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Use the test alert feature to verify your phone numbers and configuration
                    </Text>
                  </Column>
                </div>
              </Column>
            </Column>

            {/* Example Alert Configurations */}
            <Column gap="16">
              <Heading variant="heading-strong-m">Example Configurations</Heading>
              
              <CodeBlock
                copyButton={true}
                codes={[
                  {
                    code: `// Example 1: Basic Error Monitoring
{
  "threshold": {
    "count": 5,
    "windowMinutes": 10
  },
  "logTypes": ["error"],
  "enabled": true
}

// Example 2: Payment Failure Alerts
{
  "messageRules": [{
    "message": "Payment processing failed",
    "maxAlerts": 3,
    "windowMinutes": 30
  }],
  "notificationType": "text"
}

// Example 3: Critical System Alerts
{
  "globalLimit": {
    "enabled": true,
    "maxAlerts": 10,
    "windowMinutes": 60
  },
  "messageRules": [{
    "message": "Database connection lost",
    "maxAlerts": 1,
    "windowMinutes": 5
  }]
}`,
                    language: "json",
                    label: "Alert Rules",
                  },
                ]}
              />
            </Column>
          </Column>
        </Column>
      )}
    </Column>
    </>
  );
}