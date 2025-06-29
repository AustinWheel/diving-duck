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
  Input,
  CodeBlock,
  InlineCode,
  Row,
  Badge,
  Tag,
} from "@once-ui-system/core";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { LogType } from "@/types/database";

interface LogEvent {
  id: string;
  type: LogType;
  message: string;
  timestamp: string | null;
  keyType: "test" | "prod";
  userId?: string;
  meta?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

interface ApiKey {
  isActive: boolean;
  id: string;
  name: string;
  key: string;
  type: "test" | "prod";
}

export default function EventLogsPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedType, setSelectedType] = useState<LogType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"logs" | "sandbox">("logs");
  const [selectedEvent, setSelectedEvent] = useState<LogEvent | null>(null);

  // Sandbox state
  const [sandboxKeys, setSandboxKeys] = useState<ApiKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [selectedLogType, setSelectedLogType] = useState<LogType>("text");
  const [sandboxMessage, setSandboxMessage] = useState("");
  const [sandboxMeta, setSandboxMeta] = useState("{}");
  const [sandboxSending, setSandboxSending] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{ success: boolean; message: string } | null>(
    null,
  );
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && currentProjectId) {
        loadEvents();
        loadSandboxKeys();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [selectedType, currentProjectId]);

  const loadEvents = async (cursor?: string) => {
    try {
      // Preserve scroll position when loading more
      const scrollContainer = document.querySelector('[style*="overflow: auto"]') as HTMLElement;
      const scrollTop = scrollContainer?.scrollTop || 0;

      if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (currentProjectId) params.append("projectId", currentProjectId);
      if (selectedType !== "all") params.append("type", selectedType);
      if (cursor) params.append("startAfter", cursor);
      if (searchQuery) params.append("search", searchQuery);
      params.append("limit", "20");

      const response = await fetch(`/api/v1/events?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();

      if (cursor) {
        setEvents((prev) => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);

      // Restore scroll position after DOM update
      if (cursor && scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollTop;
        });
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadSandboxKeys = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/v1/keys?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch keys");
      }

      const data = await response.json();
      const activeKeys = data.keys
        .filter((key: ApiKey) => key.isActive)
        .map((key: any) => ({
          id: key.id,
          name: key.name,
          key: key.maskedKey,
          type: key.type,
        }));

      setSandboxKeys(activeKeys);
      if (activeKeys.length > 0) {
        setSelectedKey(activeKeys[0].id);
      }
    } catch (error) {
      console.error("Error loading sandbox keys:", error);
    }
  };

  const sendSandboxLog = async () => {
    if (!selectedKey || !sandboxMessage.trim()) {
      setSandboxResult({ success: false, message: "Please select a key and enter a message" });
      return;
    }

    try {
      setSandboxSending(true);
      setSandboxResult(null);

      // Parse metadata
      let meta = {};
      if (sandboxMeta.trim()) {
        try {
          meta = JSON.parse(sandboxMeta);
        } catch (e) {
          setSandboxResult({ success: false, message: "Invalid JSON metadata" });
          return;
        }
      }

      // For sandbox, we'll create a special endpoint that accepts the key ID
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch("/api/v1/sandbox/log", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyId: selectedKey,
          type: selectedLogType,
          message: sandboxMessage,
          meta: meta,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send log");
      }

      setSandboxResult({ success: true, message: "Log sent successfully!" });
      setSandboxMessage("");
      setSandboxMeta("{}");

      // Refresh logs if on logs tab
      if (activeTab === "logs") {
        setTimeout(() => loadEvents(), 500);
      }
    } catch (error: any) {
      console.error("Error sending sandbox log:", error);
      setSandboxResult({ success: false, message: error.message || "Failed to send log" });
    } finally {
      setSandboxSending(false);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 60 seconds ago
    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s ago`;
    }
    // If less than 60 minutes ago
    else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    }
    // If less than 24 hours ago
    else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    // Otherwise show date
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getLogTypeColor = (type: LogType) => {
    switch (type) {
      case "error":
        return "#ef4444";
      case "warn":
        return "#f59e0b";
      case "call":
      case "callText":
        return "#3b82f6";
      case "log":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const logTypes: LogType[] = ["text", "log", "warn", "error"];

  if (loading || projectsLoading) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  return (
    <Column fillWidth padding="16" gap="24" style={{ paddingTop: "32px", paddingBottom: "32px" }}>
      <Column gap="8">
        <Heading variant="display-strong-l">Event Logs</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          View and test your application events
        </Text>
      </Column>

      {/* Tabs */}
      <Flex
        gap="0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}
      >
        <Button
          onClick={() => setActiveTab("logs")}
          variant={activeTab === "logs" ? "primary" : "secondary"}
          size="m"
        >
          Event Logs
        </Button>
        <Button
          onClick={() => setActiveTab("sandbox")}
          variant={activeTab === "sandbox" ? "primary" : "secondary"}
          style={{ borderWidth: "0px", backgroundColor: "transparent" }}
        >
          <Badge background={activeTab === "sandbox" ? "brand-medium" : "neutral-weak"}>
            Sandbox
          </Badge>
        </Button>
      </Flex>

      {activeTab === "logs" ? (
        <>
          {/* Filters */}
          <Flex gap="16" wrap vertical="center">
            <div style={{ position: "relative" }}>
              <Button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                variant="secondary"
                size="m"
                style={{ minWidth: "120px" }}
                horizontal="space-between"
                suffixIcon="chevronDown"
              >
                Type: {selectedType === "all" ? "All" : selectedType}
              </Button>
              {showTypeDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "4px",
                    backgroundColor: "rgba(40, 40, 40, 0.98)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    zIndex: 10,
                    minWidth: "120px",
                  }}
                >
                  <Button
                    onClick={() => {
                      setSelectedType("all");
                      setShowTypeDropdown(false);
                    }}
                    variant="tertiary"
                    size="s"
                    fillWidth
                    style={{ borderRadius: 0, justifyContent: "flex-start" }}
                  >
                    All
                  </Button>
                  {logTypes.map((type) => (
                    <Button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setShowTypeDropdown(false);
                      }}
                      variant="tertiary"
                      size="s"
                      fillWidth
                      style={{ borderRadius: 0, justifyContent: "flex-start" }}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Input
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              style={{ maxWidth: "300px" }}
            />

            <Button onClick={() => loadEvents()} variant="secondary" size="m">
              <Icon name="refresh" size="s" style={{ marginRight: "8px" }} />
              Refresh
            </Button>
          </Flex>

          {/* Events Table */}
          {events.length === 0 ? (
            <div
              style={{
                padding: "48px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <Icon name="list" size="l" color="var(--neutral-on-background-weak)" />
              <Text variant="body-default-m" onBackground="neutral-weak" padding="16">
                No events found
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Events will appear here when your application sends logs
              </Text>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      Time
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      Key
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      IP
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      User ID
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr
                      key={event.id}
                      style={{
                        borderBottom:
                          index < events.length - 1
                            ? "1px solid rgba(255, 255, 255, 0.04)"
                            : "none",
                        transition: "background-color 0.2s",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedEvent(event)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          whiteSpace: "nowrap",
                          color: "var(--neutral-on-background-weak)",
                          fontSize: "12px",
                        }}
                      >
                        {formatTimestamp(event.timestamp)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: `${getLogTypeColor(event.type)}15`,
                            color: getLogTypeColor(event.type),
                            fontSize: "11px",
                            fontWeight: 500,
                            textTransform: "uppercase",
                          }}
                        >
                          {event.type}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              event.keyType === "prod"
                                ? "rgba(34, 197, 94, 0.1)"
                                : "rgba(251, 146, 60, 0.1)",
                            color: event.keyType === "prod" ? "#22c55e" : "#fb923c",
                            fontSize: "11px",
                            fontWeight: 500,
                            textTransform: "uppercase",
                          }}
                        >
                          {event.keyType}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--neutral-on-background-weak)",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      >
                        {event.ip || "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--neutral-on-background-weak)",
                          fontSize: "12px",
                        }}
                      >
                        {event.meta?.userId || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", maxWidth: "400px" }}>
                        <Text
                          variant="body-default-s"
                          style={{
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "1.5",
                          }}
                          title={event.message}
                        >
                          {event.message}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <Flex center style={{ marginTop: "16px" }}>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  loadEvents(nextCursor!);
                }}
                variant="secondary"
                size="m"
                disabled={loadingMore}
              >
                {loadingMore ? <Spinner size="s" /> : "Load More"}
              </Button>
            </Flex>
          )}

          {/* Event Details Modal */}
          {selectedEvent && (
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
              }}
              onClick={() => setSelectedEvent(null)}
            >
              <div
                style={{
                  backgroundColor: "rgba(20, 20, 20, 0.95)",
                  borderRadius: "16px",
                  padding: "32px",
                  maxWidth: "600px",
                  width: "90%",
                  maxHeight: "80vh",
                  overflow: "auto",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Flex horizontal="space-between" vertical="center" style={{ marginBottom: "24px" }}>
                  <Heading variant="heading-strong-l">Event Details</Heading>
                  <Button onClick={() => setSelectedEvent(null)} variant="tertiary" size="s">
                    <Icon name="x" size="m" />
                  </Button>
                </Flex>

                <Column gap="20">
                  <Column gap="8">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Timestamp
                    </Text>
                    <Text variant="body-default-m">
                      {new Date(selectedEvent.timestamp || "").toLocaleString()}
                    </Text>
                  </Column>

                  <Flex gap="16">
                    <Column gap="8">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Type
                      </Text>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: `${getLogTypeColor(selectedEvent.type)}15`,
                          color: getLogTypeColor(selectedEvent.type),
                          fontSize: "12px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          display: "inline-block",
                        }}
                      >
                        {selectedEvent.type}
                      </span>
                    </Column>

                    <Column gap="8">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Key Type
                      </Text>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor:
                            selectedEvent.keyType === "prod"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(251, 146, 60, 0.1)",
                          color: selectedEvent.keyType === "prod" ? "#22c55e" : "#fb923c",
                          fontSize: "12px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          display: "inline-block",
                        }}
                      >
                        {selectedEvent.keyType}
                      </span>
                    </Column>
                  </Flex>

                  <Column gap="8">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Message
                    </Text>
                    <Text variant="body-default-m" style={{ wordBreak: "break-word" }}>
                      {selectedEvent.message}
                    </Text>
                  </Column>

                  <Flex gap="16">
                    <Column gap="8">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        IP Address
                      </Text>
                      <Text variant="body-default-m" style={{ fontFamily: "monospace" }}>
                        {selectedEvent.ip || "—"}
                      </Text>
                    </Column>

                    <Column gap="8">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        User Agent
                      </Text>
                      <Text
                        variant="body-default-m"
                        style={{ fontSize: "12px", wordBreak: "break-word" }}
                      >
                        {selectedEvent.userAgent || "—"}
                      </Text>
                    </Column>
                  </Flex>

                  {selectedEvent.meta && Object.keys(selectedEvent.meta).length > 0 && (
                    <Column gap="8">
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Metadata
                      </Text>
                      <div
                        style={{
                          padding: "16px",
                          backgroundColor: "rgba(0, 0, 0, 0.4)",
                          borderRadius: "8px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          overflowX: "auto",
                        }}
                      >
                        <pre style={{ margin: 0, color: "var(--text-on-background)" }}>
                          {JSON.stringify(selectedEvent.meta, null, 2)}
                        </pre>
                      </div>
                    </Column>
                  )}

                  <Column gap="8">
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Event ID
                    </Text>
                    <Text
                      variant="body-default-s"
                      style={{
                        fontFamily: "monospace",
                        color: "var(--neutral-on-background-weak)",
                      }}
                    >
                      {selectedEvent.id}
                    </Text>
                  </Column>
                </Column>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Sandbox Tab */
        <Column gap="24">
          <Text variant="body-default-m" onBackground="neutral-weak">
            Test your logging setup by sending events directly from the dashboard.
          </Text>

          <Column gap="16">
            <Column gap="8">
              <Text variant="body-default-s" onBackground="neutral-strong">
                API Key
              </Text>
              <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                <Button
                  onClick={() => setShowKeyDropdown(!showKeyDropdown)}
                  variant="secondary"
                  size="m"
                  fillWidth
                  horizontal="space-between"
                  disabled={sandboxKeys.length === 0}
                  suffixIcon="chevronDown"
                >
                  <Text>
                    {sandboxKeys.find((k) => k.id === selectedKey)?.name || "Select a key"}
                  </Text>
                </Button>
                {showKeyDropdown && sandboxKeys.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: "4px",
                      backgroundColor: "rgba(40, 40, 40, 0.98)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      overflow: "hidden",
                      zIndex: 10,
                    }}
                  >
                    {sandboxKeys.map((key) => (
                      <Row
                        fillWidth
                        horizontal="space-between"
                        vertical="center"
                        padding="xs"
                        gap="8"
                        key={key.id}
                      >
                        <Button
                          onClick={() => {
                            setSelectedKey(key.id);
                            setShowKeyDropdown(false);
                          }}
                          variant="tertiary"
                          size="m"
                          fillWidth
                          style={{
                            justifyContent: "flex-start",
                          }}
                        >
                          <Text>{key.name}</Text>
                        </Button>
                        <Tag
                          variant={key.type === "prod" ? "success" : "warning"}
                          label={key.type.toUpperCase()}
                        />
                      </Row>
                    ))}
                  </div>
                )}
              </div>
            </Column>

            <Column gap="8">
              <Text variant="body-default-s" onBackground="neutral-strong">
                Log Type
              </Text>
              <Flex gap="8" wrap>
                {logTypes.map((type) => (
                  <Button
                    key={type}
                    onClick={() => setSelectedLogType(type)}
                    variant={selectedLogType === type ? "primary" : "secondary"}
                    size="s"
                  >
                    {type}
                  </Button>
                ))}
              </Flex>
            </Column>

            <Column gap="8">
              <Text variant="body-default-s" onBackground="neutral-strong">
                Message
              </Text>
              <Input
                id="sandbox-message-input"
                value={sandboxMessage}
                onChange={(e) => setSandboxMessage(e.target.value)}
                placeholder="Enter your log message..."
                style={{ maxWidth: "600px" }}
              />
            </Column>

            <Column gap="8">
              <Text variant="body-default-s" onBackground="neutral-strong">
                Metadata (JSON)
              </Text>
              <textarea
                value={sandboxMeta}
                onChange={(e) => setSandboxMeta(e.target.value)}
                placeholder='{"userId": "123", "action": "click"}'
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  minHeight: "100px",
                  padding: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  color: "var(--text-on-background)",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </Column>

            <Flex gap="16">
              <Button
                onClick={sendSandboxLog}
                variant="primary"
                size="m"
                disabled={sandboxSending || !selectedKey || !sandboxMessage.trim()}
              >
                {sandboxSending ? <Spinner size="s" /> : "Send Log"}
              </Button>
            </Flex>

            {sandboxResult && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: sandboxResult.success
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${sandboxResult.success ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  borderRadius: "8px",
                  color: sandboxResult.success ? "#22c55e" : "#ef4444",
                }}
              >
                {sandboxResult.message}
              </div>
            )}
          </Column>

          <Column gap="8" style={{ marginTop: "24px" }}>
            <Text variant="heading-strong-m">How to use in your app:</Text>
            <CodeBlock
              copyButton={true}
              codes={[
                {
                  code: `npm install @console-warden`,
                  language: "bash",
                  label: "Shell",
                },
              ]}
            />

            <CodeBlock
              copyButton={true}
              codes={[
                {
                  code: `echo "WARDEN_PUBLIC_KEY=${sandboxKeys.find((key) => key.id === selectedKey)?.key}" >> .env`,
                  language: "bash",
                  label: "Shell",
                },
              ]}
            />

            <CodeBlock
              copyButton={true}
              codes={[
                {
                  code: `// Save your public key as an environment variable
// .env:
// WARDEN_PUBLIC_KEY='your_public_key_here'

// Use the enhanced console methods
import 'console-warden';

console.text('User account not found');

// Standard methods also captured
console.log('Debug info');
console.warn('Warning message');
console.error('Error occurred');`,
                  language: "javascript",
                  label: "JavaScript",
                },
              ]}
            />
          </Column>
        </Column>
      )}
    </Column>
  );
}
