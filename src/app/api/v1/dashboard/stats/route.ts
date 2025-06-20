import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { Project, User } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    
    // Get user document to find their default project
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.warn("User not found for userId: ", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data()! as User;
    const projectId = userData.projectIds?.at(0) as string;
    
    if (!projectId) {
      return NextResponse.json({
        stats: {
          events: 0,
          alerts: 0,
          apiKeys: 0,
          teamMembers: 0,
        },
        project: {
          id: projectId,
          name: "",
          displayName: "",
        },
        error: "No default project set"
      });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      console.warn("Project not found for user:", userId);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data()! as Project;
    
    // Verify user is a member or owner
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json(
        { error: "Access denied to this project" },
        { status: 403 }
      );
    }

    // Get team member count (already stored in memberIds array)
    const teamMemberCount = projectData.memberIds?.length || 1;

    // Count active API keys
    const keysSnapshot = await adminDb
      .collection("keys")
      .where("projectId", "==", projectId)
      .where("isActive", "==", true)
      .get();

    // Count events in last 24 hours
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const eventsSnapshot = await adminDb
      .collection("events")
      .where("projectId", "==", projectId)
      .where("timestamp", ">=", twentyFourHoursAgo)
      .get();

    // Count active alerts
    const alertsSnapshot = await adminDb
      .collection("alerts")
      .where("projectId", "==", projectId)
      .where("status", "==", "pending")
      .get();

    return NextResponse.json({
      stats: {
        events: eventsSnapshot.size,
        alerts: alertsSnapshot.size,
        apiKeys: keysSnapshot.size,
        teamMembers: teamMemberCount,
      },
      project: {
        id: projectId,
        name: projectData.name,
        displayName: projectData.displayName,
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}