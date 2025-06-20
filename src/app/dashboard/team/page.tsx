"use client";

import { Column, Heading, Text } from '@once-ui-system/core';

export default function TeamPage() {
  return (
    <Column fillWidth padding="32" gap="32">
      <Column gap="8">
        <Heading variant="display-strong-l">Team</Heading>
        <Text variant="body-default-l" onBackground="neutral-weak">
          Manage team members and invitations
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
          Team management coming soon...
        </Text>
      </div>
    </Column>
  );
}