"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Flex, Text, Button, Column } from "@once-ui-system/core";
import { LogType } from "@/types/database";

interface EventActivityChartProps {
  data: Array<{
    timestamp: string;
    text: number;
    call: number;
    callText: number;
    log: number;
    warn: number;
    error: number;
    alerts: number;
    alertDetails?: Array<{
      id: string;
      createdAt: Date;
      message: string;
      eventCount: number;
    }>;
  }>;
  stepSize: number;
  onStepSizeChange: (stepSize: number) => void;
  loading?: boolean;
}

const LOG_TYPE_COLORS = {
  error: "#ef4444",
  warn: "#f59e0b",
  callText: "#3b82f6",
  call: "#6366f1",
  log: "#10b981",
  text: "#6b7280",
  alerts: "#dc2626",
};

const STEP_SIZE_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "24 hours" },
];

export default function EventActivityChart({
  data,
  stepSize,
  onStepSizeChange,
  loading = false,
}: EventActivityChartProps) {
  const [showStepDropdown, setShowStepDropdown] = React.useState(false);

  // Log chart data for debugging
  React.useEffect(() => {
    console.log("[EventActivityChart] Rendering with data:", {
      dataLength: data.length,
      firstItem: data[0],
      lastItem: data[data.length - 1],
      hasEvents: data.some(
        (d) => d.text > 0 || d.call > 0 || d.callText > 0 || d.log > 0 || d.warn > 0 || d.error > 0,
      ),
      hasAlerts: data.some((d) => d.alerts > 0),
    });
  }, [data]);

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (stepSize >= 1440) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (stepSize >= 60) {
      return `${hours}:00`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }
  };

  const formatTooltipLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => {
        return entry.name !== "alerts" ? sum + entry.value : sum;
      }, 0);

      return (
        <div
          style={{
            backgroundColor: "rgba(20, 20, 20, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <Text
            variant="body-default-s"
            onBackground="neutral-strong"
            style={{ marginBottom: "8px" }}
          >
            {formatTooltipLabel(label)}
          </Text>
          <Text
            variant="body-default-xs"
            onBackground="neutral-weak"
            style={{ marginBottom: "8px" }}
          >
            Total Events: {total}
          </Text>
          {payload
            .filter((entry: any) => entry.name !== "alerts")
            .map((entry: any) => (
              <Flex key={entry.name} gap="8" vertical="center" style={{ marginBottom: "4px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: entry.color,
                    borderRadius: "2px",
                  }}
                />
                <Text variant="body-default-xs" style={{ color: entry.color }}>
                  {entry.name}: {entry.value}
                </Text>
              </Flex>
            ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
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
          Loading chart data...
        </Text>
      </div>
    );
  }

  return (
    <Column gap="16" fillWidth>
      <Flex horizontal="space-between" vertical="center">
        <Text variant="heading-strong-l" onBackground="neutral-strong">
          Event Activity
        </Text>
        <div style={{ position: "relative" }}>
          <Button
            onClick={() => setShowStepDropdown(!showStepDropdown)}
            variant="secondary"
            size="s"
            suffixIcon="chevronDown"
          >
            Step: {STEP_SIZE_OPTIONS.find((opt) => opt.value === stepSize)?.label}
          </Button>
          {showStepDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                backgroundColor: "rgba(40, 40, 40, 0.98)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                overflow: "hidden",
                zIndex: 10,
                minWidth: "120px",
              }}
            >
              {STEP_SIZE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => {
                    onStepSizeChange(option.value);
                    setShowStepDropdown(false);
                  }}
                  variant="tertiary"
                  size="s"
                  fillWidth
                  style={{ borderRadius: 0, justifyContent: "flex-start" }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Flex>

      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
            <defs>
              {Object.entries(LOG_TYPE_COLORS).map(([type, color]) => (
                <linearGradient key={type} id={`color${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="rgba(255, 255, 255, 0.5)"
              style={{ fontSize: "12px" }}
              type="category"
              allowDataOverflow
            />
            <YAxis stroke="rgba(255, 255, 255, 0.5)" style={{ fontSize: "12px" }} />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="error"
              stackId="1"
              stroke={LOG_TYPE_COLORS.error}
              fillOpacity={1}
              fill={`url(#colorerror)`}
            />
            <Area
              type="monotone"
              dataKey="warn"
              stackId="1"
              stroke={LOG_TYPE_COLORS.warn}
              fillOpacity={1}
              fill={`url(#colorwarn)`}
            />
            <Area
              type="monotone"
              dataKey="callText"
              stackId="1"
              stroke={LOG_TYPE_COLORS.callText}
              fillOpacity={1}
              fill={`url(#colorcallText)`}
            />
            <Area
              type="monotone"
              dataKey="call"
              stackId="1"
              stroke={LOG_TYPE_COLORS.call}
              fillOpacity={1}
              fill={`url(#colorcall)`}
            />
            <Area
              type="monotone"
              dataKey="log"
              stackId="1"
              stroke={LOG_TYPE_COLORS.log}
              fillOpacity={1}
              fill={`url(#colorlog)`}
            />
            <Area
              type="monotone"
              dataKey="text"
              stackId="1"
              stroke={LOG_TYPE_COLORS.text}
              fillOpacity={1}
              fill={`url(#colortext)`}
            />

            {/* Render vertical lines for alerts */}
            {data
              .filter((item) => item.alerts > 0)
              .map((item, index) => {
                // Format the alert label with actual timestamps
                const alertLabel =
                  item.alertDetails && item.alertDetails.length > 0
                    ? `Alert at ${new Date(item.alertDetails[0].createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : `${item.alerts} alert${item.alerts > 1 ? "s" : ""}`;

                return (
                  <ReferenceLine
                    key={`alert-${index}`}
                    x={item.timestamp}
                    stroke={LOG_TYPE_COLORS.alerts}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: alertLabel,
                      position: "top",
                      fill: LOG_TYPE_COLORS.alerts,
                      fontSize: 10,
                    }}
                  />
                );
              })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Column>
  );
}
