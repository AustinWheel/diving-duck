"use client";

import React from "react";
import { Text, Icon, Row } from "@once-ui-system/core";
import { CircleCheck, Circle, ChevronsUpDown } from "lucide-react";
import { Dropdown, ConfigProvider } from "antd";
import type { MenuProps } from "antd";

interface TimeRangeSelectorProps {
  value: number; // in hours
  onChange: (hours: number) => void;
}

const TIME_RANGE_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
  { value: 336, label: "2 weeks" },
];

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const selectedOption =
    TIME_RANGE_OPTIONS.find((opt) => opt.value === value) || TIME_RANGE_OPTIONS[0];

  // Create menu items for dropdown
  const menuItems: MenuProps["items"] = TIME_RANGE_OPTIONS.map((option) => ({
    key: option.value,
    label: (
      <Row vertical="center" horizontal="space-between" fillWidth gap="12">
        <Text variant="body-default-m">{option.label}</Text>
        {option.value === value ? (
          <CircleCheck size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
        ) : (
          <Circle size={16} style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }} />
        )}
      </Row>
    ),
    onClick: () => {
      onChange(option.value);
    },
    style: {
      backgroundColor: option.value === value ? "rgba(255, 107, 53, 0.08)" : "transparent",
      padding: "4px 12px",
      minHeight: "28px",
    },
  }));

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgElevated: "rgba(20, 20, 20, 0.98)",
          colorBorder: "rgba(255, 255, 255, 0.08)",
          colorText: "rgba(255, 255, 255, 0.9)",
          colorTextSecondary: "rgba(255, 255, 255, 0.6)",
          borderRadius: 8,
          controlItemBgHover: "rgba(255, 255, 255, 0.08)",
          controlItemBgActive: "rgba(255, 107, 53, 0.08)",
          controlPaddingHorizontal: 0,
          padding: 4,
        },
      }}
    >
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["click"]}
        placement="bottomRight"
        overlayStyle={{
          minWidth: "160px",
        }}
        popupRender={(menu) => (
          <div
            style={{
              backgroundColor: "rgba(20, 20, 20, 0.98)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            {menu}
          </div>
        )}
      >
        <button
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            color: "var(--neutral-on-background-strong)",
            minWidth: "120px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <Icon name="clock" size="xs" />
          <Text variant="body-default-s" onBackground="neutral-strong" style={{ flex: 1 }}>
            {selectedOption.label}
          </Text>
          <ChevronsUpDown size={14} />
        </button>
      </Dropdown>
    </ConfigProvider>
  );
}
