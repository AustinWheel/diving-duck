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
} from "@once-ui-system/core";
import { Navbar } from "@/components/Navbar";
import { VideoBackground } from "@/components/VideoBackground";
import PublicEventCounter from "@/components/PublicEventCounter";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", overflow: "visible" }}>
      <Navbar />

      {/* Hero Section with Video Background */}
      <Column
        fillWidth
        style={{
          minHeight: "100vh",
          height: "100vh",
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
            no extra noise.
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

      {/* Hero Content Section */}
      <Column fillWidth style={{ position: "relative", overflow: "hidden" }}>
        {/* How It Works Section */}
        <Column
          fillWidth
          padding="64"
          gap="48"
          style={{
            background: "linear-gradient(to bottom, rgba(255, 107, 53, 0.05) 0%, transparent 100%)",
          }}
        >
          <Column maxWidth="xl" horizontal="center" gap="24" style={{ margin: "0 auto", width: "100%" }}>
            <Heading variant="display-strong-l" align="center">
              Dead simple monitoring
            </Heading>
            <Text 
              variant="body-default-l" 
              align="center" 
              onBackground="neutral-weak"
              style={{ maxWidth: "600px", margin: "0 auto" }}
            >
              Replace complex logging setups with a single line of code. Get alerts when it matters.
            </Text>

            {/* Steps */}
            <Flex gap="32" wrap horizontal="center" style={{ marginTop: "48px" }}>
              <Column gap="16" horizontal="center" style={{ maxWidth: "300px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="heading-strong-l" onBackground="brand-strong">1</Text>
                </div>
                <Text variant="heading-strong-m">Install</Text>
                <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                  Add our lightweight npm package to your project in seconds
                </Text>
              </Column>

              <Column gap="16" horizontal="center" style={{ maxWidth: "300px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="heading-strong-l" onBackground="brand-strong">2</Text>
                </div>
                <Text variant="heading-strong-m">Drop in code</Text>
                <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                  Use console.text() anywhere you need visibility
                </Text>
              </Column>

              <Column gap="16" horizontal="center" style={{ maxWidth: "300px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    backgroundColor: "var(--brand-background-medium)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="heading-strong-l" onBackground="brand-strong">3</Text>
                </div>
                <Text variant="heading-strong-m">Get alerted</Text>
                <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                  Receive SMS alerts when thresholds are triggered
                </Text>
              </Column>
            </Flex>
          </Column>
        </Column>

        {/* Code Example Section */}
        <Column fillWidth padding="64" style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
          <Column maxWidth="xl" horizontal="center" gap="48" style={{ margin: "0 auto", width: "100%" }}>
            <Column gap="24" align="center">
              <Heading variant="display-strong-l" align="center">
                Your code, enhanced
              </Heading>
              <Text 
                variant="body-default-l" 
                align="center" 
                onBackground="neutral-weak"
                style={{ maxWidth: "600px" }}
              >
                Works with your existing console methods. Zero configuration required.
              </Text>
            </Column>

            <CodeBlock
              copyButton={true}
              codes={[
                {
                  code: `// Critical alerts
console.text('Payment failed for premium user', { 
  userId: user.id, 
  amount: 99.99 
});

// Track errors with context
console.error('Database connection lost', {
  retries: 3,
  lastError: error.message
});

// Monitor performance
console.warn('Slow API response', {
  endpoint: '/api/users',
  duration: '2.5s'
});`,
                  language: "javascript",
                  label: "JavaScript",
                }
              ]}
            />
          </Column>
        </Column>

        {/* Features Grid */}
        <Column fillWidth padding="64" gap="48">
          <Column maxWidth="xl" horizontal="center" gap="48" style={{ margin: "0 auto", width: "100%" }}>
            <Heading variant="display-strong-l" align="center">
              Everything you need, nothing you don't
            </Heading>

            <Flex gap="24" wrap fillWidth center>
              <Column
                fillWidth
                center
                padding="32"
                background="surface"
                border="neutral-alpha-weak"
                radius="m"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Icon name="bell" size="l" color="var(--brand-on-background-strong)" marginBottom="16" />
                <Text variant="heading-strong-m" marginBottom="8">
                  Smart Alerts
                </Text>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Set thresholds to get notified only when patterns emerge, not on every single error
                </Text>
              </Column>

              <Column
                center
                fillWidth
                padding="32"
                background="surface"
                border="neutral-alpha-weak"
                radius="m"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Icon name="activity" size="l" color="var(--success-on-background-strong)" marginBottom="16" />
                <Heading variant="heading-strong-m" marginBottom="8">
                  Real-time Dashboard
                </Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  See all your events in one place with powerful filtering and search capabilities
                </Text>
              </Column>
              
              <Column
                center
                fillWidth
                padding="32"
                background="surface"
                border="neutral-alpha-weak"
                radius="m"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Icon name="userPlus" size="l" color="var(--info-on-background-strong)" marginBottom="16" />
                <Text variant="heading-strong-m" marginBottom="8">
                  Team Collaboration
                </Text>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Invite team members to share visibility and respond to issues together
                </Text>
              </Column>

            <Column
              center
              padding="32"
              background="surface"
              fillWidth
              border="neutral-alpha-weak"
              radius="m"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(20px)",
              }}
            >
                <Icon name="shield" size="l" color="var(--warning-on-background-strong)" marginBottom="16" />
                <Heading variant="heading-strong-m" marginBottom="8">
                  Secure by Design
                </Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Domain whitelisting, separate test/production environments
                </Text>
              </Column>

              <Column
                center
                fillWidth
                padding="32"
                background="surface"
                border="neutral-alpha-weak"
                radius="m"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Icon name="zap" size="l" color="var(--brand-on-background-strong)" marginBottom="16" />
                <Heading variant="heading-strong-m" marginBottom="8">
                  Lightning Fast
                </Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Sub-second event ingestion for minimal latency
                </Text>
              </Column>

              <Column
                center
                fillWidth
                padding="32"
                background="surface"
                border="neutral-alpha-weak"
                radius="m"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <Icon name="gauge" size="l" color="var(--danger-on-background-strong)" marginBottom="16" />
                <Heading variant="heading-strong-m" marginBottom="8">
                  Zero Config
                </Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Works out of the box with sensible defaults. Customize when you need to
                </Text>
              </Column>
            </Flex>
          </Column>
        </Column>

        {/* CTA Section */}
        <Column 
          fillWidth 
          padding="64" 
          style={{
            background: "linear-gradient(to top, rgba(255, 107, 53, 0.05) 0%, transparent 100%)",
          }}
        >
          <Column 
            maxWidth="m" 
            horizontal="center" 
            gap="32" 
            align="center"
            style={{ margin: "0 auto" }}
          >
            <Heading variant="display-strong-l" align="center">
              Start monitoring in minutes
            </Heading>
            <Text 
              variant="body-default-l" 
              align="center" 
              onBackground="neutral-weak"
              style={{ maxWidth: "500px" }}
            >
              Join developers who've simplified their monitoring setup and never miss critical events
            </Text>
            <Flex gap="16" wrap horizontal="center">
              <Button
                href="/auth/signin"
                variant="primary"
                size="l"
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                  padding: "14px 32px",
                  fontWeight: 600,
                }}
              >
                Get Started Free
              </Button>
              <Button
                href="/docs"
                variant="secondary"
                size="l"
                style={{
                  padding: "14px 32px",
                }}
              >
                View Documentation
              </Button>
            </Flex>
          </Column>
        </Column>

        {/* Footer */}
        <Column 
          fillWidth 
          padding="32"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
        >
          <Flex 
            fillWidth 
            horizontal="space-between" 
            vertical="center"
            wrap
            gap="24"
            style={{ maxWidth: "1200px", margin: "0 auto" }}
          >
            <Text variant="body-default-s" onBackground="neutral-weak">
              © 2024 Warden. All rights reserved.
            </Text>
            <Flex gap="24" wrap>
              <Button
                href="/privacy"
                variant="tertiary"
                size="s"
                style={{ color: "var(--neutral-on-background-weak)" }}
              >
                Privacy
              </Button>
              <Button
                href="/terms"
                variant="tertiary"
                size="s"
                style={{ color: "var(--neutral-on-background-weak)" }}
              >
                Terms
              </Button>
              <Button
                href="/changelog"
                variant="tertiary"
                size="s"
                style={{ color: "var(--neutral-on-background-weak)" }}
              >
                Changelog
              </Button>
            </Flex>
          </Flex>
        </Column>
      </Column>
    </div>
  );
}
