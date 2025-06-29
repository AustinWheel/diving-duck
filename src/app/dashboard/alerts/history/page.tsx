"use client";

import { useState, useEffect } from "react";
import { Column, Heading, Text, Button, Flex, Icon, Spinner } from "@once-ui-system/core";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { Alert } from "@/types/database";

export default function AlertHistoryPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && currentProjectId) {
        loadAlerts();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadAlerts = async (append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.log("No auth token available");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ limit: "20" });
      if (currentProjectId) params.append("projectId", currentProjectId);
      if (append && cursor) params.append("cursor", cursor);

      const response = await fetch(`/api/v1/alerts/history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch alert history");
      }

      const data = await response.json();

      if (append) {
        setAlerts((prev) => [...prev, ...data.alerts]);
      } else {
        setAlerts(data.alerts);
      }

      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading alerts:", error);
      setToastMessage({ message: "Failed to load alert history", type: "error" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "#22c55e";
      case "failed":
        return "#ef4444";
      case "pending":
        return "#fb923c";
      case "acknowledged":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  if (loading || projectsLoading) {
    return (
      <Column fillWidth padding="l" alignItems="center" gap="l">
        <Spinner size="l" />
      </Column>
    );
  }

  return (
    <Column fillWidth padding="l" gap="l">
      <Flex fillWidth horizontal="space-between" vertical="center">
        <Heading variant="display-strong-s">Alert History</Heading>
      </Flex>

      <Text variant="body-default-m" onBackground="neutral-weak">
        View all triggered alerts and their delivery status.
      </Text>

      {alerts.length === 0 ? (
        <div
          style={{
            padding: "48px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Icon name="bell" size="l" color="var(--neutral-on-background-weak)" />
          <Text variant="body-default-m" onBackground="neutral-weak" padding="16">
            No alerts have been triggered yet
          </Text>
        </div>
      ) : (
        <Column gap="16">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
              }}
            >
              <Column gap="12">
                <Flex fillWidth horizontal="space-between" vertical="start">
                  <Column gap="4">
                    <Flex gap="12" vertical="center">
                      <Icon
                        name={alert.notificationType === "call" ? "phone" : "message"}
                        size="s"
                      />
                      <Text variant="heading-strong-s">{alert.message}</Text>
                    </Flex>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {formatDate(alert.createdAt)}
                    </Text>
                  </Column>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: `${getStatusColor(alert.status)}20`,
                      color: getStatusColor(alert.status),
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {alert.status.toUpperCase()}
                  </span>
                </Flex>

                <Flex gap="24" wrap>
                  <Column gap="4">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Event Count
                    </Text>
                    <Text variant="body-default-s">{alert.eventCount}</Text>
                  </Column>
                  <Column gap="4">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Window
                    </Text>
                    <Text variant="body-default-s">
                      {formatDate(alert.windowStart)} - {formatDate(alert.windowEnd)}
                    </Text>
                  </Column>
                  {alert.error && (
                    <Column gap="4">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Error
                      </Text>
                      <Text variant="body-default-s" style={{ color: "#ef4444" }}>
                        {alert.error}
                      </Text>
                    </Column>
                  )}
                </Flex>
              </Column>
            </div>
          ))}

          {hasMore && (
            <Flex fillWidth justifyContent="center" padding="m">
              <Button
                onClick={() => loadAlerts(true)}
                variant="secondary"
                size="m"
                disabled={loadingMore}
              >
                {loadingMore ? <Spinner size="s" /> : "Load More"}
              </Button>
            </Flex>
          )}
        </Column>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "16px 24px",
            backgroundColor:
              toastMessage.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${toastMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            borderRadius: "8px",
            color: toastMessage.type === "success" ? "#22c55e" : "#ef4444",
            zIndex: 1001,
          }}
        >
          {toastMessage.message}
        </div>
      )}
    </Column>
  );
}
