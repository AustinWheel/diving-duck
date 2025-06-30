"use client";

import { Column, Heading, Text, Button, Flex, Icon, Input } from "@once-ui-system/core";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function BlogPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email) return;

    try {
      setSubscribing(true);
      
      const response = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      setSubscribed(true);
      setEmail("");
      
      // Reset after 5 seconds
      setTimeout(() => {
        setSubscribed(false);
      }, 5000);
    } catch (error) {
      console.error("Error subscribing:", error);
      setError(error instanceof Error ? error.message : "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <Navbar />
      <Column 
        fillWidth 
        fillHeight 
        padding="32" 
        gap="48" 
        style={{ 
          paddingTop: "120px", 
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
      <Column gap="32" horizontal="center" style={{ maxWidth: "600px", textAlign: "center" }}>
        {/* Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "16px",
            backgroundColor: "var(--brand-background-medium)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="edit" size="xl" color="var(--brand-on-background-strong)" />
        </div>

        {/* Content */}
        <Column gap="16">
          <Heading variant="display-strong-l">Blog Coming Soon</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            We're working on bringing you insights, tutorials, and updates about application monitoring, 
            best practices, and the latest features in Warden.
          </Text>
        </Column>

        {/* Email Subscription */}
        <Column gap="16" fillWidth>
          <Text variant="body-default-m" onBackground="neutral-strong">
            Get notified when we publish our first post
          </Text>
          
          <form onSubmit={handleSubscribe} style={{ width: "100%" }}>
            <Flex gap="12" fillWidth vertical="center">
              <Input
                id="email-subscription"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{ flex: 1 }}
                disabled={subscribed}
              />
              <Button
                type="submit"
                variant="primary"
                size="m"
                disabled={subscribed || subscribing}
                style={{
                  backgroundColor: subscribed ? "var(--success-background-strong)" : "var(--brand-background-strong)",
                  color: subscribed ? "var(--success-on-background-strong)" : "var(--brand-on-background-strong)",
                  minWidth: "120px",
                }}
              >
                {subscribing ? (
                  "Subscribing..."
                ) : subscribed ? (
                  <Flex gap="8" vertical="center">
                    <Icon name="check" size="s" />
                    <span>Subscribed!</span>
                  </Flex>
                ) : (
                  "Notify Me"
                )}
              </Button>
            </Flex>
          </form>
          
          {error && (
            <Text variant="body-default-s" style={{ color: "var(--danger-on-background-strong)" }}>
              {error}
            </Text>
          )}
        </Column>

        {/* What to Expect */}
        <Column center gap="16" style={{ marginTop: "32px" }}>
          <Text variant="heading-strong-m">What to expect</Text>
          <Column gap="12">
            <Column gap="12" vertical="start" horizontal="center">
              <Icon name="book" size="s" color="var(--brand-on-background-strong)" style={{ marginTop: "2px" }} />
              <Column gap="4">
                <Text variant="body-strong-s">Technical Deep Dives</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Learn about monitoring best practices and advanced techniques
                </Text>
              </Column>
            </Column>
            
            <Column gap="12" vertical="start" horizontal="center">
              <Icon name="zap" size="s" color="var(--brand-on-background-strong)" style={{ marginTop: "2px" }} />
              <Column gap="4">
                <Text variant="body-strong-s">Product Updates</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Stay informed about new features and improvements
                </Text>
              </Column>
            </Column>
            
            <Column gap="12" vertical="start" horizontal="center">
              <Icon name="user" size="s" color="var(--brand-on-background-strong)" style={{ marginTop: "2px" }} />
              <Column gap="4">
                <Text variant="body-strong-s">Customer Stories</Text>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  See how teams use Warden to improve their applications
                </Text>
              </Column>
            </Column>
          </Column>
        </Column>

        {/* Back to Home */}
        <Button
          href="/"
          variant="tertiary"
          size="m"
          style={{ marginTop: "16px" }}
        >
          <Flex gap="8" vertical="center">
            <Icon name="arrowLeft" size="s" />
            <span>Back to Home</span>
          </Flex>
        </Button>
      </Column>
    </Column>
    </>
  );
}