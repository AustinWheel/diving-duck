import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { Project } from "@/types/database";
import { getSubscriptionLimits, isWithinLimit } from "@/lib/subscription";

// GET /api/v1/alerts/config - Fetch alert configuration for a project
export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get project ID from query params or user's default
    const projectId = request.nextUrl.searchParams.get("projectId");
    let targetProjectId = projectId;

    if (!targetProjectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(targetProjectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data() as Project;
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Return alert configuration
    const alertConfig = projectData.alertConfig || {
      enabled: false,
      phoneNumbers: [],
      alertRules: [],
    };

    return NextResponse.json({
      alertConfig,
      projectId: targetProjectId,
      projectName: projectData.displayName,
    });
  } catch (error) {
    console.error("Error fetching alert config:", error);
    return NextResponse.json({ error: "Failed to fetch alert configuration" }, { status: 500 });
  }
}

// PATCH /api/v1/alerts/config - Update alert configuration for a project
export async function PATCH(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const body = await request.json();

    // Get project ID from body or query params
    const projectId = body.projectId || request.nextUrl.searchParams.get("projectId");
    let targetProjectId = projectId;

    if (!targetProjectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(targetProjectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data() as Project;

    // Only owner and admins can modify alert configuration
    if (projectData.ownerId !== userId) {
      // Check if user is an admin
      const memberDoc = await adminDb
        .collection("projects")
        .doc(targetProjectId)
        .collection("members")
        .doc(userId)
        .get();

      if (!memberDoc.exists || memberDoc.data()?.role !== "admin") {
        return NextResponse.json(
          { error: "Only project owners and admins can modify alert configuration" },
          { status: 403 },
        );
      }
    }

    // Validate alert configuration
    const { alertConfig } = body;
    if (!alertConfig) {
      return NextResponse.json({ error: "Alert configuration is required" }, { status: 400 });
    }

    // Validate structure
    if (typeof alertConfig.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Alert config must include 'enabled' boolean field" },
        { status: 400 },
      );
    }

    if (!Array.isArray(alertConfig.phoneNumbers)) {
      return NextResponse.json(
        { error: "Alert config must include 'phoneNumbers' array" },
        { status: 400 },
      );
    }

    if (!Array.isArray(alertConfig.alertRules)) {
      return NextResponse.json(
        { error: "Alert config must include 'alertRules' array" },
        { status: 400 },
      );
    }

    // Check subscription limits
    const limits =
      projectData.subscriptionLimits ||
      getSubscriptionLimits(projectData.subscriptionTier || "basic");

    // Check phone number limit
    if (!isWithinLimit(alertConfig.phoneNumbers.length - 1, limits.phoneNumbers)) {
      const tierName = projectData.subscriptionTier === "pro" ? "Pro" : "Basic";
      const upgradeTo =
        projectData.subscriptionTier === "basic" ? "Pro for 10" : "Enterprise for unlimited";

      return NextResponse.json(
        {
          error: "Phone number limit exceeded",
          message: `Your ${tierName} plan allows ${limits.phoneNumbers} phone numbers. You're trying to save ${alertConfig.phoneNumbers.length}.`,
          suggestion: `Remove ${alertConfig.phoneNumbers.length - limits.phoneNumbers} phone number${alertConfig.phoneNumbers.length - limits.phoneNumbers > 1 ? "s" : ""}, or upgrade to ${upgradeTo} phone numbers.`,
          details: {
            limit: limits.phoneNumbers,
            current: alertConfig.phoneNumbers.length,
            tier: projectData.subscriptionTier || "basic",
          },
        },
        { status: 400 },
      );
    }

    // Check alert rules limit
    if (!isWithinLimit(alertConfig.alertRules.length - 1, limits.alertRules)) {
      const tierName = projectData.subscriptionTier === "pro" ? "Pro" : "Basic";
      const upgradeTo =
        projectData.subscriptionTier === "basic" ? "Pro for 10" : "Enterprise for unlimited";

      return NextResponse.json(
        {
          error: "Alert rules limit exceeded",
          message: `Your ${tierName} plan allows ${limits.alertRules} alert rule${limits.alertRules !== 1 ? "s" : ""}. You're trying to save ${alertConfig.alertRules.length}.`,
          suggestion: `Remove ${alertConfig.alertRules.length - limits.alertRules} rule${alertConfig.alertRules.length - limits.alertRules > 1 ? "s" : ""}, or upgrade to ${upgradeTo} alert rules.`,
          details: {
            limit: limits.alertRules,
            current: alertConfig.alertRules.length,
            tier: projectData.subscriptionTier || "basic",
          },
        },
        { status: 400 },
      );
    }

    // Validate phone numbers
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    for (const phone of alertConfig.phoneNumbers) {
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: `Invalid phone number format: ${phone}. Use E.164 format (e.g., +1234567890)` },
          { status: 400 },
        );
      }
    }

    // Validate alert rules
    for (let i = 0; i < alertConfig.alertRules.length; i++) {
      const rule = alertConfig.alertRules[i];

      // Validate rule structure
      if (!rule.globalLimit || !rule.messageRules || !rule.notificationType) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1} is missing required fields` },
          { status: 400 },
        );
      }

      // Validate global limit
      if (
        typeof rule.globalLimit.enabled !== "boolean" ||
        typeof rule.globalLimit.windowMinutes !== "number" ||
        typeof rule.globalLimit.maxAlerts !== "number"
      ) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1} has invalid globalLimit configuration` },
          { status: 400 },
        );
      }

      if (rule.globalLimit.windowMinutes < 1 || rule.globalLimit.windowMinutes > 1440) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1}: windowMinutes must be between 1 and 1440 (24 hours)` },
          { status: 400 },
        );
      }

      if (rule.globalLimit.maxAlerts < 1 || rule.globalLimit.maxAlerts > 1000) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1}: maxAlerts must be between 1 and 1000` },
          { status: 400 },
        );
      }

      // Validate message rules
      if (!Array.isArray(rule.messageRules)) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1}: messageRules must be an array` },
          { status: 400 },
        );
      }

      for (let j = 0; j < rule.messageRules.length; j++) {
        const messageRule = rule.messageRules[j];

        if (!messageRule.message || typeof messageRule.message !== "string") {
          return NextResponse.json(
            { error: `Alert rule ${i + 1}, message rule ${j + 1}: message is required` },
            { status: 400 },
          );
        }

        if (
          typeof messageRule.windowMinutes !== "number" ||
          messageRule.windowMinutes < 1 ||
          messageRule.windowMinutes > 1440
        ) {
          return NextResponse.json(
            {
              error: `Alert rule ${i + 1}, message rule ${j + 1}: windowMinutes must be between 1 and 1440`,
            },
            { status: 400 },
          );
        }

        if (
          typeof messageRule.maxAlerts !== "number" ||
          messageRule.maxAlerts < 1 ||
          messageRule.maxAlerts > 1000
        ) {
          return NextResponse.json(
            {
              error: `Alert rule ${i + 1}, message rule ${j + 1}: maxAlerts must be between 1 and 1000`,
            },
            { status: 400 },
          );
        }

        // Validate logTypes if provided
        if (messageRule.logTypes) {
          if (!Array.isArray(messageRule.logTypes)) {
            return NextResponse.json(
              { error: `Alert rule ${i + 1}, message rule ${j + 1}: logTypes must be an array` },
              { status: 400 },
            );
          }

          const validLogTypes = ["text", "call", "callText", "log", "warn", "error"];
          for (const logType of messageRule.logTypes) {
            if (!validLogTypes.includes(logType)) {
              return NextResponse.json(
                {
                  error: `Alert rule ${i + 1}, message rule ${j + 1}: invalid logType '${logType}'`,
                },
                { status: 400 },
              );
            }
          }
        }
      }

      // Validate notification type
      if (!["text", "call"].includes(rule.notificationType)) {
        return NextResponse.json(
          { error: `Alert rule ${i + 1}: notificationType must be 'text' or 'call'` },
          { status: 400 },
        );
      }
    }

    // Update the project with new alert configuration
    await adminDb.collection("projects").doc(targetProjectId).update({
      alertConfig,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Alert configuration updated successfully",
      alertConfig,
    });
  } catch (error) {
    console.error("Error updating alert config:", error);
    return NextResponse.json({ error: "Failed to update alert configuration" }, { status: 500 });
  }
}
