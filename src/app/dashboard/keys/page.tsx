"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Column,
  Heading,
  Text,
  Button,
  Flex,
  Icon,
  Spinner,
  Input,
  Row,
} from "@once-ui-system/core";
import { getAuth } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { FiCopy, FiRefreshCw, FiTrash2, FiEye, FiEyeOff } from "react-icons/fi";
import { useLimitError } from "@/hooks/useLimitError";
import { CircleCheck, Circle, ChevronsUpDown } from "lucide-react";
import { Dropdown, ConfigProvider } from "antd";
import type { MenuProps } from "antd";

interface ApiKey {
  id: string;
  name: string;
  type: "test" | "prod";
  createdAt: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  maskedKey: string;
  domain?: string;
}

export default function APIKeysPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const { handleApiError, LimitErrorModal } = useLimitError();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"test" | "prod">("test");
  const [domain, setDomain] = useState("");
  const [createdKey, setCreatedKey] = useState<{ key: string; id: string } | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch API keys using TanStack Query
  const {
    data: keys = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["api-keys", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) throw new Error("No project selected");

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("No auth token available");

      const response = await fetch(`/api/v1/keys?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch keys");
      }

      const data = await response.json();
      return data.keys || [];
    },
    enabled: !!currentProjectId,
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadKeys = async () => {
    refetch();
  };

  // Helper function for API calls (kept for mutations)
  const makeApiCall = async (url: string, options: RequestInit) => {
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("No auth token available");

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API request failed");
    }

    return response.json();
  };

  const createKey = async () => {
    if (!newKeyName.trim()) {
      setToastMessage({ message: "Please enter a key name", type: "error" });
      return;
    }

    try {
      setCreating(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
          type: newKeyType,
          projectId: currentProjectId,
          domain: newKeyType === "prod" && domain.trim() ? domain.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const wasLimitError = await handleApiError(response);
        if (!wasLimitError) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create key");
        }
        return;
      }

      const data = await response.json();
      setCreatedKey(data.key);
      setNewKeyName("");
      setDomain("");
      loadKeys();
    } catch (error) {
      console.error("Error creating key:", error);
      setToastMessage({ message: "Failed to create API key", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this key? This action cannot be undone.")) {
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/v1/keys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete key");
      }

      setToastMessage({ message: "API key deleted successfully", type: "success" });
      loadKeys();
    } catch (error) {
      console.error("Error deleting key:", error);
      setToastMessage({ message: "Failed to delete API key", type: "error" });
    }
  };

  const regenerateKey = async (keyId: string) => {
    if (
      !confirm("Are you sure you want to regenerate this key? The old key will be deactivated.")
    ) {
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/v1/keys/${keyId}/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate key");
      }

      const data = await response.json();
      setCreatedKey(data.key);
      loadKeys();
    } catch (error) {
      console.error("Error regenerating key:", error);
      setToastMessage({ message: "Failed to regenerate API key", type: "error" });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage({ message: "Copied to clipboard", type: "success" });
    } catch (error) {
      setToastMessage({ message: "Failed to copy to clipboard", type: "error" });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (loading || projectsLoading) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  return (
    <Column
      fillWidth
      padding="16"
      gap="24"
      style={{ "@media (minWidth: 768px)": { padding: "32px", gap: "32px" } }}
    >
      <Flex fillWidth horizontal="space-between" vertical="center" wrap gap="16">
        <Column gap="8" style={{ flex: 1, minWidth: "200px" }}>
          <Heading variant="display-strong-l">API Keys</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Manage your test and production API keys
          </Text>
        </Column>
        <Button
          onClick={() => {
            setShowCreateModal(true);
            setNewKeyName("");
            setNewKeyType("test");
            setDomain("");
          }}
          variant="primary"
          size="m"
          style={{ whiteSpace: "nowrap" }}
        >
          <Icon name="plus" size="s" />
          <span style={{ display: "none", "@media (minWidth: 640px)": { display: "inline" } }}>
            Create New Key
          </span>
          <span style={{ display: "inline", "@media (minWidth: 640px)": { display: "none" } }}>
            New
          </span>
        </Button>
      </Flex>

      {keys.length === 0 ? (
        <div
          style={{
            padding: "48px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Icon name="key" size="l" color="var(--neutral-on-background-weak)" />
          <Text variant="body-default-m" onBackground="neutral-weak" padding="16">
            No API keys found
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Create your first API key to start using the service
          </Text>
        </div>
      ) : (
        <Column gap="16">
          {keys.map((key) => (
            <div
              key={key.id}
              style={{
                padding: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                "@media (minWidth: 768px)": { padding: "24px" },
              }}
            >
              <Column gap="16">
                <Flex fillWidth horizontal="space-between" vertical="start" wrap gap="12">
                  <Column gap="8" style={{ flex: 1, minWidth: "200px" }}>
                    <Flex gap="12" vertical="center" wrap>
                      <Text variant="heading-strong-m" style={{ wordBreak: "break-word" }}>
                        {key.name}
                      </Text>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor:
                            key.type === "prod"
                              ? "rgba(34, 197, 94, 0.1)"
                              : "rgba(251, 146, 60, 0.1)",
                          color: key.type === "prod" ? "#22c55e" : "#fb923c",
                          fontSize: "12px",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {key.type.toUpperCase()}
                      </span>
                      {!key.isActive && (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            fontSize: "12px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          INACTIVE
                        </span>
                      )}
                    </Flex>
                    <Text
                      variant="body-default-s"
                      onBackground="neutral-weak"
                      style={{ wordBreak: "break-all" }}
                    >
                      {key.maskedKey}
                    </Text>
                  </Column>
                  <Flex gap="8" style={{ flexShrink: 0 }}>
                    <Button
                      onClick={() => copyToClipboard(key.maskedKey)}
                      variant="ghost"
                      size="s"
                      title="Copy key"
                    >
                      <FiCopy />
                    </Button>
                    <Button
                      onClick={() => regenerateKey(key.id)}
                      variant="ghost"
                      size="s"
                      title="Regenerate key"
                      disabled={!key.isActive}
                    >
                      <FiRefreshCw />
                    </Button>
                    <Button
                      onClick={() => deleteKey(key.id)}
                      variant="ghost"
                      size="s"
                      title="Delete key"
                      disabled={!key.isActive}
                    >
                      <FiTrash2 />
                    </Button>
                  </Flex>
                </Flex>
                <Flex gap="16" wrap style={{ width: "100%" }}>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Created: {formatDate(key.createdAt)}
                  </Text>
                  <Text
                    variant="body-default-xs"
                    onBackground="neutral-weak"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Last used: {formatDate(key.lastUsedAt)}
                  </Text>
                  {key.expiresAt && (
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Expires: {formatDate(key.expiresAt)}
                    </Text>
                  )}
                  {key.domain && (
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Domain: {key.domain}
                    </Text>
                  )}
                </Flex>
              </Column>
            </div>
          ))}
        </Column>
      )}

      {/* Create Key Modal */}
      {(showCreateModal || createdKey) && (
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
          onClick={() => {
            if (!creating) {
              setShowCreateModal(false);
              setCreatedKey(null);
              setShowDropdown(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(40, 40, 40, 0.95)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "500px",
              width: "calc(100% - 32px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Close dropdown if clicking outside
              if (showDropdown) {
                setShowDropdown(false);
              }
            }}
          >
            {createdKey ? (
              <Column gap="24">
                <Heading variant="heading-strong-l">API Key Created</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Your new API key has been created. Make sure to copy it now as you won't be able
                  to see it again.
                </Text>
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {createdKey.key}
                </div>
                <Flex gap="12">
                  <Button
                    onClick={() => copyToClipboard(createdKey.key)}
                    variant="primary"
                    size="m"
                    fillWidth
                  >
                    <FiCopy />
                    Copy to Clipboard
                  </Button>
                  <Button
                    onClick={() => {
                      setCreatedKey(null);
                      setShowCreateModal(false);
                      setShowDropdown(false);
                    }}
                    variant="secondary"
                    size="m"
                  >
                    Done
                  </Button>
                </Flex>
              </Column>
            ) : (
              <Column gap="24">
                <Heading variant="heading-strong-l">Create New API Key</Heading>
                <Column gap="16">
                  <Column gap="8">
                    <Text variant="body-default-s" onBackground="neutral-strong">
                      Key Name
                    </Text>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production Server"
                      size="m"
                    />
                  </Column>
                  <Column gap="8">
                    <Text variant="body-default-s" onBackground="neutral-strong">
                      Key Type
                    </Text>
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
                        menu={{
                          items: [
                            {
                              key: "test",
                              label: (
                                <Row
                                  vertical="center"
                                  horizontal="space-between"
                                  fillWidth
                                  gap="12"
                                >
                                  <Column gap="2">
                                    <Text variant="body-default-m">Test Key</Text>
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      Expires in 2 hours • No rate limits
                                    </Text>
                                  </Column>
                                  {newKeyType === "test" ? (
                                    <CircleCheck
                                      size={16}
                                      style={{ color: "#4ade80", flexShrink: 0 }}
                                    />
                                  ) : (
                                    <Circle
                                      size={16}
                                      style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }}
                                    />
                                  )}
                                </Row>
                              ),
                              onClick: () => setNewKeyType("test"),
                              style: {
                                backgroundColor:
                                  newKeyType === "test"
                                    ? "rgba(255, 107, 53, 0.08)"
                                    : "transparent",
                                padding: "8px 12px",
                                minHeight: "40px",
                              },
                            },
                            {
                              key: "prod",
                              label: (
                                <Row
                                  vertical="center"
                                  horizontal="space-between"
                                  fillWidth
                                  gap="12"
                                >
                                  <Column gap="2">
                                    <Text variant="body-default-m">Production Key</Text>
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      Never expires • Rate limited
                                    </Text>
                                  </Column>
                                  {newKeyType === "prod" ? (
                                    <CircleCheck
                                      size={16}
                                      style={{ color: "#4ade80", flexShrink: 0 }}
                                    />
                                  ) : (
                                    <Circle
                                      size={16}
                                      style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }}
                                    />
                                  )}
                                </Row>
                              ),
                              onClick: () => setNewKeyType("prod"),
                              style: {
                                backgroundColor:
                                  newKeyType === "prod"
                                    ? "rgba(255, 107, 53, 0.08)"
                                    : "transparent",
                                padding: "8px 12px",
                                minHeight: "40px",
                              },
                            },
                          ],
                        }}
                        trigger={["click"]}
                        placement="bottomLeft"
                        overlayStyle={{
                          minWidth: "300px",
                          maxWidth: "400px",
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
                            width: "100%",
                            padding: "10px 12px",
                            backgroundColor: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            color: "var(--neutral-on-background-strong)",
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
                          <Icon name="shield" size="xs" />
                          <Text
                            variant="body-default-s"
                            onBackground="neutral-strong"
                            style={{ flex: 1, textAlign: "left" }}
                          >
                            {newKeyType === "test" ? "Test Key" : "Production Key"}
                          </Text>
                          <ChevronsUpDown size={14} />
                        </button>
                      </Dropdown>
                    </ConfigProvider>
                  </Column>

                  {newKeyType === "prod" && (
                    <Column gap="8">
                      <Text variant="body-default-s" onBackground="neutral-strong">
                        Allowed Domain (Optional)
                      </Text>
                      <Text
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                        style={{ marginBottom: "4px" }}
                      >
                        Restrict this key to requests from a specific domain. Leave empty to allow requests from any domain.
                      </Text>
                      <Input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="e.g., https://warden.sh"
                        size="m"
                      />
                    </Column>
                  )}
                </Column>
                <Flex gap="12">
                  <Button
                    onClick={createKey}
                    variant="primary"
                    size="m"
                    fillWidth
                    disabled={creating || !newKeyName.trim()}
                  >
                    {creating ? <Spinner size="s" /> : "Create Key"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowDropdown(false);
                    }}
                    variant="ghost"
                    size="m"
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Column>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "16px 24px",
            backgroundColor:
              toastMessage.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${toastMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            borderRadius: "8px",
            color: toastMessage.type === "success" ? "#22c55e" : "#ef4444",
            zIndex: 1001,
          }}
        >
          {toastMessage.message}
        </div>
      )}

      {/* Limit Error Modal */}
      {LimitErrorModal}
    </Column>
  );
}
