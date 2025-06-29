import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { Alert, User, Project } from "@/types/database";

const adminDb = admin.firestore();

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data() as Project;
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Get additional query parameters
    const limit = parseInt(searchParams.get("limit") || "50");
    const startAfter = searchParams.get("cursor");
    const status = searchParams.get("status"); // pending, sent, failed, acknowledged

    // Build query
    let query = adminDb
      .collection("alerts")
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    // Add status filter if provided
    if (status) {
      query = query.where("status", "==", status);
    }

    // Add pagination cursor if provided
    if (startAfter) {
      const cursorDoc = await adminDb.collection("alerts").doc(startAfter).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Execute query
    const snapshot = await query.get();

    // Format alerts
    const alerts: Alert[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      alerts.push({
        id: doc.id,
        projectId: data.projectId,
        status: data.status,
        notificationType: data.notificationType,
        message: data.message,
        eventIds: data.eventIds || [],
        eventCount: data.eventCount,
        windowStart: data.windowStart.toDate(),
        windowEnd: data.windowEnd.toDate(),
        sentAt: data.sentAt?.toDate(),
        sentTo: data.sentTo,
        error: data.error,
        createdAt: data.createdAt.toDate(),
        acknowledgedAt: data.acknowledgedAt?.toDate(),
        acknowledgedBy: data.acknowledgedBy,
        escalatedAt: data.escalatedAt?.toDate(),
      });
    });

    // Get cursor for next page
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc ? lastDoc.id : null;

    return NextResponse.json({
      alerts,
      nextCursor,
      hasMore: snapshot.size === limit,
    });
  } catch (error) {
    console.error("[ALERTS HISTORY API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
