"use client";

import { Column, Text, Flex, Icon, Button, Heading } from "@once-ui-system/core";
import { useRouter } from "next/navigation";

interface LimitErrorDialogProps {
  error: {
    error: string;
    message: string;
    suggestion: string;
    details?: {
      limit?: number;
      current?: number;
      tier?: string;
      hoursUntilReset?: number;
      type?: string;
    };
  };
  onClose: () => void;
}

export default function LimitErrorDialog({ error, onClose }: LimitErrorDialogProps) {
  const router = useRouter();

  const getIcon = () => {
    return "alert";
  };

  const getIconColor = () => {
    if (error.details?.type === "daily_alerts" || error.details?.type === "daily_events") {
      return "#f59e0b"; // Warning color for daily limits
    }
    return "#ef4444"; // Error color for hard limits
  };

  const handleUpgrade = () => {
    router.push("/dashboard/subscription");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "rgba(20, 20, 20, 0.95)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "500px",
          width: "100%",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Column gap="24">
          {/* Header */}
          <Flex fillWidth horizontal="space-between" vertical="start">
            <Flex gap="16" vertical="center" style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  minWidth: "48px",
                  borderRadius: "12px",
                  backgroundColor: `${getIconColor()}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={getIcon()} size="m" color={getIconColor()} />
              </div>
              <Heading
                variant="heading-strong-l"
                style={{
                  wordBreak: "break-word",
                  lineHeight: 1.2,
                  flex: 1,
                }}
              >
                {error.error}
              </Heading>
            </Flex>
            <Button
              onClick={onClose}
              variant="ghost"
              size="s"
              style={{ marginLeft: "8px", flexShrink: 0 }}
            >
              <Icon name="x" size="m" />
            </Button>
          </Flex>

          {/* Message */}
          <Column gap="16">
            <Text variant="body-default-m" onBackground="neutral-strong">
              {error.message}
            </Text>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {error.suggestion}
            </Text>
          </Column>

          {/* Details */}
          {error.details &&
            (error.details.limit !== undefined || error.details.hoursUntilReset) && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}
              >
                <Flex gap="16" wrap>
                  {error.details.limit !== undefined && (
                    <Column gap="4">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Current Usage
                      </Text>
                      <Text variant="heading-strong-m">
                        {error.details.current || 0} / {error.details.limit}
                      </Text>
                    </Column>
                  )}
                  {error.details.hoursUntilReset && (
                    <Column gap="4">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Resets In
                      </Text>
                      <Text variant="heading-strong-m">
                        {error.details.hoursUntilReset} hour
                        {error.details.hoursUntilReset !== 1 ? "s" : ""}
                      </Text>
                    </Column>
                  )}
                  {error.details.tier && (
                    <Column gap="4">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Current Plan
                      </Text>
                      <Text variant="heading-strong-m" style={{ textTransform: "capitalize" }}>
                        {error.details.tier}
                      </Text>
                    </Column>
                  )}
                </Flex>
              </div>
            )}

          {/* Actions */}
          <Flex gap="12" fillWidth>
            {error.suggestion.toLowerCase().includes("upgrade") && (
              <Button onClick={handleUpgrade} variant="primary" size="m" style={{ flex: 1 }}>
                <Flex gap="8" vertical="center">
                  <Icon name="arrow-up" size="s" />
                  <span>View Plans</span>
                </Flex>
              </Button>
            )}
            <Button onClick={onClose} variant="secondary" size="m" style={{ flex: 1 }}>
              Got it
            </Button>
          </Flex>
        </Column>
      </div>
    </div>
  );
}
