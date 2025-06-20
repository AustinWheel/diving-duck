"use client";

import { Column, Heading, Text } from '@once-ui-system/core';

export default function SettingsPage() {
  return (
    <Column fillWidth padding="32" gap="32">
      <Column gap="8">
        <Heading variant="display-strong-l">Settings</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Configure your project and alert settings
        </Text>
      </Column>
      
      <div
        style={{
          padding: "48px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <Text variant="body-default-m" onBackground="neutral-weak">
          Settings configuration coming soon...
        </Text>
      </div>
    </Column>
  );
}