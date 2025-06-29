"use client";

import { useState, useEffect } from "react";
import {
  Column,
  Heading,
  Text,
  Button,
  Flex,
  Icon,
  Spinner,
  Badge,
} from "@once-ui-system/core";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import UsageLimits from "@/components/UsageLimits";
import { Project, SubscriptionTier } from "@/types/database";
import { countActiveKeys, countTeamMembers } from "@/lib/subscription";

const TIER_DETAILS = {
  basic: {
    name: "Basic",
    price: "Free",
    description: "Perfect for getting started with small projects",
    features: [
      "2 team members (including owner)",
      "500 events per day",
      "1 alert per day",
      "5 total test alerts",
      "2 phone numbers",
      "1 alert rule",
      "1 active test key",
      "1 active production key",
    ],
  },
  pro: {
    name: "Pro",
    price: "$29/month",
    description: "For growing teams and production applications",
    features: [
      "11 team members",
      "50,000 events per day",
      "100 alerts per day",
      "Unlimited test alerts",
      "10 phone numbers",
      "10 alert rules",
      "5 active test keys",
      "5 active production keys",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    description: "Unlimited resources for large organizations",
    features: [
      "Unlimited team members",
      "Unlimited events",
      "Unlimited alerts",
      "Unlimited test alerts",
      "Unlimited phone numbers",
      "Unlimited alert rules",
      "Unlimited API keys",
      "Priority support",
    ],
  },
};

export default function SubscriptionPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [resourceCounts, setResourceCounts] = useState({
    teamMembers: 0,
    activeTestKeys: 0,
    activeProdKeys: 0,
    phoneNumbers: 0,
    alertRules: 0,
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && currentProjectId) {
        loadProjectData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token || !currentProjectId) return;

      // Get project data
      const projectDoc = await getDoc(doc(db, "projects", currentProjectId));
      if (!projectDoc.exists()) {
        console.error("Project not found");
        return;
      }

      const projectData = projectDoc.data() as Project;
      setProject(projectData);

      // Get resource counts via API
      const [statsResponse, keysResponse] = await Promise.all([
        fetch(`/api/v1/dashboard/stats?projectId=${currentProjectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/keys?projectId=${currentProjectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsResponse.ok) {
        const { stats } = await statsResponse.json();
        setResourceCounts((prev) => ({
          ...prev,
          teamMembers: stats.teamMembers || 1,
        }));
      }

      if (keysResponse.ok) {
        const { keys } = await keysResponse.json();
        const activeTestKeys = keys.filter((k: any) => k.type === "test" && k.isActive).length;
        const activeProdKeys = keys.filter((k: any) => k.type === "prod" && k.isActive).length;
        
        setResourceCounts((prev) => ({
          ...prev,
          activeTestKeys,
          activeProdKeys,
        }));
      }

      // Count phone numbers and alert rules
      const phoneNumbers = projectData.alertConfig?.phoneNumbers?.length || 0;
      const alertRules = projectData.alertConfig?.alertRules?.length || 0;
      
      setResourceCounts((prev) => ({
        ...prev,
        phoneNumbers,
        alertRules,
      }));

    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || projectsLoading) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  if (!project) {
    return (
      <Column fillWidth padding="32" gap="16">
        <Text>No project data available</Text>
      </Column>
    );
  }

  const currentTier = project.subscriptionTier || "basic";
  const limits = project.subscriptionLimits;
  const usage = project.usage || {
    dailyEvents: 0,
    dailyEventsResetAt: new Date(),
    dailyAlerts: 0,
    dailyAlertsResetAt: new Date(),
    totalTestAlerts: 0,
    lastUpdated: new Date(),
  };

  return (
    <Column
      fillWidth
      padding="16"
      gap="24"
      style={{ "@media (minWidth: 768px)": { padding: "32px", gap: "32px" } }}
    >
      {/* Header */}
      <Column gap="8">
        <Heading variant="display-strong-l">Subscription & Usage</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Manage your plan and monitor resource usage
        </Text>
      </Column>

      {/* Current Plan */}
      <div
        style={{
          padding: "24px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
        }}
      >
        <Flex fillWidth horizontal="space-between" vertical="start" wrap gap="24">
          <Column gap="12" style={{ flex: 1, minWidth: "300px" }}>
            <Flex gap="12" vertical="center">
              <Icon name="diamond" size="m" />
              <Heading variant="heading-strong-m">Current Plan</Heading>
            </Flex>
            <Flex gap="12" vertical="center">
              <Text variant="display-strong-m">{TIER_DETAILS[currentTier].name}</Text>
              <Badge background={currentTier === "basic" ? "neutral-weak" : "brand-medium"}>
                {TIER_DETAILS[currentTier].price}
              </Badge>
            </Flex>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {TIER_DETAILS[currentTier].description}
            </Text>
          </Column>
          {currentTier === "basic" && (
            <Flex direction="column" gap="12">
              <Button variant="primary" size="m" disabled>
                <Flex gap="8" vertical="center">
                  <Icon name="arrow-up" size="s" />
                  <span>Upgrade to Pro</span>
                </Flex>
              </Button>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textAlign: "center" }}>
                Coming soon
              </Text>
            </Flex>
          )}
        </Flex>
      </div>

      {/* Usage Limits */}
      {limits && (
        <div
          style={{
            padding: "24px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
          }}
        >
          <UsageLimits
            limits={limits}
            usage={usage}
            teamMemberCount={resourceCounts.teamMembers}
            activeTestKeys={resourceCounts.activeTestKeys}
            activeProdKeys={resourceCounts.activeProdKeys}
            phoneNumbers={resourceCounts.phoneNumbers}
            alertRules={resourceCounts.alertRules}
          />
        </div>
      )}

      {/* Plan Comparison */}
      <Column gap="16">
        <Heading variant="heading-strong-m">All Plans</Heading>
        <Flex gap="16" wrap>
          {Object.entries(TIER_DETAILS).map(([tier, details]) => (
            <div
              key={tier}
              style={{
                flex: "1 1 300px",
                padding: "24px",
                backgroundColor: tier === currentTier ? "rgba(255, 107, 53, 0.05)" : "rgba(255, 255, 255, 0.02)",
                border: `1px solid ${tier === currentTier ? "rgba(255, 107, 53, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "12px",
              }}
            >
              <Column gap="16">
                <Column gap="8">
                  <Flex horizontal="space-between" vertical="center">
                    <Heading variant="heading-strong-m">{details.name}</Heading>
                    {tier === currentTier && (
                      <Badge background="brand-medium">Current</Badge>
                    )}
                  </Flex>
                  <Text variant="display-strong-m">{details.price}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {details.description}
                  </Text>
                </Column>
                <Column gap="8">
                  {details.features.map((feature, index) => (
                    <Flex key={index} gap="8" vertical="start">
                      <Icon name="check" size="s" color="var(--success-on-background-strong)" />
                      <Text variant="body-default-s">{feature}</Text>
                    </Flex>
                  ))}
                </Column>
                {tier !== currentTier && (
                  <Button
                    variant={tier === "basic" ? "secondary" : "primary"}
                    size="m"
                    fillWidth
                    disabled
                  >
                    {tier === "basic" ? "Downgrade" : tier === "pro" ? "Upgrade to Pro" : "Contact Sales"}
                  </Button>
                )}
              </Column>
            </div>
          ))}
        </Flex>
      </Column>
    </Column>
  );
}