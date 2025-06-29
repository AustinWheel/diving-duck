"use client";

import React from "react";
import { Button } from "@once-ui-system/core";

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
  const [showDropdown, setShowDropdown] = React.useState(false);

  const selectedOption =
    TIME_RANGE_OPTIONS.find((opt) => opt.value === value) || TIME_RANGE_OPTIONS[0];

  return (
    <div style={{ position: "relative" }}>
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="secondary"
        size="m"
        suffixIcon="chevronDown"
        style={{ minWidth: "140px" }}
      >
        {selectedOption.label}
      </Button>

      {showDropdown && (
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
            minWidth: "140px",
          }}
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setShowDropdown(false);
              }}
              variant="tertiary"
              size="m"
              fillWidth
              style={{
                borderRadius: 0,
                justifyContent: "flex-start",
                backgroundColor:
                  option.value === value ? "rgba(255, 255, 255, 0.05)" : "transparent",
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
