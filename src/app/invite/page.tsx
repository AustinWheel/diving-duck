import { Suspense } from 'react';
import InvitePageClient from './invite-client';
import { Flex, Spinner } from "@once-ui-system/core";

export default function InvitePage() {
  return (
    <Suspense 
      fallback={
        <Flex
          fillWidth
          fillHeight
          center
          style={{ 
            minHeight: "100vh",
            background: "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
          }}
        >
          <Spinner size="l" />
        </Flex>
      }
    >
      <InvitePageClient />
    </Suspense>
  );
}