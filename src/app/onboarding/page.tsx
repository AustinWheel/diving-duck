"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flex, Text, Button, Input, Column, Badge, Spinner, CodeBlock, Icon, Switch, NumberInput } from "@once-ui-system/core";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { AlertRule, LogType } from "@/types/database";
import confetti from "canvas-confetti";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  const [testKey, setTestKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(5);
  const [alertWindow, setAlertWindow] = useState(10);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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

  useEffect(() => {
    if (showConfetti) {
      // Fire confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [showConfetti]);

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
      setTestKey(keys.test.key);

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

  const validatePhoneNumber = () => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const formattedNumber = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    
    if (!phoneRegex.test(formattedNumber)) {
      setPhoneError("Invalid phone number format. Use E.164 format (e.g., +1234567890)");
      return false;
    }
    
    setPhoneError("");
    return true;
  };

  const handleSaveAlertConfig = async () => {
    if (!validatePhoneNumber()) return;

    try {
      const idToken = await user!.getIdToken();
      const formattedNumber = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
      
      // Create alert configuration
      const alertConfig = {
        enabled: alertsEnabled,
        phoneNumbers: [formattedNumber],
        alertRules: [{
          globalLimit: {
            enabled: true,
            windowMinutes: alertWindow,
            maxAlerts: alertThreshold,
          },
          messageRules: [],
          notificationType: "text" as const,
        }],
      };

      const response = await fetch(`/api/v1/alerts/config?projectId=${projectId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertConfig }),
      });

      if (!response.ok) {
        throw new Error("Failed to save alert configuration");
      }

      setCurrentStep(6);
    } catch (error) {
      console.error("Error saving alert config:", error);
      setPhoneError("Failed to save configuration. Please try again.");
    }
  };

  const handleSendTestAlert = async () => {
    try {
      setIsSendingTestAlert(true);
      const idToken = await user!.getIdToken();

      const response = await fetch(`/api/v1/alerts/test?projectId=${projectId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to send test alert");
      }

      setTestAlertSent(true);
      setCurrentStep(7);
      setShowConfetti(true);
      
      // Stop confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.error("Error sending test alert:", error);
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleSkipToNext = () => {
    if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(7);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const handleSkipToDashboard = async () => {
    await handleCompleteOnboarding();
  };

  const renderStepIndicator = () => (
    <Flex gap="8" horizontal="center" vertical="center" style={{}}>
      {[1, 2, 3, 4, 5, 6, 7].map((step) => (
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
                  id={`invite-email-${index}`}
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
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="12">
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Project created successfully!
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Let's get your first log sent
              </Text>
            </Column>

            <Flex gap="12">
              <Button
                onClick={() => setCurrentStep(4)}
                variant="primary"
                size="l"
                fillWidth
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                }}
              >
                Continue Setup
              </Button>
              <Button
                onClick={handleSkipToDashboard}
                variant="secondary"
                size="l"
                fillWidth
              >
                Skip to Dashboard
              </Button>
            </Flex>
          </Column>
        );

      case 4:
        return (
          <Column
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="12">
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Let's send your first log
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Follow these steps to integrate console.text() into your application
              </Text>
            </Column>

            <Column gap="16">
              <Column gap="8">
                <Text variant="heading-strong-s">1. Install the package</Text>
                <CodeBlock
                  copyButton={true}
                  codes={[
                    {
                      code: `npm install @console-warden`,
                      language: "bash",
                      label: "Shell",
                    },
                  ]}
                />
              </Column>

              <Column gap="8">
                <Text variant="heading-strong-s">2. Add your API key to environment variables</Text>
                <CodeBlock
                  copyButton={true}
                  codes={[
                    {
                      code: `echo "WARDEN_PUBLIC_KEY=${testKey}" >> .env`,
                      language: "bash",
                      label: "Shell",
                    },
                  ]}
                />
              </Column>

              <Column gap="8">
                <Text variant="heading-strong-s">3. Import and use in your code</Text>
                <CodeBlock
                  copyButton={true}
                  codes={[
                    {
                      code: `// Import at the top of your app
import 'console-warden';

// Use anywhere in your code
console.text('User account not found');
console.error('Payment processing failed');
console.warn('API rate limit approaching');
console.log('Debug info');`,
                      language: "javascript",
                      label: "JavaScript",
                    },
                  ]}
                />
              </Column>
            </Column>

            <Flex gap="12">
              <Button
                onClick={() => setCurrentStep(5)}
                variant="primary"
                size="l"
                fillWidth
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                }}
              >
                Continue
              </Button>
              <Button
                onClick={handleSkipToNext}
                variant="secondary"
                size="l"
              >
                Skip
              </Button>
            </Flex>
          </Column>
        );

      case 5:
        return (
          <Column
            horizontal="center"
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
          >
            <Column gap="12" horizontal="center" fillWidth >
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Set up alerts
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Get notified when important events happen in your application
              </Text>
            </Column>

            <Column gap="24" horizontal="center">
              <Column gap="16" horizontal="center">
                <Flex gap="12" vertical="center">
                  <Icon name="bell" size="m" />
                  <Text variant="heading-strong-s">How alerts work</Text>
                </Flex>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  When your application logs reach a certain threshold (e.g., 5 errors in 10 minutes), 
                  we'll send you an SMS alert so you can respond quickly.
                </Text>
              </Column>

              <Column gap="16">
                <Column gap="8">
                  <Text variant="body-default-m" onBackground="neutral-strong">
                    Phone Number
                  </Text>
                  <Input
                    id="phone-number"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setPhoneError("");
                    }}
                    placeholder="+1234567890"
                    error={phoneError}
                    style={{ fontSize: "16px" }}
                  />
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Use E.164 format (e.g., +1234567890)
                  </Text>
                </Column>

                <Flex gap="12" vertical="center">
                  <Switch
                    isChecked={alertsEnabled}
                    onToggle={() => setAlertsEnabled(!alertsEnabled)}
                  />
                  <Text variant="body-default-m" onBackground="neutral-strong">
                    Enable alerts
                  </Text>
                </Flex>

                {alertsEnabled && (
                  <Column gap="12">
                    <Text variant="body-default-s" onBackground="neutral-strong">
                      Alert threshold
                    </Text>
                    <Flex gap="12" vertical="center" wrap>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        Send alert after
                      </Text>
                      <NumberInput
                        id="alert-threshold"
                        label="Events"
                        value={alertThreshold}
                        onChange={(value) => setAlertThreshold(value || 5)}
                        min={1}
                        max={100}
                        height="s"
                        style={{ width: "100px" }}
                      />
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        events within
                      </Text>
                      <NumberInput
                        id="alert-window"
                        label="Minutes"
                        value={alertWindow}
                        onChange={(value) => setAlertWindow(value || 10)}
                        min={1}
                        max={60}
                        height="s"
                        style={{ width: "100px" }}
                      />
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        minutes
                      </Text>
                    </Flex>
                  </Column>
                )}
              </Column>
            </Column>

            <Flex gap="12">
              <Button
                onClick={handleSaveAlertConfig}
                variant="primary"
                size="l"
                fillWidth
                disabled={!phoneNumber}
                style={{
                  backgroundColor: "var(--brand-background-strong)",
                  color: "var(--brand-on-background-strong)",
                }}
              >
                Continue
              </Button>
              <Button
                onClick={handleSkipToNext}
                variant="secondary"
                size="l"
              >
                Skip
              </Button>
            </Flex>
          </Column>
        );

      case 6:
        return (
          <Column
            gap="32"
            style={{ opacity: 1, transform: "translateX(0)", transition: "all 0.5s ease" }}
            horizontal="center"
          >
            <Column gap="12" style={{ textAlign: "center" }} horizontal="center">
              <Text variant="heading-strong-l" onBackground="neutral-strong">
                Test your alerts
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Let's make sure everything is working by sending a test alert to your phone
              </Text>
            </Column>

            <Column gap="24" align="center" horizontal="center">
              <Icon name="message" size="xl" color="var(--brand-on-background-strong)" />
              
              {!testAlertSent ? (
                <>
                  <Text variant="body-default-m" onBackground="neutral-weak" style={{ textAlign: "center" }}>
                    We'll send a test SMS to {phoneNumber}
                  </Text>
                  <Button
                    onClick={handleSendTestAlert}
                    variant="primary"
                    size="l"
                    disabled={isSendingTestAlert}
                    style={{
                      backgroundColor: "var(--brand-background-strong)",
                      color: "var(--brand-on-background-strong)",
                    }}
                  >
                    {isSendingTestAlert ? <Spinner size="s" /> : "Send Test Alert"}
                  </Button>
                </>
              ) : (
                <Column gap="16" align="center">
                  <Flex gap="8" vertical="center">
                    <Icon name="check" size="m" color="var(--success-on-background-strong)" />
                    <Text variant="body-default-l" onBackground="success-strong">
                      Test alert sent successfully!
                    </Text>
                  </Flex>
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    Check your phone for the SMS
                  </Text>
                </Column>
              )}
            </Column>
          </Column>
        );

      case 7:
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
                Your project is ready and alerts are configured
              </Text>
            </Column>

            <Column gap="24" align="center">
              <Flex gap="32" wrap horizontal="center">
                <Column gap="8" align="center" horizontal="center">
                  <Icon name="check" size="l" color="var(--success-on-background-strong)" />
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    Project created
                  </Text>
                </Column>
                <Column gap="8" align="center" horizontal="center">
                  <Icon name="check" size="l" color="var(--success-on-background-strong)" />
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    SDK configured
                  </Text>
                </Column>
                <Column gap="8" align="center" horizontal="center">
                  <Icon name="check" size="l" color="var(--success-on-background-strong)" />
                  <Text variant="body-strong-m" onBackground="neutral-strong">
                    Alerts enabled
                  </Text>
                </Column>
              </Flex>
            </Column>

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
