"use client";

import { useState, useEffect } from "react";
import {
  Column,
  Heading,
  Text,
  Flex,
  Button,
  Icon,
  Spinner,
  Input,
  Avatar,
  Badge,
} from "@once-ui-system/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { format } from "date-fns";
import { useLimitError } from "@/hooks/useLimitError";

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "owner" | "admin" | "member";
  joinedAt: any;
}

interface Invite {
  id: string;
  email: string;
  status: string;
  invitedBy: string;
  sentAt: any;
  createdAt: any;
}

export default function TeamPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const { handleApiError, LimitErrorModal } = useLimitError();
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch team members
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ["team-members", currentProjectId],
    queryFn: async () => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/v1/team/members?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }

      return response.json();
    },
    enabled: !!currentProjectId,
  });

  // Fetch invites sent by team
  const { data: invitesData, isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invites", currentProjectId],
    queryFn: async () => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/v1/invites/list?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invites");
      }

      return response.json();
    },
    enabled: !!currentProjectId,
  });

  // Fetch invites received by user
  const { data: myInvitesData, isLoading: loadingMyInvites } = useQuery({
    queryKey: ["my-invites"],
    queryFn: async () => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch("/api/v1/invites/my-invites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch my invites");
      }

      return response.json();
    },
  });

  // Send invites mutation
  const sendInvitesMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch("/api/v1/invites/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          emails,
        }),
      });

      if (!response.ok) {
        const wasLimitError = await handleApiError(response);
        if (!wasLimitError) {
          const data = await response.json();
          throw new Error(data.error || "Failed to send invites");
        }
        throw new Error("Limit reached"); // This will prevent onSuccess from running
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team-invites", currentProjectId] });
      setInviteSuccess(`Successfully sent ${data.sent} invite(s)`);
      setInviteEmails([""]);
      setShowInviteForm(false);
      setTimeout(() => setInviteSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setInviteError(error.message);
      setTimeout(() => setInviteError(""), 5000);
    },
  });

  const handleInviteEmailChange = (index: number, email: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = email;
    setInviteEmails(newEmails);

    // Add new input if last one is filled
    if (index === inviteEmails.length - 1 && email) {
      setInviteEmails([...newEmails, ""]);
    }
  };

  // Accept invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/v1/invites/${inviteId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invite");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setInviteSuccess("Invite accepted successfully!");
      setTimeout(() => setInviteSuccess(""), 3000);

      // Switch to the new project
      if (data.projectId) {
        window.location.href = `/dashboard?projectId=${data.projectId}`;
      }
    },
    onError: (error: Error) => {
      setInviteError(error.message);
      setTimeout(() => setInviteError(""), 5000);
    },
  });

  // Decline invite mutation
  const declineInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/v1/invites/${inviteId}/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to decline invite");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      setInviteSuccess("Invite declined");
      setTimeout(() => setInviteSuccess(""), 3000);
    },
    onError: (error: Error) => {
      setInviteError(error.message);
      setTimeout(() => setInviteError(""), 5000);
    },
  });

  const handleSendInvites = () => {
    const validEmails = inviteEmails.filter((email) => email && email.includes("@"));
    if (validEmails.length === 0) {
      setInviteError("Please enter at least one valid email address");
      return;
    }

    sendInvitesMutation.mutate(validEmails);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      // Handle different timestamp formats
      let date;
      if (timestamp.toDate) {
        // Firestore timestamp
        date = timestamp.toDate();
      } else if (timestamp._seconds) {
        // Serialized Firestore timestamp
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === "string") {
        // ISO string
        date = new Date(timestamp);
      } else {
        // Already a Date object or milliseconds
        date = new Date(timestamp);
      }

      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error, timestamp);
      return "Unknown";
    }
  };

  if (projectsLoading || loadingMembers || loadingInvites || loadingMyInvites) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  const members = membersData?.members || [];
  const invites = invitesData?.invites || [];
  const myInvites = myInvitesData?.invites || [];

  return (
    <Column fillWidth padding={isMobile ? "16" : "32"} gap={isMobile ? "24" : "32"}>
      <Flex fillWidth horizontal="space-between" vertical="center" gap="16" wrap>
        <Column gap="8" style={{ flex: 1, minWidth: "200px" }}>
          <Heading variant="display-strong-l">Team</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Manage team members and invitations
          </Text>
        </Column>
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          variant="primary"
          size="m"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="userPlus" size="s" />
          {!isMobile && <span>Invite Members</span>}
        </Button>
      </Flex>

      {/* Success/Error Messages */}
      {inviteSuccess && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "8px",
            color: "#22c55e",
          }}
        >
          {inviteSuccess}
        </div>
      )}

      {inviteError && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
          }}
        >
          {inviteError}
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div
          style={{
            padding: "24px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
          }}
        >
          <Column gap="16">
            <Text variant="heading-strong-m">Invite Team Members</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Enter email addresses to send invitations
            </Text>

            <Column gap="8">
              {inviteEmails.map((email, index) => (
                <Input
                  key={index}
                  type="email"
                  value={email}
                  onChange={(e) => handleInviteEmailChange(index, e.target.value)}
                  placeholder="email@example.com"
                  size="m"
                />
              ))}
            </Column>

            <Flex gap="12">
              <Button
                onClick={handleSendInvites}
                variant="primary"
                size="m"
                disabled={sendInvitesMutation.isPending}
              >
                {sendInvitesMutation.isPending ? <Spinner size="s" /> : "Send Invites"}
              </Button>
              <Button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmails([""]);
                }}
                variant="ghost"
                size="m"
              >
                Cancel
              </Button>
            </Flex>
          </Column>
        </div>
      )}

      {/* Team Members Table */}
      <Column gap="16">
        <Text variant="heading-strong-m">Current Members ({members.length})</Text>
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {members.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <Text variant="body-default-m" onBackground="neutral-weak">
                No team members yet
              </Text>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Member
                    </Text>
                  </th>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Role
                    </Text>
                  </th>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Joined
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member: TeamMember, index: number) => (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom:
                        index < members.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <Flex gap="12" vertical="center">
                        <Avatar
                          src={member.photoURL}
                          fallback={member.displayName.charAt(0).toUpperCase()}
                          size="s"
                        />
                        <Column gap="2" style={{ minWidth: 0, flex: 1 }}>
                          <Text variant="body-default-m" onBackground="neutral-strong">
                            {member.displayName}
                          </Text>
                          <Text
                            variant="body-default-xs"
                            onBackground="neutral-weak"
                            style={{
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: isMobile ? "120px" : "200px",
                            }}
                          >
                            {member.email}
                          </Text>
                        </Column>
                      </Flex>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {isMobile ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            backgroundColor:
                              member.role === "owner"
                                ? "rgba(239, 68, 68, 0.1)"
                                : member.role === "admin"
                                  ? "rgba(245, 158, 11, 0.1)"
                                  : "rgba(156, 163, 175, 0.1)",
                            color:
                              member.role === "owner"
                                ? "#ef4444"
                                : member.role === "admin"
                                  ? "#f59e0b"
                                  : "#9ca3af",
                          }}
                        >
                          {member.role}
                        </span>
                      ) : (
                        <Badge
                          variant={
                            member.role === "owner"
                              ? "danger"
                              : member.role === "admin"
                                ? "warning"
                                : "neutral"
                          }
                          size="s"
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <Text variant="body-default-m" onBackground="neutral-weak">
                        {formatDate(member.joinedAt)}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Column>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Column gap="16">
          <Text variant="heading-strong-m">Pending Invites ({invites.length})</Text>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Email
                    </Text>
                  </th>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Invited By
                    </Text>
                  </th>
                  <th style={{ padding: "12px", textAlign: "left" }}>
                    <Text variant="body-strong-s" onBackground="neutral-weak">
                      Sent
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite: Invite, index: number) => (
                  <tr
                    key={invite.id}
                    style={{
                      borderBottom:
                        index < invites.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <Text
                        variant="body-default-m"
                        onBackground="neutral-strong"
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: isMobile ? "150px" : "250px",
                        }}
                      >
                        {invite.email}
                      </Text>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <Text variant="body-default-m" onBackground="neutral-weak">
                        {invite.invitedBy}
                      </Text>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <Text variant="body-default-m" onBackground="neutral-weak">
                        {formatDate(invite.sentAt)}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Column>
      )}

      {/* Invites Received by User */}
      {myInvites.length > 0 && (
        <Column gap="16">
          <Text variant="heading-strong-m">Your Pending Invites ({myInvites.length})</Text>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Column gap="0">
              {myInvites.map((invite: any, index: number) => (
                <div
                  key={invite.id}
                  style={{
                    padding: "16px",
                    borderBottom:
                      index < myInvites.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                  }}
                >
                  <Flex fillWidth horizontal="space-between" vertical="center" gap="16" wrap>
                    <Column gap="4" style={{ flex: 1, minWidth: "200px" }}>
                      <Text variant="body-strong-m" onBackground="neutral-strong">
                        {invite.projectName}
                      </Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        Invited by {invite.invitedBy} • {formatDate(invite.sentAt)}
                      </Text>
                    </Column>
                    <Flex gap="8">
                      <Button
                        onClick={() => acceptInviteMutation.mutate(invite.id)}
                        variant="primary"
                        size="s"
                        disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                      >
                        {acceptInviteMutation.isPending ? <Spinner size="xs" /> : "Accept"}
                      </Button>
                      <Button
                        onClick={() => declineInviteMutation.mutate(invite.id)}
                        variant="ghost"
                        size="s"
                        disabled={acceptInviteMutation.isPending || declineInviteMutation.isPending}
                      >
                        {declineInviteMutation.isPending ? <Spinner size="xs" /> : "Decline"}
                      </Button>
                    </Flex>
                  </Flex>
                </div>
              ))}
            </Column>
          </div>
        </Column>
      )}
      
      {/* Limit Error Modal */}
      {LimitErrorModal}
    </Column>
  );
}
