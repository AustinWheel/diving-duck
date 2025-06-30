"use client";

import {
  Heading,
  Text,
  Button,
  Column,
  Badge,
  Line,
  LetterFx,
  Flex,
  Card,
  Icon,
  CodeBlock,
  Particle,
} from "@once-ui-system/core";
import { Navbar } from "@/components/Navbar";
import { VideoBackground } from "@/components/VideoBackground";
import PublicEventCounter from "@/components/PublicEventCounter";

export default function Home() {
  return (
    <>
      <Navbar />

      {/* Hero Section with Video Background */}
      <Column
        fillWidth
        style={{
          minHeight: "100vh",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "144px", // Account for navbar height + spacing
        }}
      >
        <VideoBackground />

        <Column
          maxWidth="m"
          horizontal="center"
          vertical="center"
          align="center"
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 24px",
          }}
        >
          <Heading
            variant="display-strong-xl"
            align="center"
            style={{
              fontSize: "clamp(48px, 8vw, 80px)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "16px",
            }}
          >
            Instant awareness,
            <br />
            no extra noice.
          </Heading>

          <Text
            variant="heading-default-l"
            align="center"
            style={{
              maxWidth: "600px",
              marginBottom: "40px",
            }}
          >
            Drop console.text() anywhere in your code. Get instant alerts when things need
            attention. Fast, simple, and reliable.
          </Text>

          <Flex gap="m" wrap horizontal="center">
            <Button
              href="/auth/signin"
              variant="primary"
              size="l"
              prefixIcon="sparkle"
              style={{
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
                padding: "12px 24px",
                fontWeight: 600,
                border: "1px solid var(--brand-border-strong)",
              }}
            >
              Get Started
            </Button>
            <Button
              href="https://npmjs.com/package/console-warden"
              variant="secondary"
              size="l"
              prefixIcon="package"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "var(--static-white)",
                padding: "12px 24px",
              }}
            >
              View on NPM
            </Button>
          </Flex>

          <Flex
            gap="24"
            vertical="center"
            horizontal="center"
            style={{
              marginTop: "48px",
              fontSize: "14px",
              color: "var(--neutral-on-background-weak)",
            }}
          >
            <Text>v1.0.0</Text>
            <Text>•</Text>
            <Text>JavaScript Support</Text>
            <Text>•</Text>
            <Button
              href="/docs"
              variant="tertiary"
              size="s"
              style={{
                color: "var(--neutral-on-background-weak)",
                textDecoration: "underline",
              }}
            >
              Documentation
            </Button>
          </Flex>

          {/* Live Event Counter */}
          <PublicEventCounter />
        </Column>
      </Column>

      {/* Logs Example Section */}
      <Column
        fillWidth
        center
        padding="xl"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Particle
          fill
          interactive
          speed={2.5}
          interactionRadius={3}
          density={150}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.6,
            height: "100%",
          }}
        />

        <Column
          maxWidth="xl"
          horizontal="center"
          gap="l"
          align="center"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Heading variant="display-strong-m" align="center">
            Real-time visibility into your application
          </Heading>

          <Text
            variant="body-default-l"
            align="center"
            onBackground="neutral-weak"
            style={{ maxWidth: "600px" }}
          >
            Monitor events as they happen. Filter by type, search messages, and track user
            activity—all in one unified dashboard.
          </Text>

          <div
            style={{
              position: "relative",
              marginTop: "40px",
              marginBottom: "40px",
              maxWidth: "100%",
              width: "fit-content",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-60px",
                background:
                  "radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, transparent 50%)",
                filter: "blur(60px)",
                zIndex: -1,
              }}
            />
            <img
              src="/images/logs-example.png"
              alt="Event logs dashboard example"
              style={{
                width: "100%",
                maxWidth: "1000px",
                height: "auto",
                borderRadius: "var(--radius-l)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>

          <Text variant="body-default-m" align="center" onBackground="neutral-weak">
            From development to production, never miss a critical event
          </Text>
        </Column>
      </Column>

      {/* Rest of the page content */}
      <Column fillWidth padding="l" id="features">
        {/* Code Example */}
        <Column fillWidth center maxWidth="xl" gap="xl" marginY="xl">
          <Card
            fillWidth
            maxWidth="l"
            padding="l"
            background="neutral-alpha-weak"
            border="neutral-alpha-medium"
            style={{
              backdropFilter: "blur(20px)",
              borderRadius: "var(--radius-l)",
              backgroundColor: "rgba(20, 20, 20, 0.8)",
            }}
          >
            <CodeBlock
              codes={[
                {
                  label: "Quick Start",
                  language: "javascript",
                  code: `// Install the SDK
npm install console-warden

// Add to your code
import { setupWarden } from 'console-warden';
setupWarden('prod_your_api_key');

// Send alerts anywhere
try {
  await processPayment(order);
} catch (error) {
  console.text('Payment failed', { 
    userId: user.id,
    error: error.message 
  });
}`,
                },
              ]}
              copyButton
              compact
              style={{ backgroundColor: "transparent" }}
            />
          </Card>
        </Column>

        {/* Features Grid */}
        <Column fillWidth maxWidth="xl" gap="xl" marginY="xl">
          <Heading variant="display-strong-l" align="center">
            Built for speed and simplicity
          </Heading>

          <Flex gap="l" wrap fillWidth>
            <Card
              flex="1"
              minWidth="280"
              padding="l"
              background="surface"
              border="neutral-alpha-weak"
            >
              <Icon name="zap" size="l" onBackground="brand-medium" marginBottom="m" />
              <Heading variant="heading-strong-m" marginBottom="s">
                2-minute setup
              </Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Install our npm package, add your API key, and start monitoring immediately
              </Text>
            </Card>

            <Card
              flex="1"
              minWidth="280"
              padding="l"
              background="surface"
              border="neutral-alpha-weak"
            >
              <Icon name="shield" size="l" onBackground="accent-medium" marginBottom="m" />
              <Heading variant="heading-strong-m" marginBottom="s">
                Test vs Production
              </Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Separate API keys for development and production environments
              </Text>
            </Card>

            <Card
              flex="1"
              minWidth="280"
              padding="l"
              background="surface"
              border="neutral-alpha-weak"
            >
              <Icon name="gauge" size="l" onBackground="success-medium" marginBottom="m" />
              <Heading variant="heading-strong-m" marginBottom="s">
                Smart thresholds
              </Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Configure alert frequency to avoid notification fatigue
              </Text>
            </Card>
          </Flex>
        </Column>
      </Column>
    </>
  );
}
