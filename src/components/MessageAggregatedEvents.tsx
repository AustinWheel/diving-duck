"use client";

import React from "react";
import { Column, Text, Flex } from "@once-ui-system/core";
import { LogType } from "@/types/database";

interface MessageAggregatedEventsProps {
  data: Array<{
    message: string;
    count: number;
    logTypes: LogType[];
  }>;
  onMessageClick?: (message: string) => void;
  loading?: boolean;
}

const LOG_TYPE_COLORS = {
  error: "#ef4444",
  warn: "#f59e0b",
  callText: "#3b82f6",
  call: "#6366f1",
  log: "#10b981",
  text: "#6b7280",
};

export default function MessageAggregatedEvents({
  data,
  onMessageClick,
  loading = false,
}: MessageAggregatedEventsProps) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  if (loading) {
    return (
      <Column gap="16" fillWidth>
        <Text variant="heading-strong-l" onBackground="neutral-strong">
          Events by Message
        </Text>
        <div
          style={{
            height: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
          }}
        >
          <Text variant="body-default-m" onBackground="neutral-weak">
            Loading events...
          </Text>
        </div>
      </Column>
    );
  }

  return (
    <Column gap="16" fillWidth>
      <Text variant="heading-strong-l" onBackground="neutral-strong">
        Events by Message
      </Text>

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
        {data.length === 0 ? (
          <Flex center style={{ height: "100%" }}>
            <Text variant="body-default-m" onBackground="neutral-weak">
              No events to display
            </Text>
          </Flex>
        ) : (
          <Column gap="8">
            {data.map((item, index) => (
              <div
                key={index}
                onClick={() => onMessageClick?.(item.message)}
                style={{
                  position: "relative",
                  padding: "12px 16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  cursor: onMessageClick ? "pointer" : "default",
                  transition: "all 0.2s",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                }}
              >
                {/* Background bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    zIndex: 0,
                  }}
                />

                {/* Content */}
                <Flex
                  gap="16"
                  horizontal="space-between"
                  vertical="center"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  <Column gap="4" style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      variant="body-default-m"
                      onBackground="neutral-strong"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.message}
                    >
                      {item.message}
                    </Text>
                    <Flex gap="8" wrap>
                      {item.logTypes.map((type) => (
                        <span
                          key={type}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: `${LOG_TYPE_COLORS[type]}15`,
                            color: LOG_TYPE_COLORS[type],
                            fontSize: "10px",
                            fontWeight: 500,
                            textTransform: "uppercase",
                          }}
                        >
                          {type}
                        </span>
                      ))}
                    </Flex>
                  </Column>

                  <Flex gap="8" vertical="center">
                    <Text
                      variant="heading-strong-m"
                      onBackground="neutral-strong"
                      style={{ minWidth: "50px", textAlign: "right" }}
                    >
                      {item.count}
                    </Text>
                  </Flex>
                </Flex>
              </div>
            ))}
          </Column>
        )}
      </div>
    </Column>
  );
}
