import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { User, Project } from "@/types/database";
import { canSendAlert, incrementTestAlerts } from "@/lib/subscription";

const adminDb = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    // Verify the ID token
    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get user document
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data() as Project;

    // Only owner and admins can send test alerts
    if (projectData.ownerId !== userId) {
      const memberDoc = await adminDb
        .collection("projects")
        .doc(projectId)
        .collection("members")
        .doc(userId)
        .get();

      if (!memberDoc.exists || memberDoc.data()?.role !== "admin") {
        return NextResponse.json(
          { error: "Only project owners and admins can send test alerts" },
          { status: 403 },
        );
      }
    }

    // Check if alerts are configured
    if (!projectData.alertConfig?.enabled) {
      return NextResponse.json(
        { error: "Alerts are not enabled for this project" },
        { status: 400 },
      );
    }

    if (!projectData.alertConfig?.phoneNumbers?.length) {
      return NextResponse.json(
        { error: "No phone numbers configured for alerts" },
        { status: 400 },
      );
    }

    // Check alert limits for test alerts
    const alertCheck = await canSendAlert(projectId, true);
    if (!alertCheck.allowed) {
      const isTestLimitReached = alertCheck.reason?.includes("test alert");
      const tierName = projectData.subscriptionTier === "pro" ? "Pro" : "Basic";

      let message, suggestion;
      if (isTestLimitReached) {
        message = `You've used all ${alertCheck.limit} test alerts on your ${tierName} plan.`;
        suggestion =
          "Upgrade to Pro for unlimited test alerts, or use your alerts for real monitoring.";
      } else {
        const resetTime = new Date();
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
        resetTime.setUTCHours(0, 0, 0, 0);
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));

        message = `You've reached your daily limit of ${alertCheck.limit} alert${alertCheck.limit !== 1 ? "s" : ""}. You've sent ${alertCheck.current} today.`;
        suggestion = `Upgrade to Pro for 100 daily alerts, or wait ${hoursUntilReset} hour${hoursUntilReset !== 1 ? "s" : ""} for the reset.`;
      }

      return NextResponse.json(
        {
          error: isTestLimitReached ? "Test alert limit reached" : "Daily alert limit reached",
          message,
          suggestion,
          details: {
            limit: alertCheck.limit,
            current: alertCheck.current,
            tier: projectData.subscriptionTier || "basic",
            type: isTestLimitReached ? "test_alerts" : "daily_alerts",
          },
        },
        { status: 429 },
      );
    }

    // Send test SMS
    const textbeltKey = process.env.TEXTBELT_API_KEY;
    if (!textbeltKey) {
      return NextResponse.json({ error: "SMS service not configured" }, { status: 500 });
    }

    const testMessage = `Test alert from ${projectData.displayName}. Your alerts are working correctly!`;
    const results: any[] = [];

    for (const phoneNumber of projectData.alertConfig.phoneNumbers) {
      try {
        const response = await fetch("https://textbelt.com/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            phone: phoneNumber,
            message: testMessage,
            key: textbeltKey,
          }),
        });

        const result = await response.json();
        results.push({
          phoneNumber,
          success: result.success,
          error: result.error,
          quotaRemaining: result.quotaRemaining,
        });
      } catch (error) {
        results.push({
          phoneNumber,
          success: false,
          error: error instanceof Error ? error.message : "Network error",
        });
      }
    }

    // Create a test alert record
    await adminDb.collection("alerts").add({
      projectId: projectId,
      status: results.some((r) => r.success) ? "sent" : "failed",
      notificationType: "text",
      message: "Test Alert",
      eventIds: [],
      eventCount: 0,
      windowStart: admin.firestore.Timestamp.now(),
      windowEnd: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      sentAt: admin.firestore.Timestamp.now(),
      sentTo: results.filter((r) => r.success).map((r) => r.phoneNumber),
      error: results.some((r) => !r.success)
        ? `Failed: ${results
            .filter((r) => !r.success)
            .map((r) => `${r.phoneNumber}: ${r.error}`)
            .join(", ")}`
        : null,
    });

    // Increment test alert counter if any SMS was sent successfully
    if (results.some((r) => r.success)) {
      await incrementTestAlerts(projectId);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[TEST ALERT API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
