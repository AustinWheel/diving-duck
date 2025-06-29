"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Flex, Column, Heading, Text, Icon, Spinner, Button, Tag } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import EventActivityChart from "@/components/EventActivityChart";
import MessageAggregatedEvents from "@/components/MessageAggregatedEvents";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { LogType } from "@/types/database";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { currentProjectId, loading: projectsLoading } = useProject();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [stepSize, setStepSize] = useState(60); // minutes
  const [messageFilter, setMessageFilter] = useState<string | null>(null);
  const [logTypeFilter, setLogTypeFilter] = useState<LogType[]>([]);

  // Fetch dashboard stats using TanStack Query
  const {
    data: stats = { events: 0, alerts: 0, apiKeys: 0, teamMembers: 0 },
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) throw new Error("No project selected");

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token available");

      const response = await fetch(`/api/v1/dashboard/stats?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      console.log("Dashboard stats received:", data.stats);
      return data.stats;
    },
    enabled: !!currentProjectId && !checkingOnboarding,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
  });

  // Fetch aggregated event data
  const {
    data: eventData,
    isLoading: loadingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["event-aggregate", currentProjectId, timeRange, messageFilter, logTypeFilter], // stepSize removed from key
    queryFn: async () => {
      if (!currentProjectId) throw new Error("No project selected");

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token available");

      // Round timestamps to nearest 5 minutes to ensure consistent cache keys
      const now = new Date();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const endTime = new Date(Math.floor(now.getTime() / fiveMinutes) * fiveMinutes); // Round to 5 minutes
      const startTime = new Date(endTime.getTime() - timeRange * 60 * 60 * 1000);

      const body: any = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        stepSize,
      };

      if (messageFilter || logTypeFilter.length > 0) {
        body.filters = {};
        if (messageFilter) {
          body.filters.messages = [messageFilter];
        }
        if (logTypeFilter.length > 0) {
          body.filters.logTypes = logTypeFilter;
        }
      }

      const response = await fetch(`/api/v1/events/aggregate?projectId=${currentProjectId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error("[Dashboard] Failed to fetch event data:", response.status, response.statusText);
        throw new Error("Failed to fetch event data");
      }

      const data = await response.json();
      console.log("[Dashboard] Event aggregate data received:", {
        timeSeriesDataLength: data.timeSeriesData?.length,
        messageAggregatedLength: data.messageAggregated?.length,
        recentAlertsLength: data.recentAlerts?.length,
        alertsLength: data.alerts?.length,
        alerts: data.alerts,
        summary: data.summary,
      });
      
      return data;
    },
    enabled: !!currentProjectId && !checkingOnboarding,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, loading, router]);

  // Update step size when time range changes
  useEffect(() => {
    // Adjust step size based on time range
    if (timeRange <= 24) {
      setStepSize(60); // 1 hour for 24 hours
    } else if (timeRange <= 72) {
      setStepSize(60); // 1 hour for 3 days
    } else if (timeRange <= 168) {
      setStepSize(360); // 6 hours for 1 week
    } else {
      setStepSize(720); // 12 hours for 2 weeks
    }
  }, [timeRange]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (!userData?.isOnboarded) {
        router.push("/onboarding");
      } else {
        setCheckingOnboarding(false);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setCheckingOnboarding(false);
    }
  };

  if (loading || checkingOnboarding || projectsLoading) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "100vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  if (!user) {
    return null;
  }

  // Stats card component
  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: { icon: any; label: string; value: string | number; color?: string }) => (
    <div
      style={{
        flex: 1,
        padding: "24px",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        minWidth: "200px",
      }}
    >
      <Flex gap="16" vertical="center" style={{ marginBottom: "16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            backgroundColor: color ? `${color}20` : "rgba(255, 107, 53, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size="m" color={color || "var(--brand-on-background-strong)"} />
        </div>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {label}
        </Text>
      </Flex>
      <Text variant="heading-strong-xl" onBackground="neutral-strong">
        {value}
      </Text>
    </div>
  );

  return (
    <Column fillWidth padding="32" gap="32">
      {/* Header */}
      <Column gap="8">
        <Heading variant="display-strong-l">
          Welcome back, {user.displayName || user.email}!
        </Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Monitor your application events and manage alerts
        </Text>
      </Column>

      {/* Stats Cards */}
      <Flex gap="24" wrap style={{ marginTop: "16px" }}>
        <StatCard
          icon="zap"
          label="Events (24h)"
          value={loadingStats ? "..." : stats?.events || 0}
        />
        <StatCard
          icon="bell"
          label="Active Alerts"
          value={loadingStats ? "..." : stats?.alerts || 0}
          color="var(--danger-on-background-strong)"
        />
        <StatCard
          icon="key"
          label="API Keys"
          value={loadingStats ? "..." : stats?.apiKeys || 0}
          color="var(--success-on-background-strong)"
        />
        <StatCard
          icon="user"
          label="Team Members"
          value={loadingStats ? "..." : stats?.teamMembers || 0}
          color="var(--info-on-background-strong)"
        />
      </Flex>

      {/* Time Range Selector */}
      <Flex fillWidth horizontal="space-between" vertical="center" style={{ marginTop: "24px" }}>
        <Text variant="heading-strong-m" onBackground="neutral-strong">
          Event Analytics
        </Text>
        <Flex gap="16" vertical="center">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button
            onClick={() => {
              refetchEvents();
              refetchStats();
            }}
            variant="secondary"
            size="m"
            disabled={loadingEvents || loadingStats}
          >
            <Icon name="refresh" size="s" style={{ marginRight: "8px" }} />
            Refresh
          </Button>
        </Flex>
      </Flex>

      {/* Log Type Filters */}
      <Flex gap="8" wrap vertical="center">
        {(["error", "warn", "log", "text"] as LogType[]).map((logType) => {
          const isActive = logTypeFilter.includes(logType);
          const color = {
            error: "#ef4444",
            warn: "#f59e0b",
            callText: "#3b82f6",
            call: "#6366f1",
            log: "#10b981",
            text: "#6b7280",
          }[logType];

          return (
            <Button
              key={logType}
              onClick={() => {
                if (isActive) {
                  setLogTypeFilter(logTypeFilter.filter((t) => t !== logType));
                } else {
                  setLogTypeFilter([...logTypeFilter, logType]);
                }
              }}
              variant="tertiary"
              size="s"
              style={{
                backgroundColor: isActive ? `${color}20` : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${isActive ? color : "rgba(255, 255, 255, 0.1)"}`,
                color: isActive ? color : "var(--neutral-on-background-weak)",
                fontWeight: isActive ? 600 : 400,
                textTransform: "uppercase",
                fontSize: "11px",
                padding: "4px 12px",
                transition: "all 0.2s ease",
              }}
            >
              {logType}
            </Button>
          );
        })}
        {logTypeFilter.length > 0 && (
          <Button
            onClick={() => setLogTypeFilter([])}
            variant="ghost"
            size="s"
            style={{ fontSize: "11px" }}
          >
            Clear filters
          </Button>
        )}
      </Flex>

      {/* Event Activity Chart */}
      <EventActivityChart
        data={eventData?.timeSeriesData || []}
        stepSize={stepSize}
        onStepSizeChange={setStepSize}
        loading={loadingEvents}
      />

      {/* Messages and Alerts Section */}
      <Flex gap="24" style={{ marginTop: "24px" }}>
        <div style={{ flex: 1 }}>
          <MessageAggregatedEvents
            data={eventData?.messageAggregated || []}
            onMessageClick={(message) => {
              setMessageFilter(message === messageFilter ? null : message);
            }}
            loading={loadingEvents}
          />
        </div>

        <Column gap="16" style={{ flex: 1 }}>
          <Flex fillWidth horizontal="space-between" vertical="center">
            <Text variant="heading-strong-l" onBackground="neutral-strong">
              Recent Alerts
            </Text>
            <Button href="/dashboard/alerts" variant="ghost" size="s">
              View All
            </Button>
          </Flex>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "16px",
              height: "400px",
              overflowY: "auto",
            }}
          >
            {loadingEvents ? (
              <Flex center style={{ height: "100%" }}>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Loading alerts...
                </Text>
              </Flex>
            ) : eventData?.recentAlerts?.length > 0 ? (
              <Column gap="8">
                {eventData.recentAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    <Flex horizontal="space-between" vertical="start">
                      <Column gap="4" style={{ flex: 1 }}>
                        <Text variant="body-default-m" onBackground="neutral-strong">
                          {alert.message}
                        </Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {new Date(alert.createdAt).toLocaleString()} • {alert.eventCount} events
                        </Text>
                      </Column>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            alert.status === "sent"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(251, 146, 60, 0.1)",
                          color: alert.status === "sent" ? "#22c55e" : "#fb923c",
                          fontSize: "11px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                        }}
                      >
                        {alert.status}
                      </span>
                    </Flex>
                  </div>
                ))}
              </Column>
            ) : (
              <Flex center style={{ height: "100%" }}>
                <Column gap="8" center>
                  <Icon name="bell" size="l" color="var(--neutral-on-background-weak)" />
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    No alerts triggered
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Configure alert rules to get notified
                  </Text>
                </Column>
              </Flex>
            )}
          </div>
        </Column>
      </Flex>

      {/* Quick Actions */}
      <Column gap="16" style={{ marginTop: "24px" }}>
        <Text variant="heading-strong-m" onBackground="neutral-strong">
          Quick Actions
        </Text>
        <Flex gap="16" wrap>
          <Button href="/dashboard/keys" variant="secondary" size="m">
            <Icon name="key" size="s" padding="8" />
            <Text padding="8">Manage API Keys</Text>
          </Button>
          <Button href="/dashboard/team" variant="secondary" size="m">
            <Icon name="userPlus" size="s" padding="8" />
            <Text padding="8">Invite Team Member</Text>
          </Button>
          <Button href="/dashboard/settings" variant="secondary" size="m">
            <Icon name="settings" size="s" padding="8" />
            <Text padding="8">Configure Alerts</Text>
          </Button>
        </Flex>
      </Column>
    </Column>
  );
}
