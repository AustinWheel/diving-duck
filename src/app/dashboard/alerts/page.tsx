"use client";

import { useState, useEffect } from "react";
import {
  Column,
  Heading,
  Text,
  Button,
  Flex,
  Icon,
  Spinner,
  Input,
  Switch,
  NumberInput,
} from "@once-ui-system/core";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProject } from "@/contexts/ProjectContext";
import { AlertRule, MessageAlertRule, NotificationType, LogType } from "@/types/database";
import { useLimitError } from "@/hooks/useLimitError";

interface AlertConfig {
  enabled: boolean;
  phoneNumbers: string[];
  alertRules: AlertRule[];
}

export default function AlertsPage() {
  const { currentProjectId, loading: projectsLoading } = useProject();
  const { handleApiError, LimitErrorModal } = useLimitError();
  const [config, setConfig] = useState<AlertConfig>({
    enabled: false,
    phoneNumbers: [],
    alertRules: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<AlertConfig | null>(null);
  const [testingSMS, setTestingSMS] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && currentProjectId) {
        loadAlertConfig();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (originalConfig) {
      const configChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setHasChanges(configChanged);
    }
  }, [config, originalConfig]);

  const loadAlertConfig = async () => {
    try {
      setLoading(true);
      const auth = getAuth();

      if (!auth.currentUser) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.log("No auth token available");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/v1/alerts/config?projectId=${currentProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch alert configuration");
      }

      const data = await response.json();
      const alertConfig = data.alertConfig || {
        enabled: false,
        phoneNumbers: [],
        alertRules: [],
      };

      // Ensure all rules have proper structure
      if (alertConfig.alertRules) {
        alertConfig.alertRules = alertConfig.alertRules.map((rule: any) => ({
          ...rule,
          globalLimit: {
            enabled: rule.globalLimit?.enabled ?? false,
            windowMinutes: rule.globalLimit?.windowMinutes ?? 60,
            maxAlerts: rule.globalLimit?.maxAlerts ?? 10,
            logTypes: rule.globalLimit?.logTypes || undefined, // Preserve existing logTypes
          },
          messageRules: rule.messageRules || [],
          notificationType: rule.notificationType || "text",
        }));
      }

      setConfig(alertConfig);
      setOriginalConfig(alertConfig);
      setProjectName(data.projectName);
    } catch (error) {
      console.error("Error loading alert config:", error);
      setToastMessage({ message: "Failed to load alert configuration", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/v1/alerts/config?projectId=${currentProjectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertConfig: config }),
      });

      if (!response.ok) {
        const wasLimitError = await handleApiError(response);
        if (!wasLimitError) {
          const error = await response.json();
          throw new Error(error.error || "Failed to save configuration");
        }
        setSaving(false); // Make sure to stop the saving state
        return;
      }

      setOriginalConfig(config);
      setHasChanges(false);
      setToastMessage({ message: "Alert configuration saved successfully", type: "success" });
    } catch (error) {
      console.error("Error saving config:", error);
      setToastMessage({
        message: error instanceof Error ? error.message : "Failed to save configuration",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const addPhoneNumber = () => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const formattedNumber = newPhoneNumber.startsWith("+") ? newPhoneNumber : `+${newPhoneNumber}`;

    if (!phoneRegex.test(formattedNumber)) {
      setToastMessage({
        message: "Invalid phone number format. Use E.164 format (e.g., +1234567890)",
        type: "error",
      });
      return;
    }

    if (config.phoneNumbers?.includes(formattedNumber)) {
      setToastMessage({ message: "Phone number already exists", type: "error" });
      return;
    }

    setConfig({
      ...config,
      phoneNumbers: [...(config.phoneNumbers || []), formattedNumber],
    });
    setNewPhoneNumber("");
  };

  const removePhoneNumber = (index: number) => {
    setConfig({
      ...config,
      phoneNumbers: (config.phoneNumbers || []).filter((_, i) => i !== index),
    });
  };

  const sendTestAlert = async () => {
    try {
      setTestingSMS(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`/api/v1/alerts/test?projectId=${currentProjectId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const wasLimitError = await handleApiError(response);
        if (!wasLimitError) {
          throw new Error(data.error || "Failed to send test alert");
        }
        return;
      }

      const successCount = data.results.filter((r: any) => r.success).length;
      const totalCount = data.results.length;

      if (successCount === totalCount) {
        setToastMessage({
          message: `Test alert sent successfully to ${successCount} number${successCount > 1 ? "s" : ""}`,
          type: "success",
        });
      } else if (successCount > 0) {
        setToastMessage({
          message: `Test alert sent to ${successCount} of ${totalCount} numbers`,
          type: "error",
        });
      } else {
        setToastMessage({
          message: "Failed to send test alert to any numbers",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error sending test alert:", error);
      setToastMessage({
        message: error instanceof Error ? error.message : "Failed to send test alert",
        type: "error",
      });
    } finally {
      setTestingSMS(false);
    }
  };

  const addAlertRule = () => {
    const newRule: AlertRule = {
      globalLimit: {
        enabled: true,
        windowMinutes: 60,
        maxAlerts: 10,
      },
      messageRules: [],
      notificationType: "text",
    };
    setConfig({
      ...config,
      alertRules: [...(config.alertRules || []), newRule],
    });
    setEditingRuleIndex((config.alertRules || []).length);
  };

  const updateAlertRule = (index: number, rule: AlertRule) => {
    const newRules = [...(config.alertRules || [])];
    newRules[index] = rule;
    setConfig({
      ...config,
      alertRules: newRules,
    });
  };

  const removeAlertRule = (index: number) => {
    setConfig({
      ...config,
      alertRules: (config.alertRules || []).filter((_, i) => i !== index),
    });
    if (editingRuleIndex === index) {
      setEditingRuleIndex(null);
    }
  };

  const addMessageRule = (ruleIndex: number) => {
    const newMessageRule: MessageAlertRule = {
      message: "",
      windowMinutes: 30,
      maxAlerts: 5,
    };
    const newRules = [...(config.alertRules || [])];
    if (!newRules[ruleIndex].messageRules) {
      newRules[ruleIndex].messageRules = [];
    }
    newRules[ruleIndex].messageRules.push(newMessageRule);
    setConfig({
      ...config,
      alertRules: newRules,
    });
  };

  const updateMessageRule = (
    ruleIndex: number,
    messageIndex: number,
    messageRule: MessageAlertRule,
  ) => {
    const newRules = [...(config.alertRules || [])];
    newRules[ruleIndex].messageRules[messageIndex] = messageRule;
    setConfig({
      ...config,
      alertRules: newRules,
    });
  };

  const removeMessageRule = (ruleIndex: number, messageIndex: number) => {
    const newRules = [...(config.alertRules || [])];
    newRules[ruleIndex].messageRules.splice(messageIndex, 1);
    setConfig({
      ...config,
      alertRules: newRules,
    });
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
          <Heading variant="display-strong-l">Alert Configuration</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Configure alerts for {projectName || "your project"}
          </Text>
        </Column>
        <Flex gap="12">
          {hasChanges && (
            <Button
              onClick={() => {
                setConfig(originalConfig!);
                setHasChanges(false);
              }}
              variant="ghost"
              size="m"
            >
              <Flex gap="8" vertical="center">
                <Icon name="x" size="s" />
                <span>Cancel</span>
              </Flex>
            </Button>
          )}
          <Button onClick={saveConfig} variant="primary" size="m" disabled={saving || !hasChanges}>
            {saving ? (
              <Spinner size="s" />
            ) : (
              <Flex gap="8" vertical="center">
                <Icon name="save" size="s" />
                <span>Save Changes</span>
              </Flex>
            )}
          </Button>
        </Flex>
      </Flex>

      {/* Alert Status Toggle */}
      <div
        style={{
          padding: "24px",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
        }}
      >
        <Flex fillWidth horizontal="space-between" vertical="center">
          <Column gap="8">
            <Flex gap="12" vertical="center">
              <Icon name="alert" size="m" />
              <Heading variant="heading-strong-m">Alert Status</Heading>
            </Flex>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {config.enabled ? "Alerts are currently active" : "Alerts are currently disabled"}
            </Text>
          </Column>
          <Switch
            isChecked={config.enabled ? true : false}
            onToggle={() => setConfig({ ...config, enabled: !config.enabled })}
            size="l"
          />
        </Flex>
      </div>

      {/* Phone Numbers */}
      <Column gap="16">
        <Flex fillWidth horizontal="space-between" vertical="center">
          <Flex gap="12" vertical="center">
            <Icon name="phone" size="m" />
            <Heading variant="heading-strong-m">Phone Numbers</Heading>
          </Flex>
          {config.phoneNumbers.length > 0 && config.enabled && (
            <Button onClick={sendTestAlert} variant="secondary" size="s" disabled={testingSMS}>
              {testingSMS ? (
                <Spinner size="s" />
              ) : (
                <Flex gap="8" vertical="center">
                  <Icon name="message" size="s" />
                  <span>Send Test Alert</span>
                </Flex>
              )}
            </Button>
          )}
        </Flex>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Add phone numbers to receive alerts. Use E.164 format (e.g., +1234567890)
        </Text>

        <Flex gap="12" vertical="center">
          <Input
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            placeholder="+1234567890"
            size="m"
            style={{ flex: 1 }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addPhoneNumber();
              }
            }}
          />
          <Button
            onClick={addPhoneNumber}
            variant="secondary"
            size="m"
            disabled={!newPhoneNumber.trim()}
          >
            <Flex gap="8" vertical="center">
              <Icon name="plus" size="s" />
              <span>Add</span>
            </Flex>
          </Button>
        </Flex>

        {config.phoneNumbers.length === 0 ? (
          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <Text variant="body-default-s" onBackground="neutral-weak">
              No phone numbers configured
            </Text>
          </div>
        ) : (
          <Column gap="8">
            {config.phoneNumbers.map((phone, index) => (
              <Flex
                key={index}
                fillWidth
                horizontal="space-between"
                vertical="center"
                style={{
                  padding: "12px 16px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                }}
              >
                <Text variant="body-default-m">{phone}</Text>
                <Button onClick={() => removePhoneNumber(index)} variant="ghost" size="s">
                  <Icon name="trash" size="s" />
                </Button>
              </Flex>
            ))}
          </Column>
        )}
      </Column>

      {/* Alert Rules */}
      <Column gap="16">
        <Flex fillWidth horizontal="space-between" vertical="center">
          <Flex gap="12" vertical="center">
            <Icon name="message" size="m" />
            <Heading variant="heading-strong-m">Alert Rules</Heading>
          </Flex>
          <Button onClick={addAlertRule} variant="secondary" size="m">
            <Flex gap="8" vertical="center">
              <Icon name="plus" size="s" />
              <span>Add Rule</span>
            </Flex>
          </Button>
        </Flex>
        <Text variant="body-default-m" onBackground="neutral-weak">
          Configure event thresholds that trigger alerts. When the specified number of events occur
          within the time window, an alert will be sent.
        </Text>

        {!config.alertRules || config.alertRules.length === 0 ? (
          <div
            style={{
              padding: "32px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <Text variant="body-default-s" onBackground="neutral-weak">
              No alert rules configured. Add a rule to start receiving alerts.
            </Text>
          </div>
        ) : (
          <Column gap="16">
            {config.alertRules.map((rule, ruleIndex) => (
              <div
                key={ruleIndex}
                style={{
                  padding: "20px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                }}
              >
                <Column gap="16">
                  <Flex fillWidth horizontal="space-between" vertical="start">
                    <Column gap="8" style={{ flex: 1 }}>
                      <Flex gap="12" vertical="center">
                        <Text variant="heading-strong-s">Rule {ruleIndex + 1}</Text>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              rule.notificationType === "call"
                                ? "rgba(251, 146, 60, 0.1)"
                                : "rgba(59, 130, 246, 0.1)",
                            color: rule.notificationType === "call" ? "#fb923c" : "#3b82f6",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          {rule.notificationType.toUpperCase()}
                        </span>
                      </Flex>
                    </Column>
                    <Flex gap="8">
                      <Button
                        onClick={() =>
                          setEditingRuleIndex(editingRuleIndex === ruleIndex ? null : ruleIndex)
                        }
                        variant="ghost"
                        size="s"
                      >
                        <Icon name="edit" size="s" />
                      </Button>
                      <Button onClick={() => removeAlertRule(ruleIndex)} variant="ghost" size="s">
                        <Icon name="trash" size="s" />
                      </Button>
                    </Flex>
                  </Flex>

                  {editingRuleIndex === ruleIndex ? (
                    <Column gap="16">
                      {/* Notification Type */}
                      <Column gap="8">
                        <Text variant="body-default-s" onBackground="neutral-strong">
                          Notification Type
                        </Text>
                        <Flex gap="12">
                          <Button
                            onClick={() =>
                              updateAlertRule(ruleIndex, { ...rule, notificationType: "text" })
                            }
                            variant="primary"
                            size="s"
                            disabled
                          >
                            Text Message
                          </Button>
                        </Flex>
                      </Column>

                      {/* Global Limit */}
                      <Column gap="12">
                        <Flex gap="12" vertical="center">
                          <Switch
                            isChecked={rule.globalLimit?.enabled ?? false}
                            onToggle={() =>
                              updateAlertRule(ruleIndex, {
                                ...rule,
                                globalLimit: {
                                  ...rule.globalLimit,
                                  enabled: !(rule.globalLimit?.enabled ?? false),
                                },
                              })
                            }
                          />
                          <Column gap="4">
                            <Text variant="body-default-s" onBackground="neutral-strong">
                              Global Event Threshold
                            </Text>
                            <Text variant="body-default-xs" onBackground="neutral-weak">
                              Applies to all events in this rule, regardless of message content
                            </Text>
                          </Column>
                        </Flex>
                        {rule.globalLimit?.enabled && (
                          <Column gap="12">
                            <Flex gap="12" vertical="center" wrap>
                              <Text variant="body-default-s" onBackground="neutral-weak">
                                Trigger alert after
                              </Text>
                              <NumberInput
                                id="event-count"
                                label="Event Count"
                                value={rule.globalLimit?.maxAlerts || 10}
                                onChange={(value) =>
                                  updateAlertRule(ruleIndex, {
                                    ...rule,
                                    globalLimit: { ...rule.globalLimit, maxAlerts: value || 1 },
                                  })
                                }
                                min={1}
                                max={1000}
                                height="s"
                                style={{ width: "180px" }}
                              />
                              <Text variant="body-default-s" onBackground="neutral-weak">
                                events within
                              </Text>
                              <NumberInput
                                id="window-minutes"
                                label="Window Minutes"
                                value={rule.globalLimit?.windowMinutes || 60}
                                onChange={(value) =>
                                  updateAlertRule(ruleIndex, {
                                    ...rule,
                                    globalLimit: { ...rule.globalLimit, windowMinutes: value || 1 },
                                  })
                                }
                                min={1}
                                max={1440}
                                height="s"
                                style={{ width: "180px" }}
                              />
                              <Text variant="body-default-s" onBackground="neutral-weak">
                                minutes
                              </Text>
                            </Flex>
                            
                            {/* Log Type Filter */}
                            <Column gap="8">
                              <Text variant="body-default-xs" onBackground="neutral-weak">
                                Filter by log types (leave empty for all)
                              </Text>
                              <Flex gap="8" wrap>
                                {(["text", "error", "warn", "log" ] as LogType[]).map((logType) => {
                                  const isSelected = rule.globalLimit?.logTypes?.includes(logType) ?? false;
                                  const color = {
                                    error: "#ef4444",
                                    warn: "#f59e0b",
                                    callText: "#3b82f6",
                                    call: "#6366f1",
                                    log: "#10b981",
                                    text: "#6b7280",
                                  }[logType];

                                  return (
                                    <Button
                                      key={logType}
                                      onClick={() => {
                                        const currentTypes = rule.globalLimit?.logTypes || [];
                                        const newTypes = isSelected
                                          ? currentTypes.filter((t) => t !== logType)
                                          : [...currentTypes, logType];
                                        updateAlertRule(ruleIndex, {
                                          ...rule,
                                          globalLimit: { ...rule.globalLimit, logTypes: newTypes.length > 0 ? newTypes : undefined },
                                        });
                                      }}
                                      variant="tertiary"
                                      size="s"
                                      style={{
                                        backgroundColor: isSelected ? `${color}20` : "rgba(255, 255, 255, 0.05)",
                                        border: `1px solid ${isSelected ? color : "rgba(255, 255, 255, 0.1)"}`,
                                        color: isSelected ? color : "var(--neutral-on-background-weak)",
                                        fontWeight: isSelected ? 600 : 400,
                                        textTransform: "uppercase",
                                        fontSize: "11px",
                                        padding: "4px 12px",
                                        transition: "all 0.2s ease",
                                      }}
                                    >
                                      {logType}
                                    </Button>
                                  );
                                })}
                              </Flex>
                            </Column>
                          </Column>
                        )}
                      </Column>

                      {/* Message Rules */}
                      <Column gap="12">
                        <Flex fillWidth horizontal="space-between" vertical="center">
                          <Text variant="body-default-s" onBackground="neutral-strong">
                            Message-Specific Rules
                          </Text>
                          <Button
                            onClick={() => addMessageRule(ruleIndex)}
                            variant="ghost"
                            size="s"
                          >
                            <Flex gap="8" vertical="center">
                              <Icon name="plus" size="s" />
                              <span>Add Message Rule</span>
                            </Flex>
                          </Button>
                        </Flex>

                        {rule.messageRules && rule.messageRules.length > 0 && (
                          <Column gap="12">
                            {(rule.messageRules || []).map((messageRule, messageIndex) => (
                              <div
                                key={messageIndex}
                                style={{
                                  padding: "12px",
                                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                                  border: "1px solid rgba(255, 255, 255, 0.06)",
                                  borderRadius: "8px",
                                }}
                              >
                                <Column gap="12">
                                  <Flex fillWidth horizontal="space-between" vertical="start">
                                    <Input
                                      value={messageRule.message}
                                      onChange={(e) =>
                                        updateMessageRule(ruleIndex, messageIndex, {
                                          ...messageRule,
                                          message: e.target.value,
                                        })
                                      }
                                      placeholder="Message to match"
                                      size="s"
                                      style={{ flex: 1 }}
                                    />
                                    <Button
                                      onClick={() => removeMessageRule(ruleIndex, messageIndex)}
                                      variant="ghost"
                                      size="s"
                                    >
                                      <Icon name="trash" size="s" />
                                    </Button>
                                  </Flex>
                                  <Flex gap="12" vertical="center" wrap>
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      Trigger after
                                    </Text>
                                    <NumberInput
                                      id={`message-event-count-${ruleIndex}-${messageIndex}`}
                                      label="Event Count"
                                      value={messageRule.maxAlerts}
                                      onChange={(value) =>
                                        updateMessageRule(ruleIndex, messageIndex, {
                                          ...messageRule,
                                          maxAlerts: value || 1,
                                        })
                                      }
                                      min={1}
                                      max={1000}
                                      height="s"
                                      style={{ width: "180px" }}
                                    />
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      events within
                                    </Text>
                                    <NumberInput
                                      id={`message-window-minutes-${ruleIndex}-${messageIndex}`}
                                      label="Window Minutes"
                                      value={messageRule.windowMinutes}
                                      onChange={(value) =>
                                        updateMessageRule(ruleIndex, messageIndex, {
                                          ...messageRule,
                                          windowMinutes: value || 1,
                                        })
                                      }
                                      min={1}
                                      max={1440}
                                      height="s"
                                      style={{ width: "180px" }}
                                    />
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      minutes
                                    </Text>
                                  </Flex>
                                  
                                  {/* Log Type Filter for Message Rule */}
                                  <Column gap="8">
                                    <Text variant="body-default-xs" onBackground="neutral-weak">
                                      Filter by log types (optional)
                                    </Text>
                                    <Flex gap="8" wrap>
                                      {(["text", "error", "warn", "log", "call", "callText"] as LogType[]).map((logType) => {
                                        const isSelected = messageRule.logTypes?.includes(logType) ?? false;
                                        const color = {
                                          error: "#ef4444",
                                          warn: "#f59e0b",
                                          callText: "#3b82f6",
                                          call: "#6366f1",
                                          log: "#10b981",
                                          text: "#6b7280",
                                        }[logType];

                                        return (
                                          <Button
                                            key={logType}
                                            onClick={() => {
                                              const currentTypes = messageRule.logTypes || [];
                                              const newTypes = isSelected
                                                ? currentTypes.filter((t) => t !== logType)
                                                : [...currentTypes, logType];
                                              updateMessageRule(ruleIndex, messageIndex, {
                                                ...messageRule,
                                                logTypes: newTypes.length > 0 ? newTypes : undefined,
                                              });
                                            }}
                                            variant="tertiary"
                                            size="s"
                                            style={{
                                              backgroundColor: isSelected ? `${color}20` : "rgba(255, 255, 255, 0.05)",
                                              border: `1px solid ${isSelected ? color : "rgba(255, 255, 255, 0.1)"}`,
                                              color: isSelected ? color : "var(--neutral-on-background-weak)",
                                              fontWeight: isSelected ? 600 : 400,
                                              textTransform: "uppercase",
                                              fontSize: "11px",
                                              padding: "4px 12px",
                                              transition: "all 0.2s ease",
                                            }}
                                          >
                                            {logType}
                                          </Button>
                                        );
                                      })}
                                    </Flex>
                                  </Column>
                                </Column>
                              </div>
                            ))}
                          </Column>
                        )}
                      </Column>

                      <Button
                        onClick={() => setEditingRuleIndex(null)}
                        variant="secondary"
                        size="s"
                      >
                        Done Editing
                      </Button>
                    </Column>
                  ) : (
                    <Column gap="8">
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {rule.globalLimit?.enabled
                          ? `Triggers after ${rule.globalLimit?.maxAlerts || 10} events within ${rule.globalLimit?.windowMinutes || 60} minutes`
                          : "No global threshold set"}
                      </Text>
                      {rule.globalLimit?.enabled && rule.globalLimit?.logTypes && rule.globalLimit.logTypes.length > 0 && (
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          Log types: {rule.globalLimit.logTypes.join(", ")}
                        </Text>
                      )}
                      {rule.messageRules && rule.messageRules.length > 0 && (
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          {rule.messageRules.length} message-specific rule
                          {rule.messageRules.length > 1 ? "s" : ""}
                        </Text>
                      )}
                    </Column>
                  )}
                </Column>
              </div>
            ))}
          </Column>
        )}
      </Column>

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
