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
  Textarea,
} from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { FeatureRequest, FeatureRequestStatus } from "@/types/database";
import { getAuth } from "firebase/auth";
import { Navbar } from "@/components/Navbar";

export default function FeaturesPage() {
  const { user, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FeatureRequestStatus | "all">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFeature, setNewFeature] = useState({ title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/features");
      
      if (!response.ok) {
        throw new Error("Failed to load features");
      }

      const data = await response.json();
      setFeatures(data.features);
    } catch (error) {
      console.error("Error loading features:", error);
      setError("Failed to load feature requests");
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (featureId: string, isUpvoted: boolean) => {
    if (!user) {
      // Show message to sign in
      setError("Please sign in to vote on feature requests");
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`/api/v1/features/${featureId}/upvote`, {
        method: isUpvoted ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update vote");
      }

      // Update local state
      setFeatures(features.map(f => {
        if (f.id === featureId) {
          if (isUpvoted) {
            return {
              ...f,
              upvotedBy: f.upvotedBy.filter(id => id !== user.uid),
              upvoteCount: f.upvoteCount - 1,
            };
          } else {
            return {
              ...f,
              upvotedBy: [...f.upvotedBy, user.uid],
              upvoteCount: f.upvoteCount + 1,
            };
          }
        }
        return f;
      }));
    } catch (error) {
      console.error("Error updating vote:", error);
      setError("Failed to update vote");
    }
  };

  const handleCreateFeature = async () => {
    if (!user) {
      setError("Please sign in to submit feature requests");
      return;
    }

    if (!newFeature.title.trim() || !newFeature.description.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setCreating(true);
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/v1/features", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newFeature),
      });

      if (!response.ok) {
        throw new Error("Failed to create feature request");
      }

      const data = await response.json();
      setFeatures([data.feature, ...features]);
      setNewFeature({ title: "", description: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating feature:", error);
      setError("Failed to create feature request");
    } finally {
      setCreating(false);
    }
  };

  const filteredFeatures = features.filter(
    f => statusFilter === "all" || f.status === statusFilter
  );

  const statusColors = {
    submitted: "#6b7280",
    in_progress: "#3b82f6",
    implemented: "#10b981",
    denied: "#ef4444",
  };

  if (authLoading || loading) {
    return (
      <Flex fillWidth fillHeight center style={{ minHeight: "60vh" }}>
        <Spinner size="l" />
      </Flex>
    );
  }

  return (
    <>
      <Navbar />
      <Column fillWidth padding="32" gap="32" style={{ paddingTop: "144px" }}>
      {/* Header */}
      <Flex fillWidth horizontal="space-between" vertical="center" wrap gap="16">
        <Column gap="8">
          <Heading variant="display-strong-l">Feature Requests</Heading>
          <Text variant="body-default-l" onBackground="neutral-weak">
            Vote on features you'd like to see or submit your own ideas
          </Text>
        </Column>
        {user && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="primary"
            size="m"
          >
            <Flex gap="8" vertical="center">
              <Icon name="plus" size="s" />
              <span>New Request</span>
            </Flex>
          </Button>
        )}
      </Flex>

      {/* Status Filter Tags */}
      <Flex gap="8" wrap vertical="center">
        <Button
          onClick={() => setStatusFilter("all")}
          variant="tertiary"
          size="s"
          style={{
            backgroundColor: statusFilter === "all" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${statusFilter === "all" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
            color: statusFilter === "all" ? "var(--neutral-on-background-strong)" : "var(--neutral-on-background-weak)",
            fontWeight: statusFilter === "all" ? 600 : 400,
            textTransform: "uppercase",
            fontSize: "11px",
            padding: "4px 12px",
            transition: "all 0.2s ease",
          }}
        >
          ALL
        </Button>
        {(["submitted", "in_progress", "implemented", "denied"] as FeatureRequestStatus[]).map((status) => {
          const isActive = statusFilter === status;
          const color = statusColors[status];

          return (
            <Button
              key={status}
              onClick={() => setStatusFilter(status)}
              variant="tertiary"
              size="s"
              style={{
                backgroundColor: isActive ? `${color}20` : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${isActive ? color : "rgba(255, 255, 255, 0.1)"}`,
                color: isActive ? color : "var(--neutral-on-background-weak)",
                fontWeight: isActive ? 600 : 400,
                textTransform: "uppercase",
                fontSize: "11px",
                padding: "4px 12px",
                transition: "all 0.2s ease",
              }}
            >
              {status.replace("_", " ")}
            </Button>
          );
        })}
      </Flex>

      {/* Create Form */}
      {showCreateForm && (
        <div
          style={{
            padding: "24px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
          }}
        >
          <Column gap="16">
            <Text variant="heading-strong-m">Submit a Feature Request</Text>
            <Input
              id="feature.title"
              value={newFeature.title}
              onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
              placeholder="Feature title"
            />
            <Textarea
              id="feature.detail"
              value={newFeature.description}
              onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              placeholder="Describe the feature in detail..."
              rows={4}
              style={{
                minHeight: "100px",
                resize: "vertical",
              }}
            />
            <Flex gap="12">
              <Button
                onClick={handleCreateFeature}
                variant="primary"
                size="m"
                disabled={creating}
              >
                {creating ? <Spinner size="s" /> : "Submit"}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFeature({ title: "", description: "" });
                }}
                variant="secondary"
                size="m"
              >
                Cancel
              </Button>
            </Flex>
          </Column>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
          }}
        >
          {error}
          <Button
            onClick={() => setError(null)}
            variant="tertiary"
            size="s"
            style={{ marginLeft: "12px" }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Feature List */}
      <Column gap="16">
        {filteredFeatures.length === 0 ? (
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
              {statusFilter === "all" 
                ? "No feature requests yet. Be the first to submit one!"
                : `No ${statusFilter.replace("_", " ")} features`}
            </Text>
          </div>
        ) : (
          filteredFeatures.map((feature) => {
            const isUpvoted = user && feature.upvotedBy.includes(user.uid);
            
            return (
              <div
                key={feature.id}
                style={{
                  padding: "24px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                }}
              >
                <Flex gap="16" vertical="start">
                  {/* Upvote Section */}
                  <Column 
                    gap="8" 
                    align="center" 
                    style={{ 
                      minWidth: "80px",
                      padding: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Button
                      onClick={() => handleUpvote(feature.id, !!isUpvoted)}
                      variant="tertiary"
                      size="s"
                      style={{
                        padding: "8px",
                        color: isUpvoted ? "var(--brand-on-background-strong)" : "var(--neutral-on-background-weak)",
                        backgroundColor: isUpvoted ? "rgba(255, 107, 53, 0.1)" : "transparent",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Icon 
                        name="chevronUp" 
                        size="m" 
                        style={{
                          transform: "rotate(0deg)",
                        }}
                      />
                    </Button>
                    <Text 
                      variant="heading-strong-m" 
                      onBackground={isUpvoted ? "brand-medium" : "neutral-strong"}
                      style={{
                        lineHeight: "1",
                      }}
                    >
                      {feature.upvoteCount}
                    </Text>
                  </Column>

                  {/* Content */}
                  <Column gap="8">
                    <Flex gap="12" vertical="center" fillHeight>
                      <Text variant="heading-strong-m">{feature.title}</Text>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor: `${statusColors[feature.status]}20`,
                          color: statusColors[feature.status],
                          fontSize: "11px",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          display: "inline-flex",
                        }}
                      >
                        {feature.status.replace("_", " ")}
                      </span>
                    </Flex>
                    <Text variant="body-default-m" onBackground="neutral-weak">
                      {feature.description}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Submitted by {feature.createdByName || feature.createdByEmail} • {new Date(feature.createdAt).toLocaleDateString()}
                    </Text>
                  </Column>
                </Flex>
              </div>
            );
          })
        )}
      </Column>
    </Column>
    </>
  );
}