import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { Project, User } from "@/types/database";
import { getSubscriptionLimits } from "@/lib/subscription";
import { calculateBucketRange } from "@/lib/bucketHelpers";

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

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      console.warn("Project not found for user:", userId);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()! as Project;

    // Verify user is a member or owner
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Get team member count (memberIds includes owner)
    const teamMemberCount = projectData.memberIds?.length || 0;

    // Count active API keys
    const allKeysSnapshot = await adminDb
      .collection("keys")
      .where("projectId", "==", projectId)
      .get();

    const keysSnapshot = await adminDb
      .collection("keys")
      .where("projectId", "==", projectId)
      .where("isActive", "==", true)
      .get();

    // Get bucket configuration
    const limits =
      projectData.subscriptionLimits ||
      getSubscriptionLimits(projectData.subscriptionTier || "basic");
    const bucketMinutes = limits.eventBucketMinutes;

    // Calculate time range for last 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    // Get all bucket IDs for the time range
    const bucketIds = calculateBucketRange(projectId, startTime, endTime, bucketMinutes);

    // Query all relevant buckets and sum event counts
    let totalEventCount = 0;
    const bucketPromises = bucketIds.map((bucketId) =>
      adminDb.collection("bucketedEvents").doc(bucketId).get(),
    );

    const bucketDocs = await Promise.all(bucketPromises);
    for (const bucketDoc of bucketDocs) {
      if (bucketDoc.exists) {
        const bucketData = bucketDoc.data();
        totalEventCount += bucketData?.eventCount || 0;
      }
    }

    // Count active alerts
    const alertsSnapshot = await adminDb
      .collection("alerts")
      .where("projectId", "==", projectId)
      .where("status", "==", "pending")
      .get();

    return NextResponse.json({
      stats: {
        events: totalEventCount,
        alerts: alertsSnapshot.size,
        apiKeys: keysSnapshot.size,
        teamMembers: teamMemberCount,
      },
      project: {
        id: projectId,
        name: projectData.name,
        displayName: projectData.displayName,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
