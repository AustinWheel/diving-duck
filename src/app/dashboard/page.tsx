"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Flex, Row, Column, Heading, Text, Icon, Spinner, Button, Tag } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { getAuth } from "firebase/auth";
import EventActivityChart from "@/components/EventActivityChart";
import MessageAggregatedEvents from "@/components/MessageAggregatedEvents";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { LogType } from "@/types/database";
import { useLiveEventCount } from "@/hooks/useLiveEventCount";

export default function Dashboard() {
  const { user, loading, isOnboarded } = useAuth();
  const { currentProjectId, loading: projectsLoading } = useProject();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [timeRange, setTimeRange] = useState(1); // hours - default to 1 hour
  const [stepSize, setStepSize] = useState(1); // minutes - default to 1 minute
  const [messageFilter, setMessageFilter] = useState<string | null>(null);
  const [logTypeFilter, setLogTypeFilter] = useState<LogType[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Live event count
  const { count: liveEventCount, isConnected } = useLiveEventCount({
    projectId: currentProjectId,
    enabled: !!currentProjectId && !checkingOnboarding,
  });

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
    staleTime: 0, // No caching
    gcTime: 0, // Remove from cache immediately
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

      // Calculate time range - round to nearest minute for consistent caching
      const now = new Date();
      const oneMinute = 60 * 1000; // 1 minute in milliseconds
      const endTime = new Date(Math.floor(now.getTime() / oneMinute) * oneMinute); // Round down to minute
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
        console.error(
          "[Dashboard] Failed to fetch event data:",
          response.status,
          response.statusText,
        );
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
    staleTime: 0, // No caching
    gcTime: 0, // Remove from cache immediately
    refetchInterval: false, // Disable automatic refetching
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (user && !loading) {
      // Use onboarding status from AuthContext
      if (!isOnboarded) {
        router.push("/onboarding");
      } else {
        setCheckingOnboarding(false);
      }
    }
  }, [user, loading, isOnboarded, router]);

  // Check for mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Update step size when time range changes
  useEffect(() => {
    // Adjust step size based on time range
    if (timeRange <= 1) {
      setStepSize(1); // 1 minute for 1 hour
    } else if (timeRange <= 6) {
      setStepSize(5); // 5 minutes for up to 6 hours
    } else if (timeRange <= 24) {
      setStepSize(30); // 30 minutes for 24 hours
    } else if (timeRange <= 72) {
      setStepSize(60); // 1 hour for 3 days
    } else if (timeRange <= 168) {
      setStepSize(360); // 6 hours for 1 week
    } else {
      setStepSize(720); // 12 hours for 2 weeks
    }
  }, [timeRange]);


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
        padding: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
      }}
    >
      <Flex gap="12" vertical="center" style={{ marginBottom: "8px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            backgroundColor: color ? `${color}15` : "rgba(255, 107, 53, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size="s" color={color || "var(--brand-on-background-strong)"} />
        </div>
        <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: "1.2" }}>
          {label}
        </Text>
      </Flex>
      <Text variant="heading-strong-l" onBackground="neutral-strong">
        {value}
      </Text>
    </div>
  );

  return (
    <Column fillWidth padding="32" gap="32">
      <style jsx>{`
        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.8);
          }
        }
      `}</style>
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
      <Column gap="8">
        <Row fillWidth mobileDirection="row" gap="8">
          <Column fillWidth>
            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                position: "relative",
              }}
            >
              <Flex gap="12" vertical="center" style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 107, 53, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="activity" size="s" color="var(--brand-on-background-strong)" />
                </div>
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: "1.2" }}>
                  Total Events
                </Text>
                {isConnected && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                      animation: "pulse-dot 2s infinite",
                      marginLeft: "auto",
                    }}
                    title="Live updates active"
                  />
                )}
              </Flex>
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                {liveEventCount === null ? "..." : liveEventCount.toLocaleString()}
              </Text>
            </div>
          </Column>
          <Column fillWidth>
            <StatCard
              icon="bell"
              label="Active Alerts"
              value={loadingStats ? "..." : stats?.alerts || 0}
              color="var(--danger-on-background-strong)"
            />
          </Column>
        </Row>

        <Row fillWidth mobileDirection="row" gap="8">
          <Column fillWidth>
            <StatCard
              icon="key"
              label="API Keys"
              value={loadingStats ? "..." : stats?.apiKeys || 0}
              color="var(--success-on-background-strong)"
            />
          </Column>
          <Column fillWidth>
            <StatCard
              icon="user"
              label="Team Members"
              value={loadingStats ? "..." : stats?.teamMembers || 0}
              color="var(--info-on-background-strong)"
            />
          </Column>
        </Row>
      </Column>

      {/* Time Range Selector */}
      <Flex
        fillWidth
        horizontal={isMobile ? "start" : "space-between"}
        vertical={isMobile ? "start" : "center"}
        direction={isMobile ? "column" : "row"}
        gap="16"
        style={{ marginTop: "24px" }}
      >
        <Column gap="4">
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            Event Analytics
          </Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Logs might take up to 1 minute to update
          </Text>
        </Column>
        <Flex gap="8" vertical="center">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button
            onClick={() => {
              refetchEvents();
              refetchStats();
            }}
            variant="secondary"
            size="m"
            disabled={loadingEvents || loadingStats}
            style={{
              padding: "8px",
              minWidth: "auto",
            }}
            title="Refresh data"
          >
            <Icon name="refresh" size="s" />
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
      <Row mobileDirection="column" gap="24" fillWidth>
        <Column fillWidth>
          <MessageAggregatedEvents
            data={eventData?.messageAggregated || []}
            onMessageClick={(message) => {
              setMessageFilter(message === messageFilter ? null : message);
            }}
            loading={loadingEvents}
          />
        </Column>

        <Column gap="16" fillWidth fitHeight>
          <Flex fillWidth horizontal="space-between" vertical="center">
            <Text variant="heading-strong-l" onBackground="neutral-strong">
              Recent Alerts
            </Text>
            <Button href="/dashboard/alerts" variant="tertiary" size="s">
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
                    <Flex horizontal="space-between" vertical="center">
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
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor:
                            alert.status === "sent"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(251, 146, 60, 0.1)",
                          color: alert.status === "sent" ? "#22c55e" : "#fb923c",
                          fontSize: "11px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          marginLeft: "12px",
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
      </Row>

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
