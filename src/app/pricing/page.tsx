"use client";

import { Column, Heading, Text, Button, Flex, Icon, Row, Badge } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const plans = [
    {
      name: "Hobby",
      price: "Free",
      description: "Perfect for side projects and experimentation",
      features: [
        "Up to 15,000 events/month",
        "1 Test key (2-hour expiry)",
        "1 Production key",
        "Email support",
        "2 team members",
        "30-day log retention",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For growing applications and small teams",
      features: [
        "Up to 90,000 events/month",
        "Production keys with domain whitelisting",
        "Priority email support",
        "11 team members",
        "Unlimited log retention",
        "SMS/Email/Webhook alerts (300/month included)",
        "Custom alert rules",
      ],
      cta: "Start Now",
      highlighted: true,
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large teams with advanced needs",
      features: [
        "Unlimited events",
        "Unlimited API keys",
        "24/7 phone support",
        "Unlimited team members",
        "Unlimited log retention",
        "Unlimited SMS alerts",
        "Phone call alerts",
        "SSO/SAML",
        "Custom integrations",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <>
      <Navbar />
      <Column fillWidth padding="32" gap="48" style={{ paddingTop: "120px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <Column gap="16" horizontal="center" style={{ textAlign: "center" }}>
        <Heading variant="display-strong-xl">Simple, transparent pricing</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak" style={{ maxWidth: "600px" }}>
          Start free and scale as you grow. No hidden fees, no surprises.
        </Text>
      </Column>

      {/* Pricing Cards */}
      <Row gap="24" mobileDirection="column" style={{ marginTop: "32px" }}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              flex: 1,
              padding: "32px",
              backgroundColor: plan.highlighted ? "rgba(255, 107, 53, 0.05)" : "rgba(255, 255, 255, 0.02)",
              border: plan.highlighted ? "2px solid var(--brand-border-strong)" : "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              position: "relative",
              transition: "all 0.3s ease",
            }}
          >
            {plan.popular && (
              <Badge
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                Most Popular
              </Badge>
            )}
            
            <Column gap="24" fillHeight>
              <Column gap="12" fillHeight>
                  <Text variant="heading-strong-l">{plan.name}</Text>
                  <Flex gap="4" vertical="end">
                    <Text variant="display-strong-l">{plan.price}</Text>
                    {plan.period && (
                      <Text variant="body-default-m" onBackground="neutral-weak">{plan.period}</Text>
                    )}
                  </Flex>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    {plan.description}
                  </Text>
  
                <Column gap="12">
                  {plan.features.map((feature, idx) => (
                    <Flex key={idx} gap="12" vertical="center">
                      <Icon 
                        name="check" 
                        size="s" 
                        color={plan.highlighted ? "var(--brand-on-background-strong)" : "var(--success-on-background-strong)"} 
                      />
                      <Text variant="body-default-m">{feature}</Text>
                    </Flex>
                  ))}
                </Column>
              </Column>
              <Button
                onClick={() => {
                  if (plan.name === "Enterprise") {
                    window.location.href = "mailto:sales@warden.dev?subject=Enterprise%20Inquiry";
                  } else {
                    router.push(user ? "/dashboard/subscription" : "/auth/signin");
                  }
                }}
                variant={plan.highlighted ? "primary" : "secondary"}
                size="l"
                fillWidth
                style={plan.highlighted ? {
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                } : {}}
              >
                {plan.cta}
              </Button>
            </Column>
          </div>
        ))}
      </Row>

      {/* FAQ Section */}
      <Column gap="32" style={{ marginTop: "48px" }}>
        <Heading variant="heading-strong-l" style={{ textAlign: "center" }}>
          Frequently Asked Questions
        </Heading>
        
        <Row gap="32" mobileDirection="column">
          <Column gap="24" fillWidth>
            <Column gap="8">
              <Text variant="heading-strong-m">What counts as an event?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Any log sent to Warden counts as an event: console.text(), console.error(), console.warn(), console.log(), console.call(), or console.callText().
              </Text>
            </Column>
            
            <Column gap="8">
              <Text variant="heading-strong-m">Can I change plans anytime?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate your billing.
              </Text>
            </Column>
            
            <Column gap="8">
              <Text variant="heading-strong-m">Do you offer annual billing?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Yes, annual billing is available with a 20% discount on Pro and Enterprise plans. Contact us to switch to annual billing.
              </Text>
            </Column>
          </Column>
          
          <Column gap="24" fillWidth>
            <Column gap="8">
              <Text variant="heading-strong-m">What happens if I exceed my limits?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                There is some support for saving events beyond your logs. Although requests will start to fail and you may need to upgrade your plan.
              </Text>
            </Column>
            
            <Column gap="8">
              <Text variant="heading-strong-m">Is there a free trial?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                The Hobby plan is always free, no credit card required.
              </Text>
            </Column>
            
            <Column gap="8">
              <Text variant="heading-strong-m">How do SMS alerts work?</Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Configure alert thresholds in your dashboard. When triggered, we'll send SMS notifications to your configured phone numbers. Pro plans include 100 SMS/month.
              </Text>
            </Column>
          </Column>
        </Row>
      </Column>

      {/* CTA Section */}
      <Column 
        gap="24" 
        horizontal="center" 
        style={{ 
          marginTop: "48px", 
          padding: "48px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        <Heading variant="heading-strong-l">Ready to get started?</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Join developers who trust Warden for production monitoring
        </Text>
        <Button
          href={user ? "/dashboard" : "/auth/signin"}
          variant="primary"
          size="l"
          style={{
            backgroundColor: "var(--brand-background-strong)",
            color: "var(--brand-on-background-strong)",
          }}
        >
          Start Free
        </Button>
      </Column>
    </Column>
    </>
  );
}