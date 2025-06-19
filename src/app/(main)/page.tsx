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
          gap="l" 
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
            Drop console.text() anywhere in your code. Get instant alerts when
            things need attention. Fast, simple, and reliable.
          </Text>

          <Flex gap="m" wrap horizontal="center">
            <Button 
              href="/auth/signin" 
              variant="primary" 
              size="l"
              prefixIcon="download"
              style={{
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
                padding: "12px 24px",
                fontWeight: 600,
                border: "1px solid var(--brand-border-strong)",
              }}
            >
              Download for Mac
            </Button>
            <Button 
              href="/docs" 
              variant="secondary" 
              size="l"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "var(--static-white)",
                padding: "12px 24px",
              }}
            >
              Join Windows waitlist
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
            <Text>v1.100.2</Text>
            <Text>•</Text>
            <Text>macOS 13+</Text>
            <Text>•</Text>
            <Button
              href="#"
              variant="tertiary"
              size="s"
              style={{ 
                color: "var(--neutral-on-background-weak)",
                textDecoration: "underline",
              }}
            >
              Install via homebrew
            </Button>
          </Flex>
          
          <Flex
            vertical="center"
            horizontal="center"
            style={{
              marginTop: "80px",
              animation: "bounce 2s infinite",
            }}
          >
            <Button
              href="#features"
              variant="tertiary"
              size="m"
              style={{ color: "var(--neutral-on-background-weak)" }}
            >
              Introducing console.text() for developers →
            </Button>
          </Flex>
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
              codes={[{
                label: "Quick Start",
                language: "javascript",
                code: `// Install the SDK
npm install @your-package/alerts

// Add to your code
import { setupAlerts } from '@your-package/alerts';
setupAlerts('prod_your_api_key');

// Send alerts anywhere
try {
  await processPayment(order);
} catch (error) {
  console.text('Payment failed', { 
    userId: user.id,
    error: error.message 
  });
}`
              }]}
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
