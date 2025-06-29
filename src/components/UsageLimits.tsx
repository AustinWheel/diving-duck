"use client";

import { Column, Text, Flex, Icon, Heading } from "@once-ui-system/core";
import { SubscriptionLimits, ProjectUsage } from "@/types/database";

interface UsageLimitsProps {
  limits: SubscriptionLimits;
  usage: ProjectUsage;
  teamMemberCount: number;
  activeTestKeys: number;
  activeProdKeys: number;
  phoneNumbers: number;
  alertRules: number;
}

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  icon: string;
  color?: string;
}

function UsageItem({ label, current, limit, icon, color }: UsageItemProps) {
  const percentage = limit === -1 ? 0 : (current / limit) * 100;
  const isUnlimited = limit === -1;
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  const barColor = isAtLimit ? "#ef4444" : isNearLimit ? "#f59e0b" : color || "#10b981";

  return (
    <Column gap="8">
      <Flex fillWidth horizontal="space-between" vertical="center">
        <Flex gap="8" vertical="center">
          <Icon name={icon} size="s" color={barColor} />
          <Text variant="body-default-s" onBackground="neutral-strong">
            {label}
          </Text>
        </Flex>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {isUnlimited ? (
            <span style={{ color: "#10b981" }}>Unlimited</span>
          ) : (
            <>
              <span style={{ color: isAtLimit ? "#ef4444" : "inherit" }}>
                {current.toLocaleString()}
              </span>{" "}
              / {limit.toLocaleString()}
            </>
          )}
        </Text>
      </Flex>
      {!isUnlimited && (
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(percentage, 100)}%`,
              height: "100%",
              backgroundColor: barColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </Column>
  );
}

export default function UsageLimits({
  limits,
  usage,
  teamMemberCount,
  activeTestKeys,
  activeProdKeys,
  phoneNumbers,
  alertRules,
}: UsageLimitsProps) {
  return (
    <Column gap="20">
      <Column gap="8">
        <Heading variant="heading-strong-m">Usage & Limits</Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Track your resource usage and plan limits
        </Text>
      </Column>

      <Column gap="16">
        {/* Daily Limits */}
        <Column gap="12">
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Daily Limits
          </Text>
          <UsageItem
            label="Events Today"
            current={usage.dailyEvents}
            limit={limits.dailyEvents}
            icon="zap"
          />
          <UsageItem
            label="Alerts Today"
            current={usage.dailyAlerts}
            limit={limits.dailyAlerts}
            icon="bell"
          />
        </Column>

        {/* Resource Limits */}
        <Column gap="12" style={{ marginTop: "8px" }}>
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Resource Limits
          </Text>
          <UsageItem
            label="Team Members"
            current={teamMemberCount}
            limit={limits.teamMembers}
            icon="users"
          />
          <UsageItem
            label="Phone Numbers"
            current={phoneNumbers}
            limit={limits.phoneNumbers}
            icon="phone"
          />
          <UsageItem
            label="Alert Rules"
            current={alertRules}
            limit={limits.alertRules}
            icon="message"
          />
          <UsageItem
            label="Test API Keys"
            current={activeTestKeys}
            limit={limits.activeTestKeys}
            icon="key"
            color="#fb923c"
          />
          <UsageItem
            label="Production API Keys"
            current={activeProdKeys}
            limit={limits.activeProdKeys}
            icon="key"
            color="#22c55e"
          />
        </Column>

        {/* Total Limits */}
        <Column gap="12" style={{ marginTop: "8px" }}>
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Limits
          </Text>
          <UsageItem
            label="Test Alerts Sent"
            current={usage.totalTestAlerts}
            limit={limits.testAlerts}
            icon="message"
            color="#3b82f6"
          />
        </Column>
      </Column>

      {/* Reset Times */}
      <Column gap="8" style={{ marginTop: "8px" }}>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Daily limits reset at midnight UTC
        </Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Events reset in {getTimeUntilReset(usage.dailyEventsResetAt)}
        </Text>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Alerts reset in {getTimeUntilReset(usage.dailyAlertsResetAt)}
        </Text>
      </Column>
    </Column>
  );
}

function getTimeUntilReset(resetDate: Date): string {
  const now = new Date();
  const reset = new Date(resetDate);
  const diff = reset.getTime() - now.getTime();

  if (diff <= 0) return "0 hours";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}