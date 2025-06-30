"use client";

import { Column, Heading, Text, Flex, Icon, Badge, Button } from "@once-ui-system/core";
import { Navbar } from "@/components/Navbar";

export default function ChangelogPage() {
  const releases = [
    {
      version: "v1.0.0",
      date: "December 20, 2024",
      type: "major",
      title: "Initial Release",
      description: "Welcome to Warden! We're excited to launch our developer alerting tool.",
      changes: [
        {
          category: "Features",
          items: [
            "Support for console.text() method for alert-triggering logs",
            "Enhanced console methods (error, warn, log)",
            "Real-time event monitoring dashboard",
            "SMS alerts with configurable thresholds",
            "Team collaboration with invite system",
            "Test and production API keys",
            "Event filtering and search",
            "30-day log retention for free tier",
          ],
        },
        {
          category: "Developer Experience",
          items: [
            "Simple npm package installation",
            "Zero configuration setup",
            "TypeScript support out of the box",
            "Environment variable configuration",
            "Comprehensive documentation",
          ],
        },
        {
          category: "Infrastructure",
          items: [
            "Sub-second event ingestion",
            "99.9% uptime SLA for Pro and Enterprise",
            "Global CDN for API endpoints",
            "Secure key management with domain whitelisting",
          ],
        },
      ],
    },
  ];

  const getVersionBadgeVariant = (type: string) => {
    switch (type) {
      case "major":
        return "brand";
      case "minor":
        return "info";
      case "patch":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <>
      <Navbar />
      <Column fillWidth padding="32" gap="48" style={{ paddingTop: "120px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <Column gap="16">
        <Heading variant="display-strong-l">Changelog</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Track updates, improvements, and new features in Warden
        </Text>
        
        {/* Subscribe CTA */}
        <Flex gap="12" vertical="center" style={{ marginTop: "8px" }}>
          <Icon name="bell" size="s" color="var(--brand-on-background-strong)" />
          <Text variant="body-default-m" onBackground="neutral-weak">
            Get notified about updates
          </Text>
          <Button
            href="/blog"
            variant="tertiary"
            size="s"
            style={{ marginLeft: "8px" }}
          >
            Subscribe
          </Button>
        </Flex>
      </Column>

      {/* Releases */}
      <Column gap="48">
        {releases.map((release) => (
          <div
            key={release.version}
            style={{
              position: "relative",
              paddingLeft: "32px",
            }}
          >
            {/* Timeline dot */}
            <div
              style={{
                position: "absolute",
                left: "-8px",
                top: "8px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "var(--brand-background-strong)",
                border: "4px solid var(--page-background)",
              }}
            />
            
            {/* Timeline line */}
            <div
              style={{
                position: "absolute",
                left: "-1px",
                top: "32px",
                bottom: "-48px",
                width: "2px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            />

            <Column gap="16">
              {/* Release Header */}
              <Flex gap="12" vertical="center">
                <Badge variant={getVersionBadgeVariant(release.type)} size="m">
                  {release.version}
                </Badge>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {release.date}
                </Text>
              </Flex>

              {/* Release Title and Description */}
              <Column gap="8">
                <Heading variant="heading-strong-l">{release.title}</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {release.description}
                </Text>
              </Column>

              {/* Changes */}
              <Column gap="24" style={{ marginTop: "8px" }}>
                {release.changes.map((changeGroup) => (
                  <Column key={changeGroup.category} gap="12">
                    <Text variant="heading-strong-s">{changeGroup.category}</Text>
                    <Column gap="8">
                      {changeGroup.items.map((item, idx) => (
                        <Flex key={idx} gap="12" vertical="start">
                          <Icon 
                            name="check" 
                            size="s" 
                            color="var(--success-on-background-strong)" 
                            style={{ marginTop: "2px", flexShrink: 0 }}
                          />
                          <Text variant="body-default-m">{item}</Text>
                        </Flex>
                      ))}
                    </Column>
                  </Column>
                ))}
              </Column>
            </Column>
          </div>
        ))}
      </Column>

      {/* Coming Next */}
      <Column 
        gap="16" 
        style={{ 
          marginTop: "32px",
          padding: "32px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
        }}
      >
        <Flex gap="12" vertical="center">
          <Icon name="zap" size="m" color="var(--brand-on-background-strong)" />
          <Heading variant="heading-strong-m">Coming Next</Heading>
        </Flex>
        <Column gap="12">
          <Flex gap="12" vertical="center">
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--neutral-on-background-weak)",
                flexShrink: 0,
              }}
            />
            <Text variant="body-default-m">Phone call alerts for critical events</Text>
          </Flex>
          <Flex gap="12" vertical="center">
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--neutral-on-background-weak)",
                flexShrink: 0,
              }}
            />
            <Text variant="body-default-m">Webhook integrations (Slack, Discord, PagerDuty)</Text>
          </Flex>
          <Flex gap="12" vertical="center">
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--neutral-on-background-weak)",
                flexShrink: 0,
              }}
            />
            <Text variant="body-default-m">Advanced analytics and insights</Text>
          </Flex>
          <Flex gap="12" vertical="center">
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--neutral-on-background-weak)",
                flexShrink: 0,
              }}
            />
            <Text variant="body-default-m">Custom dashboards and reporting</Text>
          </Flex>
        </Column>
      </Column>

      {/* Feedback CTA */}
      <Column 
        gap="16" 
        horizontal="center" 
        style={{ 
          marginTop: "32px",
          textAlign: "center",
        }}
      >
        <Text variant="heading-strong-m">Have a feature request?</Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          We'd love to hear from you. Let us know what you'd like to see next.
        </Text>
        <Button
          href="/features"
          variant="secondary"
          size="m"
        >
          <Flex gap="8" vertical="center">
            <Icon name="message" size="s" />
            <span>Request a Feature</span>
          </Flex>
        </Button>
      </Column>
    </Column>
    </>
  );
}