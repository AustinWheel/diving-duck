"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flex, Text, Button, Input, Column, Badge, Spinner } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";

type OnboardingStep = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [projectName, setProjectName] = useState("");
  const [projectNameError, setProjectNameError] = useState("");
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (user) {
      // Check if user is already onboarded
      checkOnboardingStatus();
    }
  }, [user, loading, router]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data()?.isOnboarded) {
      router.push("/dashboard");
    }
  };

  const validateProjectName = async (name: string) => {
    if (!name || name.length < 3) {
      setProjectNameError("Project name must be at least 3 characters");
      return false;
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      setProjectNameError("Project name can only contain letters, numbers, and hyphens");
      return false;
    }

    setIsValidatingName(true);
    setProjectNameError("");

    try {
      // Use the validation API endpoint
      const response = await fetch("/api/v1/projects/validate-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!data.available) {
        setProjectNameError(data.message || "This project name is already taken");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating project name:", error);
      setProjectNameError("Error validating name. Please try again.");
      return false;
    } finally {
      setIsValidatingName(false);
    }
  };

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setProjectName(name);
    setProjectNameError("");
  };

  const handleContinueStep1 = async () => {
    const isValid = await validateProjectName(projectName);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleInviteEmailChange = (index: number, email: string) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = email;
    setInviteEmails(newEmails);

    // Add new input if last one is filled
    if (index === inviteEmails.length - 1 && email) {
      setInviteEmails([...newEmails, ""]);
    }
  };

  const handleSendInvites = async () => {
    setIsCreatingProject(true);

    try {
      // Get Firebase ID token
      const idToken = await user!.getIdToken();

      // Create the project via API
      const projectResponse = await fetch("/api/v1/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: projectName,
          displayName: projectName,
        }),
      });

      if (!projectResponse.ok) {
        const error = await projectResponse.json();
        throw new Error(error.error || "Failed to create project");
      }

      const { project, keys } = await projectResponse.json();
      setProjectId(project.id);

      // Create invites if there are valid emails
      const validEmails = inviteEmails.filter((email) => email && email.includes("@"));

      if (validEmails.length > 0) {
        try {
          const inviteResponse = await fetch("/api/v1/invites/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              projectId: project.id,
              emails: validEmails,
            }),
          });

          if (!inviteResponse.ok) {
            console.error("Failed to send some invite emails");
          }
        } catch (error) {
          console.error("Error sending invite emails:", error);
        }
      }

      setCurrentStep(3);
    } catch (error) {
      console.error("Error creating project:", error);
      setProjectNameError(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSkipInvites = async () => {
    await handleSendInvites(); // Creates project without invites
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;

    try {
      // Set flag to prevent redirect loops
      sessionStorage.setItem("completingOnboarding", "true");
      
      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Mark user as onboarded via API
      const response = await fetch("/api/v1/users/complete-onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Clear the flag and redirect
      sessionStorage.removeItem("completingOnboarding");
      
      // Force a hard navigation to ensure fresh state
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error completing onboarding:", error);
      sessionStorage.removeItem("completingOnboarding");
    }
  };

  const renderStepIndicator = () => (
    <Flex gap="8" horizontal="center" vertical="center" style={{}}>
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor:
              step === currentStep
                ? "var(--brand-background-strong)"
                : step < currentStep
                  ? "var(--brand-background-medium)"
                  : "var(--neutral-background-medium)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </Flex>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Column
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="12">
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Create your project
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Choose a unique name for your project
              </Text>
            </Column>

            <Column gap="16">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Project name
                </Text>
                <Input
                  value={projectName}
                  onChange={handleProjectNameChange}
                  placeholder="my-awesome-project"
                  error={projectNameError}
                  suffix={isValidatingName ? "Checking..." : undefined}
                  style={{ fontSize: "16px" }}
                />
              </div>
              <Text variant="body-default-s" onBackground="neutral-weak">
                This will be your project's unique identifier
              </Text>
            </Column>

            <Button
              onClick={handleContinueStep1}
              disabled={!projectName || isValidatingName || !!projectNameError}
              variant="primary"
              size="l"
              style={{
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
              }}
            >
              Continue
            </Button>
          </Column>
        );

      case 2:
        return (
          <Column
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="12">
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Invite your team
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Add team members who should receive alerts
              </Text>
            </Column>

            <Column gap="12" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {inviteEmails.map((email, index) => (
                <Input
                  id={`inviteEmail-${index}`}
                  key={index}
                  type="email"
                  value={email}
                  onChange={(e) => handleInviteEmailChange(index, e.target.value)}
                  placeholder="teammate@company.com"
                  style={{ fontSize: "16px" }}
                />
              ))}
            </Column>

            <Flex gap="12">
              <Button
                onClick={handleSendInvites}
                disabled={
                  isCreatingProject || !inviteEmails.some((email) => email && email.includes("@"))
                }
                variant="primary"
                size="l"
                fillWidth
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                }}
              >
                {isCreatingProject ? "Creating project..." : "Send Invites"}
              </Button>
              <Button
                onClick={handleSkipInvites}
                disabled={isCreatingProject}
                variant="secondary"
                size="l"
                fillWidth
              >
                Skip for now
              </Button>
            </Flex>
          </Column>
        );

      case 3:
        return (
          <Column
            gap="48"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="16" style={{ textAlign: "center" }}>
              <Text variant="heading-strong-xl" onBackground="neutral-strong">
                You're all set! 🎉
              </Text>
              <Text variant="body-default-l" onBackground="neutral-weak">
                Here's what to do next:
              </Text>
            </Column>

            <Flex gap="24" wrap>
              <Column gap="12" style={{ flex: "1", minWidth: "140px" }}>
                <Badge variant="success" size="s" style={{ alignSelf: "center" }}>
                  1
                </Badge>
                <Column gap="4" align="center" style={{ textAlign: "center" }}>
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    Generate API keys
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Create test and production keys
                  </Text>
                </Column>
              </Column>

              <Column gap="12" style={{ flex: "1", minWidth: "140px" }}>
                <Badge variant="info" size="s" style={{ alignSelf: "center" }}>
                  2
                </Badge>
                <Column gap="4" align="center" style={{ textAlign: "center" }}>
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    Use console.text()
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Install our npm package
                  </Text>
                </Column>
              </Column>

              <Column gap="12" style={{ flex: "1", minWidth: "140px" }}>
                <Badge variant="warning" size="s" style={{ alignSelf: "center" }}>
                  3
                </Badge>
                <Column gap="4" align="center" style={{ textAlign: "center" }}>
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    Get notified
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Configure alert thresholds
                  </Text>
                </Column>
              </Column>
            </Flex>

            <Button
              onClick={handleCompleteOnboarding}
              variant="primary"
              size="l"
              fillWidth
              style={{
                backgroundColor: "var(--brand-background-strong)",
                color: "var(--brand-on-background-strong)",
              }}
            >
              Go to Dashboard
            </Button>
          </Column>
        );
    }
  };

  if (loading) {
    return (
      <Flex
        fillWidth
        fillHeight
        center
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
        }}
      >
        <Spinner size="l" />
      </Flex>
    );
  }

  if (!user) return null;

  return (
    <Flex
      fillWidth
      fillHeight
      direction="column"
      center
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top center, var(--brand-background-weak) 0%, transparent 50%), var(--page-background)",
      }}
    >
      <Column gap="32" align="center" style={{ width: "100%", maxWidth: "480px", padding: "24px" }}>
        {renderStepIndicator()}
        <div
          style={{
            padding: "48px",
            width: "100%",
            backdropFilter: "blur(20px)",
            backgroundColor: "rgba(20, 20, 20, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {renderStep()}
        </div>
      </Column>
    </Flex>
  );
}
