"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flex, Text, Button, Card, Column, Spinner } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setInviteId(id);
      loadInvite(id);
      
      // Clear the pending invite from sessionStorage now that we're on the invite page
      const pendingInvite = sessionStorage.getItem("pendingInvite");
      if (pendingInvite === id) {
        sessionStorage.removeItem("pendingInvite");
      }
    } else {
      setError("Invalid invite link");
    }
  }, [searchParams]);


  const loadInvite = async (id: string) => {
    setLoadingInvite(true);
    try {
      // Use API to load invite and project details
      const response = await fetch(`/api/v1/invites/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Invite not found");
        } else {
          setError("Failed to load invite");
        }
        setLoadingInvite(false);
        return;
      }

      const data = await response.json();
      
      if (data.invite.status !== "pending") {
        setError("This invite has already been used");
        setLoadingInvite(false);
        return;
      }

      setInvite(data.invite);
      setProject(data.project);
    } catch (error) {
      console.error("Error loading invite:", error);
      setError("Failed to load invite");
    } finally {
      setLoadingInvite(false);
    }
  };

  const acceptInvite = async () => {
    if (!user || !inviteId || !invite) return;

    setIsProcessing(true);
    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Accept invite via API
      const response = await fetch(`/api/v1/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept invite');
      }

      // Clear pending invite from session
      sessionStorage.removeItem("pendingInvite");

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error accepting invite:", error);
      setError(error instanceof Error ? error.message : "Failed to accept invite");
      
      // If already a member, redirect after showing message
      if (error instanceof Error && error.message.includes("already a member")) {
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || loadingInvite || !inviteId) {
    return (
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
    );
  }

  if (error) {
    return (
      <Flex
        fillWidth
        fillHeight
        center
        style={{ 
          minHeight: "100vh",
          background: "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
        }}
      >
        <div
          style={{
            padding: "48px",
            maxWidth: "480px",
            textAlign: "center",
            backdropFilter: "blur(20px)",
            backgroundColor: "rgba(20, 20, 20, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Column gap="24">
            <Text variant="heading-strong-l" onBackground="danger-medium">
              {error}
            </Text>
            <Button onClick={() => router.push("/")} variant="secondary">
              Go to Home
            </Button>
          </Column>
        </div>
      </Flex>
    );
  }

  // Show invite details even if user is not logged in
  if (!invite || !project) {
    return null;
  }

  // If user is not logged in, show the invite with a sign in prompt
  if (!user) {
    return (
      <Flex
        fillWidth
        fillHeight
        center
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
        }}
      >
        <div
          style={{
            padding: "48px",
            maxWidth: "480px",
            width: "100%",
            backdropFilter: "blur(20px)",
            backgroundColor: "rgba(20, 20, 20, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Column gap="32">
            <Column gap="12" style={{ textAlign: "center" }}>
              <Text variant="heading-strong-xl" onBackground="neutral-strong">
                Join {project.displayName}
              </Text>
              <Text variant="body-default-l" onBackground="neutral-weak">
                You've been invited to collaborate on this project
              </Text>
            </Column>

            <div
              style={{
                padding: "24px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                textAlign: "center",
              }}
            >
              <Text variant="body-default-m" onBackground="neutral-weak">
                Invited to: <strong>{invite.email}</strong>
              </Text>
            </div>

            <Column gap="12">
              <Text variant="body-default-m" onBackground="neutral-weak" style={{ textAlign: "center" }}>
                Sign in or create an account to accept this invitation
              </Text>
              <Button
                onClick={() => {
                  sessionStorage.setItem("pendingInvite", inviteId);
                  router.push("/auth/signin");
                }}
                variant="primary"
                size="l"
                fillWidth
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                }}
              >
                Sign In to Continue
              </Button>
            </Column>
          </Column>
        </div>
      </Flex>
    );
  }

  return (
    <Flex
      fillWidth
      fillHeight
      center
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
      }}
    >
      <div
        style={{
          padding: "48px",
          maxWidth: "480px",
          width: "100%",
          backdropFilter: "blur(20px)",
          backgroundColor: "rgba(20, 20, 20, 0.8)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Column gap="32">
          <Column gap="12" style={{ textAlign: "center" }}>
            <Text variant="heading-strong-xl" onBackground="neutral-strong">
              Join {project.displayName}
            </Text>
            <Text variant="body-default-l" onBackground="neutral-weak">
              You've been invited to collaborate on this project
            </Text>
          </Column>

          <div
            style={{
              padding: "24px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              textAlign: "center",
            }}
          >
            <Text variant="body-default-m" onBackground="neutral-weak">
              Invited to: <strong>{invite.email}</strong>
            </Text>
          </div>

          {user.email !== invite.email && (
            <Column gap="12">
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(255, 155, 0, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 155, 0, 0.3)",
                  textAlign: "center",
                }}
              >
                <Text variant="body-default-s" onBackground="warning-medium">
                  Note: You're signed in as {user.email}, but this invite is for {invite.email}
                </Text>
              </div>
              <Button
                onClick={async () => {
                  // Store invite ID before signing out
                  sessionStorage.setItem("pendingInvite", inviteId);
                  try {
                    const { signOut } = await import("@/lib/auth");
                    await signOut();
                    // Redirect to signin page after signout
                    router.push("/auth/signin");
                  } catch (error) {
                    console.error("Error signing out:", error);
                  }
                }}
                variant="ghost"
                size="s"
                fillWidth
                style={{ color: "var(--neutral-on-background-weak)" }}
              >
                Sign out and use a different account
              </Button>
            </Column>
          )}

          <Flex gap="12" fillWidth>
            <Button
              onClick={acceptInvite}
              disabled={isProcessing}
              variant="primary"
              size="l"
              fillWidth
              style={{
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
              }}
            >
              {isProcessing ? "Accepting..." : "Accept Invite"}
            </Button>
            <Button
              onClick={() => {
                // Clear pending invite when declining
                sessionStorage.removeItem("pendingInvite");
                router.push("/dashboard");
              }}
              disabled={isProcessing}
              variant="secondary"
              size="l"
              fillWidth
            >
              Decline
            </Button>
          </Flex>
        </Column>
      </div>
    </Flex>
  );
}